import { withPlatformContext, withTenantContext } from "@/server/db/tenant-context";
import { notifyUser, registrarEnvio } from "@/server/modules/notifications/service";
import { brasiliaParts } from "@/lib/brasilia";
import { dicasDoPublico, type Dica, type PublicoDaDica } from "./dicas";

/**
 * Dois dias por semana, e não todos.
 *
 * O pároco desta paróquia publica o Evangelho TODO DIA — medido em
 * produção: nove avisos em nove dias. Uma dica diária dobraria o volume e
 * metade dele seria propaganda do próprio app, que é como se ensina alguém
 * a desligar as notificações. Duas por semana deixa a dica sendo 2 de cada
 * 10 avisos, e a trilha inteira ainda cabe em pouco mais de um mês.
 *
 * Terça e sexta: longe do sábado do resumo semanal, e longe do domingo.
 */
const DIAS_DA_TRILHA = [2, 5];

/**
 * Teto de vida da trilha.
 *
 * Passado isso ela cala para sempre, mesmo que sobrem dicas pendentes.
 * Quem recebeu doze convites e não usou nenhum não está esperando o
 * décimo terceiro — está dizendo que não quer. Insistir só ensina a
 * ignorar o sino.
 */
const TETO_DE_DICAS = 12;

export function ehDiaDaTrilha(agora: Date): boolean {
  return DIAS_DA_TRILHA.includes(brasiliaParts(agora).weekday);
}

/** A chave do carimbo: uma dica por pessoa, para sempre. */
function chaveDaDica(userId: string, dicaId: string): string {
  return `trilha:${userId}:${dicaId}`;
}

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];

/**
 * Que recortes de papel esta pessoa tem.
 *
 * Sai do papel na filiação e da disponibilidade declarada — as duas coisas
 * estruturadas que o app conhece. Pastoral fica de fora de propósito: ver
 * o comentário de `dicas.ts`.
 */
async function publicosDe(tx: Tx, parishId: string, userId: string): Promise<PublicoDaDica[]> {
  const [filiacao, serveNaLiturgia] = await Promise.all([
    tx.parishMembership.findFirst({
      where: { parishId, userId, status: "active" },
      select: { role: { select: { code: true } } },
    }),
    tx.liturgicalAvailability.count({ where: { parishId, userId } }),
  ]);

  const publicos: PublicoDaDica[] = [];
  const papel = filiacao?.role.code;
  if (papel === "CATEQUISTA" || papel === "COORDENADOR_CATEQUESE") publicos.push("catequista");
  if (papel === "COORDENADOR_LITURGIA" || serveNaLiturgia > 0) publicos.push("ministro");
  if (papel === "ADMINISTRADOR_PAROQUIAL" || papel === "SECRETARIA" || papel === "PAROCO") {
    publicos.push("administra");
  }
  return publicos;
}

/**
 * A próxima dica desta pessoa, ou nada.
 *
 * Sorteia entre as PENDENTES em vez de seguir uma ordem fixa: uma sequência
 * previsível vira funil de vendas, e a pessoa aprende a ignorar o segundo
 * passo depois de ignorar o primeiro.
 *
 * Devolve `null` — e mandar nada é um resultado legítimo — quando a pessoa
 * já usou tudo, já recebeu tudo, ou bateu no teto. O silêncio é o prêmio de
 * quem aprendeu o app.
 */
export async function proximaDica(
  tx: Tx,
  parishId: string,
  userId: string,
  sortear: (n: number) => number = (n) => Math.floor(Math.random() * n),
): Promise<Dica | null> {
  const enviadas = await tx.notificationDispatch.findMany({
    where: { parishId, chave: { startsWith: `trilha:${userId}:` } },
    select: { chave: true },
  });
  if (enviadas.length >= TETO_DE_DICAS) return null;

  const jaEnviada = new Set(enviadas.map((e) => e.chave));
  const candidatas = dicasDoPublico(await publicosDe(tx, parishId, userId)).filter(
    (d) => !jaEnviada.has(chaveDaDica(userId, d.id)),
  );
  if (candidatas.length === 0) return null;

  /*
   * A pergunta "já usou?" é feita só nas que sobraram, e uma a uma.
   *
   * São poucas por pessoa e a resposta muda a cada semana — guardar isso
   * numa coluna significaria mantê-la sincronizada com dez tabelas
   * diferentes, e a primeira que saísse de sincronia mandaria a pessoa
   * fazer de novo o que ela já fez.
   */
  const pendentes: Dica[] = [];
  for (const dica of candidatas) {
    if (!(await dica.jaUsou(tx, { parishId, userId }))) pendentes.push(dica);
  }
  if (pendentes.length === 0) return null;

  return pendentes[sortear(pendentes.length)] ?? null;
}

export type ResultadoDaTrilha = { paroquias: number; pessoas: number; calados: number };

/**
 * Manda a dica da vez para quem ainda tem o que descobrir.
 *
 * Roda dentro do robô diário, e só nos dias da trilha. Cada envio é
 * carimbado na MESMA transação que cria o aviso: ou os dois acontecem, ou
 * nenhum — é o que impede a repetição do cron de mandar tudo de novo.
 *
 * `notifyUser` respeita a preferência da pessoa: quem desligou "descoberta"
 * não recebe, e não precisa saber que existe um motor decidindo por ela.
 */
export async function enviarDicasDaTrilha(): Promise<ResultadoDaTrilha> {
  const parishIds = await withPlatformContext(async (tx) => {
    const rows = await tx.parish.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  });

  let paroquias = 0;
  let pessoas = 0;
  let calados = 0;

  for (const parishId of parishIds) {
    const enviados = await withTenantContext(parishId, async (tx) => {
      const membros = await tx.parishMembership.findMany({
        where: { parishId, status: "active" },
        select: { userId: true },
      });

      let quantos = 0;
      for (const { userId } of membros) {
        const dica = await proximaDica(tx, parishId, userId);
        if (!dica) {
          calados += 1;
          continue;
        }

        /*
         * A chave NÃO tem data, ao contrário da do resumo semanal.
         *
         * Lá a pergunta é "já mandei o resumo de HOJE?"; aqui é "esta pessoa
         * já viu esta dica ALGUMA VEZ?" — e a resposta vale para sempre. Pôr
         * data faria a mesma dica voltar na semana seguinte, que é
         * exatamente o que a trilha existe para não fazer.
         *
         * Reabrir a trilha de alguém, se um dia for preciso, é apagar a
         * linha do carimbo.
         */
        const inedito = await registrarEnvio(tx, parishId, chaveDaDica(userId, dica.id));
        if (!inedito) continue;

        await notifyUser(tx, {
          parishId,
          userId,
          category: "descoberta",
          title: dica.titulo,
          body: dica.corpo,
          linkPath: dica.linkPath,
        });
        quantos += 1;
      }
      return quantos;
    });

    if (enviados > 0) paroquias += 1;
    pessoas += enviados;
  }

  return { paroquias, pessoas, calados };
}
