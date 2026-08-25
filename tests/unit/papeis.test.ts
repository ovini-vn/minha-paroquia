import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  ROLES_QUE_ADMINISTRAM,
  PERMISSIONS,
  isFullAdmin,
} from "@/server/auth/rbac";
import { isPriestRole } from "@/server/modules/priests/ensure-priest-profile";

/**
 * Pároco é o cargo eclesial; administrador é quem opera a ferramenta. Na
 * maioria das paróquias é a mesma pessoa — mas o código não pode supor isso.
 */
describe("administrar a paróquia e ser clero são coisas diferentes", () => {
  it("o Administrador da paróquia NÃO é clero", () => {
    // É isto que o mantém fora da lista de sacerdotes, do pedido de
    // atendimento e da tela "Nosso Pároco".
    expect(isPriestRole("ADMINISTRADOR_PAROQUIAL")).toBe(false);
    expect(isPriestRole("PAROCO")).toBe(true);
  });

  it("mas administra tanto quanto o Pároco", () => {
    const doParoco = new Set(ROLE_PERMISSIONS.PAROCO);
    const doAdmin = ROLE_PERMISSIONS.ADMINISTRADOR_PAROQUIAL;
    // A única que o Pároco tem a mais é a de sacerdote: abrir horários de
    // atendimento e ler pedidos de oração reservados.
    const soDoParoco = [...doParoco].filter((p) => !doAdmin.includes(p));
    expect(soDoParoco).toEqual([
      PERMISSIONS.AVAILABILITY_MANAGE,
      PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE,
    ]);
  });

  it("a secretaria pode publicar a Palavra do Padre", () => {
    // Onde o padre não usa o aplicativo, é ela que leva a palavra dele.
    expect(ROLE_PERMISSIONS.SECRETARIA).toContain(PERMISSIONS.POSTS_CREATE);
  });

  it("quem administra sai do catálogo, não de uma lista repetida à mão", () => {
    expect(ROLES_QUE_ADMINISTRAM).toEqual(["PAROCO", "ADMINISTRADOR_PAROQUIAL"]);
    for (const code of ROLES_QUE_ADMINISTRAM) {
      expect(ROLE_PERMISSIONS[code]).toContain(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);
    }
  });

  it("a secretaria administra o dia a dia, mas não mexe nos papéis dos outros", () => {
    expect(isFullAdmin("SECRETARIA")).toBe(true);
    expect(ROLES_QUE_ADMINISTRAM).not.toContain("SECRETARIA");
  });

  it("o novo papel enxerga tudo em Servir, como o Pároco", () => {
    expect(isFullAdmin("ADMINISTRADOR_PAROQUIAL")).toBe(true);
    expect(isFullAdmin("COORDENADOR_PASTORAL")).toBe(false);
  });
});
