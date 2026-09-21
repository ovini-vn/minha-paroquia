import { describe, expect, it } from "vitest";
import { resolverFoco } from "@/server/auth/foco-da-plataforma";

/**
 * O foco é uma LENTE: faz o painel falar de outra paróquia sem mexer no
 * vínculo de ninguém. Por isso a única regra que importa aqui é quem pode
 * usá-lo — e ela não pode depender de nenhuma tela lembrar de conferir.
 */
describe("foco da plataforma", () => {
  it("só administrador da plataforma foca outra paróquia", () => {
    expect(resolverFoco(true, "paroquia-123")).toBe("paroquia-123");
    // Um cookie forjado por quem não administra a plataforma não vale nada.
    expect(resolverFoco(false, "paroquia-123")).toBeNull();
  });

  it("cookie ausente ou vazio é o estado normal: sem foco", () => {
    expect(resolverFoco(true, null)).toBeNull();
    expect(resolverFoco(true, "")).toBeNull();
    expect(resolverFoco(true, "   ")).toBeNull();
    expect(resolverFoco(false, null)).toBeNull();
  });
});
