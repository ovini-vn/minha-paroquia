import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O limite do cadastro, testado pela AÇÃO, e não só pelo contador.
 *
 * O contador já tinha teste (rate-limit.test.ts). O que faltava era a ação
 * de cadastro chamá-lo — e só se prova isso chamando a ação. O Argon2 mora
 * em `registerUser`; por isso ele é substituído por um espião: a pergunta é
 * se a tentativa barrada chega até ele, não se ele sabe cifrar.
 *
 * O contador é o de verdade, no banco, sob chaves próprias deste arquivo.
 */

const estado = vi.hoisted(() => ({ endereco: null as string | null }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(estado.endereco ? { "x-forwarded-for": estado.endereco } : {}),
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));
// Fora de uma requisição, o redirect de verdade lança; aqui ele só registra.
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/modules/users/service", () => ({
  registerUser: vi.fn(async () => ({ id: "conta-de-teste" })),
  authenticateUser: vi.fn(),
  updateOwnProfile: vi.fn(),
}));
vi.mock("@/server/auth/session", () => ({ createSession: vi.fn(), destroySession: vi.fn() }));

import { registerAction } from "@/server/actions/auth-actions";
import { registerUser } from "@/server/modules/users/service";
import { prisma } from "@/server/db/prisma";

const prefixo = `teste-cadastro-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function formulario(n: number, email = `fiel-${n}@exemplo.com`) {
  const f = new FormData();
  f.set("fullName", "Fiel de Teste");
  f.set("email", email);
  f.set("password", "senha-bem-comprida");
  return f;
}

describe("limite de cadastros por conexão", () => {
  beforeEach(() => {
    vi.mocked(registerUser).mockClear();
  });

  afterAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { chave: { startsWith: `cadastro:ip:${prefixo}` } } });
  });

  it("barra a conexão que insiste, antes de chegar ao Argon2", async () => {
    estado.endereco = `${prefixo}-insiste`;

    let permitidos = 0;
    let barrado: { error?: string } | undefined;
    for (let i = 0; i < 100; i++) {
      const r = await registerAction({}, formulario(i));
      if (r?.error) {
        barrado = r;
        break;
      }
      permitidos++;
    }

    expect(barrado?.error).toMatch(/^Muitos cadastros seguidos a partir desta conexão\. Espere .+ e tente de novo\.$/);
    // Só os que passaram chegaram a `registerUser` — que é quem chama o Argon2.
    expect(registerUser).toHaveBeenCalledTimes(permitidos);
    // Folga para o mutirão de cadastro no Wi-Fi da paróquia depois da missa.
    expect(permitidos).toBeGreaterThanOrEqual(20);

    vi.mocked(registerUser).mockClear();
    const deNovo = await registerAction({}, formulario(999));
    expect(deNovo?.error).toMatch(/^Muitos cadastros seguidos/);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("outra conexão continua se cadastrando", async () => {
    // É o que separa "conter quem insiste" de "fechar o cadastro para todos".
    estado.endereco = `${prefixo}-outra`;

    const r = await registerAction({}, formulario(1));

    expect(r).toBeUndefined();
    expect(registerUser).toHaveBeenCalledTimes(1);
  });

  it("formulário com erro não gasta a vez de ninguém", async () => {
    estado.endereco = `${prefixo}-errou`;

    for (let i = 0; i < 40; i++) {
      const r = await registerAction({}, formulario(i, "sem-arroba"));
      expect(r?.error).toBe("E-mail inválido.");
    }

    const certo = await registerAction({}, formulario(1));
    expect(certo).toBeUndefined();
    expect(registerUser).toHaveBeenCalledTimes(1);
  });
});
