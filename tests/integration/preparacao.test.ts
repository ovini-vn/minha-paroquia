import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerParish } from "@/server/modules/parishes/service";
import {
  documentosDoTexto,
  preparacaoDe,
  salvarPreparacao,
  sacramentoDoCaminho,
} from "@/server/modules/preparacao/service";
import { cleanupTenantData } from "../helpers/cleanup";

/** A orientação de batismo e casamento que a paróquia escreve uma vez. */
describe("preparação dos sacramentos", () => {
  const stamp = Date.now();
  const parishIds: string[] = [];
  let parishId: string;
  let outraId: string;

  beforeAll(async () => {
    parishId = (await registerParish({ name: `Par Preparacao ${stamp}` })).id;
    outraId = (await registerParish({ name: `Par Outra Preparacao ${stamp}` })).id;
    parishIds.push(parishId, outraId);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds: [], parishIds });
  });

  it("documentos: um por linha, sem marcador, vazio ou repetido", () => {
    expect(documentosDoTexto("- Certidão de nascimento\n\n2. RG dos pais\n• rg dos pais\n  ")).toEqual([
      "Certidão de nascimento",
      "RG dos pais",
    ]);
  });

  it("o endereço fala casamento, o banco fala matrimônio", () => {
    expect(sacramentoDoCaminho("casamento")).toBe("matrimonio");
    expect(sacramentoDoCaminho("batismo")).toBe("batismo");
    expect(sacramentoDoCaminho("crisma")).toBeNull();
  });

  it("salvar de novo substitui, e cada paróquia tem a sua", async () => {
    await salvarPreparacao(parishId, "batismo", { orientacao: "Procure a secretaria.", documentos: "Certidão", encontros: "" });
    await salvarPreparacao(parishId, "batismo", {
      orientacao: "Procure a secretaria com dois meses.",
      documentos: "Certidão\nRG",
      encontros: "Sábado, 15h",
    });
    const p = await preparacaoDe(parishId, "batismo");
    expect(p).toMatchObject({ orientacao: "Procure a secretaria com dois meses.", documentos: ["Certidão", "RG"], encontros: "Sábado, 15h" });
    expect(await preparacaoDe(outraId, "batismo")).toBeNull();
  });

  it("não aceita outro sacramento nem orientação vazia", async () => {
    await expect(salvarPreparacao(parishId, "crisma", { orientacao: "Texto qualquer aqui", documentos: "", encontros: "" })).rejects.toThrow(/batismo ou casamento/);
    await expect(salvarPreparacao(parishId, "matrimonio", { orientacao: "  ", documentos: "", encontros: "" })).rejects.toThrow(/orientação/);
  });
});
