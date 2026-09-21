import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import {
  createGroup,
  expressGroupInterest,
  getMyMainPastoral,
  listAllGroups,
  listInterestsForParish,
} from "@/server/modules/pastorais/service";
import {
  acolherInteressado,
  adicionarMembroPorNome,
  editarEncontro,
  gruposQueCoordeno,
  importarCronograma,
  listarInteressados,
  listarMembros,
  meusGrupos,
  mudarPapel,
  obterGrupo,
  papelNoGrupo,
  podeGerirGrupo,
  proximosEncontrosDosMeusGrupos,
  removerMembro,
} from "@/server/modules/grupos/service";
import { collectCommitments } from "@/server/modules/reminders/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O grupo de adolescentes que saiu da catequese: quem faz parte, o
 * cronograma de formação e o que cada um alcança.
 */
const CRONOGRAMA = `06/09/26 — Quem sou eu de verdade?
20/09/26 — Meu jeito de ser: qualidades, limites e temperamento
11/10/26 — Se Joga CDM (Seminário)
Data a definir — Confraternização CDM
06 e 07/03/27 — Encontro da Essência (Seminário)`;

describe("grupos com membros e cronograma", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let outraParishId: string;
  let parocoId: string;
  let coordenadorId: string;
  let adolescenteId: string;
  let interessadoId: string;
  let deOutroGrupoId: string;
  let cdmId: string;
  let outroGrupoId: string;

  const conta = async (nome: string, apelido: string) => {
    const u = await registerUser({
      fullName: nome,
      email: `${apelido}-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(u.id);
    return u.id;
  };

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Grupos ${stamp}` }),
      registerParish({ name: `Par Grupos Vizinha ${stamp}` }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    parocoId = await conta("Pe. dos Grupos", "paroco-g");
    coordenadorId = await conta("Vinicius Coordenador da Silva", "coord-g");
    adolescenteId = await conta("Ana Clara Ribeiro", "ado-g");
    interessadoId = await conta("Pedro Henrique Souza", "int-g");
    deOutroGrupoId = await conta("Marcos Outro Grupo", "outro-g");

    for (const userId of [parocoId, coordenadorId, adolescenteId, interessadoId, deOutroGrupoId]) {
      const convite = await createInvitation({ parishId, createdBy: parocoId, type: "link", role: "FIEL" });
      await acceptInvitation({ code: convite.code, userId });
    }

    const cdm = await createGroup(parishId, parocoId, {
      name: "Colo de Mãe (CDM)",
      description: "Adolescentes que saíram da catequese.",
      meetsWhen: "Domingos, às 17h",
      meetsWhere: "Centro Pastoral",
    });
    cdmId = cdm.id;
    const outro = await createGroup(parishId, parocoId, { name: "Pastoral do Dízimo" });
    outroGrupoId = outro.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("a coordenação entra pelo nome completo, e quem participa é avisado", async () => {
    const resultado = await adicionarMembroPorNome(
      parishId,
      cdmId,
      "  vinicius coordenador da silva ",
      "coordenador",
      parocoId,
    );
    expect(resultado.fullName).toBe("Vinicius Coordenador da Silva");
    expect(resultado.jaEra).toBe(false);
    expect(await papelNoGrupo(parishId, cdmId, coordenadorId)).toBe("coordenador");

    await adicionarMembroPorNome(parishId, cdmId, "Ana Clara Ribeiro", "membro", coordenadorId);
    const aviso = await withTenantContext(parishId, (tx) =>
      tx.notification.findFirst({ where: { parishId, userId: adolescenteId }, orderBy: { createdAt: "desc" } }),
    );
    expect(aviso?.title).toBe("Você agora faz parte de Colo de Mãe (CDM)");
    expect(aviso?.linkPath).toBe(`/comunidade/pastorais/${cdmId}`);
    expect(aviso?.category).toBe("pastoral");
  });

  it("nome incompleto ou desconhecido não vira palpite", async () => {
    await expect(adicionarMembroPorNome(parishId, cdmId, "Ana", "membro", parocoId)).rejects.toThrow(
      /nome completo/i,
    );
    await expect(
      adicionarMembroPorNome(parishId, cdmId, "Fulano de Tal Inexistente", "membro", parocoId),
    ).rejects.toThrow(/nome completo/i);
  });

  it("pôr duas vezes não duplica, e muda o papel de quem já está", async () => {
    const de_novo = await adicionarMembroPorNome(parishId, cdmId, "Ana Clara Ribeiro", "membro", parocoId);
    expect(de_novo.jaEra).toBe(true);
    const membros = await listarMembros(parishId, cdmId);
    expect(membros.filter((m) => m.userId === adolescenteId)).toHaveLength(1);
    // Coordenação primeiro, depois em ordem de nome.
    expect(membros.map((m) => m.papel)).toEqual(["coordenador", "membro"]);
  });

  it("quem manifestou interesse aparece para a coordenação e é acolhido", async () => {
    await expressGroupInterest(parishId, cdmId, interessadoId);

    const antes = await listarInteressados(parishId, cdmId);
    expect(antes.map((i) => i.fullName)).toEqual(["Pedro Henrique Souza"]);

    await acolherInteressado(parishId, cdmId, interessadoId, coordenadorId);

    expect(await listarInteressados(parishId, cdmId)).toEqual([]);
    expect(await papelNoGrupo(parishId, cdmId, interessadoId)).toBe("membro");
    const interesse = await withTenantContext(parishId, (tx) =>
      tx.pastoralGroupInterest.findUnique({ where: { groupId_userId: { groupId: cdmId, userId: interessadoId } } }),
    );
    expect(interesse?.status).toBe("acolhido");
  });

  it("quem foi acolhido deixa de ser 'interessado' também no painel da paróquia", async () => {
    // Antes, a mesma pessoa aparecia como interessada E como participante na
    // linha da pastoral — visto em produção assim que o primeiro grupo ganhou
    // membros.
    const doPainel = await listInterestsForParish(parishId);
    expect(doPainel.some((i) => i.userId === interessadoId)).toBe(false);

    const cdm = (await listAllGroups(parishId)).find((g) => g.id === cdmId)!;
    expect(cdm._count.interests).toBe(0);
    // Coordenação, a adolescente adicionada pelo nome e quem foi acolhido agora.
    expect(cdm._count.membros).toBe(3);
  });

  it("acolher quem não pediu nada é recusado", async () => {
    await expect(acolherInteressado(parishId, cdmId, deOutroGrupoId, coordenadorId)).rejects.toThrow(
      /não pediu para entrar/i,
    );
  });

  it("só a coordenação do grupo mexe no grupo — e só no dela", async () => {
    // O pároco não coordena o CDM, mas gere as pastorais da paróquia.
    expect(await podeGerirGrupo(parishId, cdmId, parocoId, true)).toBe(true);
    expect(await podeGerirGrupo(parishId, cdmId, coordenadorId, false)).toBe(true);
    // Quem só participa, não.
    expect(await podeGerirGrupo(parishId, cdmId, adolescenteId, false)).toBe(false);
    // Coordenar um grupo não alcança o grupo do lado.
    expect(await podeGerirGrupo(parishId, outroGrupoId, coordenadorId, false)).toBe(false);
    expect(await gruposQueCoordeno(parishId, coordenadorId)).toEqual([
      expect.objectContaining({ id: cdmId, name: "Colo de Mãe (CDM)" }),
    ]);
    expect(await gruposQueCoordeno(parishId, adolescenteId)).toEqual([]);
  });

  it("o grupo não fica sem coordenação por engano", async () => {
    await expect(
      mudarPapel(parishId, cdmId, (await membroDe(coordenadorId)).id, "membro"),
    ).rejects.toThrow(/sem coordenação/i);
    await expect(removerMembro(parishId, cdmId, (await membroDe(coordenadorId)).id)).rejects.toThrow(
      /sem coordenação/i,
    );
    // Com outra pessoa na coordenação, sair passa a ser possível.
    await mudarPapel(parishId, cdmId, (await membroDe(adolescenteId)).id, "coordenador");
    await mudarPapel(parishId, cdmId, (await membroDe(coordenadorId)).id, "membro");
    expect(await papelNoGrupo(parishId, cdmId, coordenadorId)).toBe("membro");
    // Devolve o posto para os testes seguintes.
    await mudarPapel(parishId, cdmId, (await membroDe(coordenadorId)).id, "coordenador");
    await mudarPapel(parishId, cdmId, (await membroDe(adolescenteId)).id, "membro");
  });

  const membroDe = async (userId: string) => {
    const membros = await listarMembros(parishId, cdmId);
    return membros.find((m) => m.userId === userId)!;
  };

  it("cola o cronograma de uma vez, e colar de novo não repete", async () => {
    const primeira = await importarCronograma(parishId, cdmId, coordenadorId, CRONOGRAMA);
    expect(primeira).toEqual({ adicionados: 5, repetidos: 0 });

    const segunda = await importarCronograma(parishId, cdmId, coordenadorId, CRONOGRAMA);
    expect(segunda).toEqual({ adicionados: 0, repetidos: 5 });

    const grupo = await obterGrupo(parishId, cdmId);
    expect(grupo!.encontros.map((e) => e.tema)).toEqual([
      "Quem sou eu de verdade?",
      "Meu jeito de ser: qualidades, limites e temperamento",
      "Se Joga CDM",
      "Confraternização CDM",
      "Encontro da Essência",
    ]);
    const seminario = grupo!.encontros.find((e) => e.tema === "Se Joga CDM")!;
    expect(seminario).toMatchObject({ data: "2026-10-11", destaque: true, complemento: "Seminário", icone: "fogo" });
    expect(grupo!.encontros.find((e) => e.tema === "Confraternização CDM")).toMatchObject({
      data: null,
      // Fica no mês do encontro anterior da lista — o seminário de outubro.
      mesPrevisto: "2026-10",
    });
  });

  it("uma linha ilegível não grava nada", async () => {
    const antes = (await obterGrupo(parishId, cdmId))!.encontros.length;
    await expect(
      importarCronograma(parishId, cdmId, coordenadorId, "13/12/26 — Encontro bom\n31/02/27 — Dia que não existe"),
    ).rejects.toThrow(/não deu para ler/i);
    expect((await obterGrupo(parishId, cdmId))!.encontros).toHaveLength(antes);
  });

  it("quem prega entra na edição do encontro", async () => {
    const grupo = await obterGrupo(parishId, cdmId);
    const domingo = grupo!.encontros.find((e) => e.data === "2026-09-20")!;
    await editarEncontro(parishId, cdmId, domingo.id, {
      data: domingo.data,
      tema: domingo.tema,
      pregador: "Ir. Marta",
    });

    const depois = await obterGrupo(parishId, cdmId);
    expect(depois!.encontros.find((e) => e.id === domingo.id)!.pregador).toBe("Ir. Marta");
  });

  it("o próximo encontro aparece para quem faz parte, e não para os outros", async () => {
    const doAdolescente = await proximosEncontrosDosMeusGrupos(parishId, adolescenteId, "2026-09-18");
    expect(doAdolescente).toHaveLength(1);
    expect(doAdolescente[0]!.grupo.name).toBe("Colo de Mãe (CDM)");
    expect(doAdolescente[0]!.encontro).toMatchObject({ data: "2026-09-20", pregador: "Ir. Marta" });

    expect(await proximosEncontrosDosMeusGrupos(parishId, deOutroGrupoId, "2026-09-18")).toEqual([]);
    // Passado o cronograma inteiro, não sobra "próximo".
    expect(await proximosEncontrosDosMeusGrupos(parishId, adolescenteId, "2030-01-01")).toEqual([]);
  });

  it("o grupo vira 'minha pastoral' em Servir, na frente do interesse antigo", async () => {
    await expressGroupInterest(parishId, outroGrupoId, adolescenteId);
    const minha = await getMyMainPastoral(parishId, adolescenteId);
    expect(minha?.id).toBe(cdmId);
  });

  it("o robô avisa quem é do grupo na véspera do encontro", async () => {
    // O robô roda de manhã; a véspera do encontro de 20/09 é o dia 19.
    const compromissos = await collectCommitments(new Date("2026-09-19T11:00:00Z"));
    const doCdm = compromissos.filter((c) => c.tag.startsWith("encontro-") && c.parishId === parishId);

    const avisados = new Set(doCdm.map((c) => c.userId));
    expect(avisados).toEqual(new Set([coordenadorId, adolescenteId, interessadoId]));
    expect(doCdm[0]).toMatchObject({
      when: "amanha",
      title: "Amanhã tem Colo de Mãe (CDM)",
      category: "pastoral",
      url: `/comunidade/pastorais/${cdmId}`,
    });
    expect(doCdm[0]!.body).toContain("Prega: Ir. Marta");
  });

  it("nada disso atravessa para outra paróquia", async () => {
    const membros = await withTenantContext(outraParishId, (tx) =>
      tx.membroDoGrupo.findMany({ where: { groupId: cdmId } }),
    );
    const encontros = await withTenantContext(outraParishId, (tx) =>
      tx.encontroDoGrupo.findMany({ where: { groupId: cdmId } }),
    );
    expect(membros).toEqual([]);
    expect(encontros).toEqual([]);
    expect(await obterGrupo(outraParishId, cdmId)).toBeNull();
    expect(await meusGrupos(outraParishId, adolescenteId)).toEqual([]);
  });
});
