/**
 * Devolve uma conta ao estado de quem acabou de chegar.
 *
 * Serve para testar o onboarding de novo sem criar outro e-mail. A conta e a
 * senha continuam valendo — o que sai é o que faz o app considerar a pessoa
 * "já instalada": o vínculo com a paróquia, a marca de onboarding concluído
 * e o que ela declarou dentro daquela paróquia.
 *
 * São os DOIS portões de `src/app/(fiel)/layout.tsx`: sem vínculo o app
 * manda para /escolher-paroquia; sem `onboardedAt` manda para /bem-vindo.
 * Derrubar só um dos dois testa metade do fluxo.
 *
 * Recusa contas com histórico de verdade (atendimento marcado, pedido de
 * oração, gente da família cadastrada): apagar o vínculo delas deixaria
 * esses registros órfãos numa paróquia que a pessoa não pertence mais.
 *
 * PRECISA DO CONTEXTO DE PLATAFORMA. `parish_memberships` tem RLS com
 * FORCE, e a conexão do app é `app_user` — um cliente Prisma cru enxerga
 * ZERO vínculos e apaga ZERO, sem erro nenhum. Era o defeito da versão
 * anterior deste script: ele dizia "0 vínculos (serão apagados)", zerava
 * só o `onboardedAt` e anunciava sucesso, enquanto a paróquia continuava
 * colada na conta. Daí ser um script TypeScript: para reusar o mesmo
 * `withPlatformContext` do app em vez de repetir o SET LOCAL aqui.
 *
 * Uso:
 *   npm run onboarding:resetar                     lista as contas
 *   npm run onboarding:resetar -- <busca>          ensaio
 *   npm run onboarding:resetar -- <busca> --confirmar
 *
 * A busca é um pedaço do nome ou do e-mail, sem acento e sem caixa. Só age
 * quando sobra UMA conta — com várias, ela lista e para.
 */
import { withPlatformContext } from "../src/server/db/tenant-context";

/**
 * O host ANTES da primeira consulta — sem a senha.
 *
 * Este script APAGA vínculo de paróquia, e a diferença entre o banco de
 * desenvolvimento e o de produção é uma variável de ambiente. Descobrir
 * onde se estava depois do estrago é tarde; e quando a consulta falha, a
 * linha que responderia "onde eu estou" nunca chega a sair.
 */
function ondeEstou(): string {
  const url = process.env.DATABASE_URL ?? "";
  return url.match(/@([^/:?]+)/)?.[1] ?? "(DATABASE_URL não definida — o Prisma vai ler o .env)";
}

