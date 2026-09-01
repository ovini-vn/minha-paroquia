import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import {
  apagarPost,
  createPost,
  editarPost,
  listRecentPosts,
  podeMexerNaPalavra,
} from "@/server/modules/posts/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Corrigir e apagar a Palavra do Padre.
 *
 * O que estes testes protegem: a Palavra é assinada por uma pessoa, e um
 * sacerdote não pode reescrever o que o outro disse. O caminho contrário
 * também importa — uma publicação sem autor registrado (as anteriores à
 * coluna, e as que entraram por importação) não pode ficar sem ninguém que
 * possa corrigi-la.
 */
describe("editar e apagar a Palavra do Padre", () => {
  let parishId: string;
  let padreId: string;
  let outroPadreId: string;
  let padrePerfilId: string;
  let parocoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  const administra = (userId: string) => ({ userId, administraPalavra: true });
  const naoAdministra = (userId: string) => ({ userId, administraPalavra: false });

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Palavra ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const padre = await registerUser({
      fullName: "Padre Autor",
      email: `padre-autor-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    const outro = await registerUser({
      fullName: "Padre Vizinho",
      email: `padre-vizinho-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    const paroco = await registerUser({
      fullName: "Pároco",
      email: `paroco-palavra-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    padreId = padre.id;
    outroPadreId = outro.id;
    parocoId = paroco.id;
    userIds.push(padre.id, outro.id, paroco.id);

    const perfil = await withTenantContext(parishId, (tx) =>
      tx.priestProfile.create({ data: { userId: padreId, parishId, title: "Sacerdote" } }),
    );
    padrePerfilId = perfil.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("quem escreveu corrige a própria publicação, e o texto muda", async () => {
    const post = await createPost({
      parishId,
      priestProfileId: padrePerfilId,
      createdBy: padreId,
      mediaType: "texto",
      contentText: "A paz esteja consoco.",
    });

    await editarPost({
      parishId,
      postId: post.id,
      contentText: "A paz esteja convosco.",
      quem: naoAdministra(padreId),
    });

    const lido = (await listRecentPosts(parishId)).find((p) => p.id === post.id);
    expect(lido?.contentText).toBe("A paz esteja convosco.");
  });

  it("um sacerdote não reescreve o que o outro disse", async () => {
    const post = (await listRecentPosts(parishId))[0]!;

    await expect(
      editarPost({
        parishId,
        postId: post.id,
        contentText: "Texto de outra pessoa.",
        quem: naoAdministra(outroPadreId),
      }),
    ).rejects.toThrow();

    await expect(apagarPost(parishId, post.id, naoAdministra(outroPadreId))).rejects.toThrow();

    // E o texto continua o que era.
    const lido = (await listRecentPosts(parishId)).find((p) => p.id === post.id);
    expect(lido?.contentText).toBe("A paz esteja convosco.");
  });

  it("quem administra a paróquia alcança o que qualquer um publicou", async () => {
    const post = (await listRecentPosts(parishId))[0]!;

    await editarPost({
      parishId,
      postId: post.id,
      contentText: "Corrigido pela secretaria.",
      quem: administra(parocoId),
    });

    const lido = (await listRecentPosts(parishId)).find((p) => p.id === post.id);
    expect(lido?.contentText).toBe("Corrigido pela secretaria.");
  });

  it("publicação sem autor registrado não fica órfã", () => {
    /*
     * As que entraram antes da coluna `created_by` — e as do importador do
     * calendário — não têm autor. Se só o autor pudesse mexer, ninguém no
     * mundo conseguiria corrigi-las.
     */
    const semAutor = { createdBy: null, priestProfile: null };
    expect(podeMexerNaPalavra(semAutor, naoAdministra(padreId))).toBe(false);
    expect(podeMexerNaPalavra(semAutor, administra(parocoId))).toBe(true);
  });

  it("o padre que publicou antes da coluna continua alcançando o que assinou", () => {
    // `createdBy` nulo, mas a assinatura diz de quem é.
    const antigo = { createdBy: null, priestProfile: { userId: padreId } };
    expect(podeMexerNaPalavra(antigo, naoAdministra(padreId))).toBe(true);
    expect(podeMexerNaPalavra(antigo, naoAdministra(outroPadreId))).toBe(false);
  });

  it("apagar tira a publicação do mural", async () => {
    const antes = await listRecentPosts(parishId);
    const post = antes[0]!;

    await apagarPost(parishId, post.id, naoAdministra(padreId));

    const depois = await listRecentPosts(parishId);
    expect(depois.some((p) => p.id === post.id)).toBe(false);
    expect(depois).toHaveLength(antes.length - 1);
  });

  it("corrigir uma publicação que não existe não estoura de forma estranha", async () => {
    await expect(
      editarPost({
        parishId,
        postId: "00000000-0000-0000-0000-000000000000",
        contentText: "Nada.",
        quem: administra(parocoId),
      }),
    ).rejects.toThrow(/não encontrad/i);
  });
});
