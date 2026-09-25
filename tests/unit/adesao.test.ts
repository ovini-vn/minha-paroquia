import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/tenant-context", () => ({ withTenantContext: vi.fn() }));

const { inicioDaSemana, medianaEmHoras, semanas } = await import("@/server/modules/adesao/service");

describe("medidas da adesão", () => {
  it("a semana começa na segunda", () => {
    // 25/09/2026 é sexta-feira.
    expect(inicioDaSemana(new Date("2026-09-25T15:00:00Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(inicioDaSemana(new Date("2026-09-21T00:00:00Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z");
    // Domingo pertence à semana que começou na segunda anterior.
    expect(inicioDaSemana(new Date("2026-09-27T23:00:00Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("oito semanas, da mais antiga para a atual", () => {
    const s = semanas(new Date("2026-09-25T12:00:00Z"));
    expect(s).toHaveLength(8);
    expect(s[7]!.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(s[0]!.toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });

  it("tempo típico de resposta é a mediana, e não a média que um atraso distorce", () => {
    const h = 3_600_000;
    expect(medianaEmHoras([])).toBeNull();
    expect(medianaEmHoras([2 * h, 4 * h, 300 * h])).toBe(4);
    expect(medianaEmHoras([2 * h, 4 * h])).toBe(3);
  });
});