/** Sem acento, sem caixa: "José" acha "jose". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type Conta = { id: string; fullName: string; email: string; onboardedAt: Date | null };

async function principal(): Promise<number> {
  console.log(`banco: ${ondeEstou()}\n`);

  const argumentos = process.argv.slice(2);
  const confirmado = argumentos.includes("--confirmar");
  const busca = argumentos.find((a) => !a.startsWith("--")) ?? null;

  return withPlatformContext(async (tx) => {
    const contas: Conta[] = await tx.user.findMany({
      select: { id: true, fullName: true, email: true, onboardedAt: true },
      orderBy: { fullName: "asc" },
    });

    /*
     * As contagens saem em UMA consulta por tabela, e não uma por conta.
     *
     * A lista mostra o estado de todo mundo antes de escolher; com uma
     * consulta por pessoa, listar cinquenta contas de teste viraria
     * trezentas idas ao banco só para desenhar a tela.
     */
    async function contarPor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delegate: any,
      campo: string,
    ): Promise<Map<string, number>> {
      const linhas = await delegate.groupBy({ by: [campo], _count: { _all: true } });
      return new Map(
        linhas.map((l: Record<string, unknown> & { _count: { _all: number } }) => [
          l[campo] as string,
          l._count._all,
        ]),
      );
    }

    const [vinculos, voluntarios, atendimentos, oracoes, familias, guardioes] = await Promise.all([
      contarPor(tx.parishMembership, "userId"),
      contarPor(tx.volunteerProfile, "userId"),
      contarPor(tx.appointment, "fielUserId"),
      contarPor(tx.prayerRequest, "requesterUserId"),
      contarPor(tx.familyMember, "responsibleUserId"),
      contarPor(tx.familyMemberGuardian, "userId"),
    ]);

    /** O que impede o reset desta conta, em palavras. */
    function impedimentosDe(id: string): string[] {
      const partes: string[] = [];
      const a = atendimentos.get(id) ?? 0;
      const o = oracoes.get(id) ?? 0;
      const f = familias.get(id) ?? 0;
      const g = guardioes.get(id) ?? 0;
      if (a) partes.push(`${a} atendimento(s)`);
      if (o) partes.push(`${o} pedido(s) de oração`);
      if (f) partes.push(`${f} pessoa(s) da família`);
      if (g) partes.push(`${g} vínculo(s) de guardião`);
      return partes;
    }

    function descrever(u: Conta): string {
      const bloqueios = impedimentosDe(u.id);
      const estado = [
        (vinculos.get(u.id) ?? 0) > 0 ? "com paróquia" : "sem paróquia",
        u.onboardedAt ? "boas-vindas vistas" : "boas-vindas pendentes",
        bloqueios.length > 0 ? `BLOQUEADO: ${bloqueios.join(", ")}` : "pode reiniciar",
      ];
      return `  ${u.fullName} <${u.email}>\n      ${estado.join(" · ")}`;
    }

    /*
     * Sem busca: mostra todo mundo e para.
     *
     * Escolher pelo e-mail inteiro obrigava a saber o e-mail de cor, e os
     * das contas de teste são impronunciáveis. A lista traz junto o que
     * impede cada uma — assim ninguém escolhe uma conta para ouvir
     * "RECUSADO" depois.
     */
    if (!busca) {
      console.log(`${contas.length} conta(s):\n`);
      for (const u of contas) console.log(descrever(u));
      console.log(
        "\nRode de novo com um pedaço do nome ou do e-mail para escolher uma.\n" +
          "  npm run onboarding:resetar -- maria",
      );
      return 0;
    }

    const alvo = normalizar(busca);
    const achadas = contas.filter(
      (u) => normalizar(u.fullName).includes(alvo) || normalizar(u.email).includes(alvo),
    );

    if (achadas.length === 0) {
      console.error(`Nenhuma conta com "${busca}" no nome ou no e-mail.`);
      console.error("Rode sem argumento nenhum para ver a lista.");
      return 1;
    }

    /*
     * Várias: lista e PARA.
     *
     * Escolher a primeira seria adivinhar em nome de quem apaga vínculo. Um
     * e-mail inteiro sempre desempata, porque é único.
     */
    if (achadas.length > 1) {
      console.error(`"${busca}" acha ${achadas.length} contas:\n`);
      for (const u of achadas) console.error(descrever(u));
      console.error("\nSeja mais específico — o e-mail inteiro sempre resolve.");
      return 1;
    }

    const u = achadas[0]!;
    console.log(`${u.fullName} <${u.email}>`);
    console.log(`  vínculos de paróquia ...: ${vinculos.get(u.id) ?? 0}  (serão apagados)`);
    console.log(`  perfis de voluntário ...: ${voluntarios.get(u.id) ?? 0}  (serão apagados)`);
    console.log(
      `  onboardedAt ............: ${u.onboardedAt?.toISOString().slice(0, 16) ?? "null"} → null`,
    );

    const impedimentos = impedimentosDe(u.id);
    if (impedimentos.length > 0) {
      console.error(`\nRECUSADO: esta conta tem histórico — ${impedimentos.join(", ")}.`);
      console.error("Apagar o vínculo deixaria esses registros órfãos. Apague-os antes, à mão.");
      return 2;
    }

    if (!confirmado) {
      console.log("\nEnsaio. Rode de novo com --confirmar para aplicar.");
      return 0;
    }

    await tx.volunteerProfile.deleteMany({ where: { userId: u.id } });
    await tx.parishMembership.deleteMany({ where: { userId: u.id } });
    await tx.user.update({ where: { id: u.id }, data: { onboardedAt: null } });

    // Conferência DEPOIS de apagar: é o que teria denunciado o defeito
    // antigo, em que o deleteMany não alcançava nada por causa da RLS.
    const sobraram = await tx.parishMembership.count({ where: { userId: u.id } });
    if (sobraram > 0) {
      console.error(`\nFALHOU: ainda restam ${sobraram} vínculo(s). Nada foi confirmado.`);
      throw new Error("vínculos não foram apagados");
    }

    console.log("\nFeito. No próximo acesso a conta entra pelo início do onboarding.");
    return 0;
  });
}

principal()
  .then((codigo) => process.exit(codigo))
  .catch((erro) => {
    console.error("ERRO:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
