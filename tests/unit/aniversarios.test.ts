import { describe, expect, it } from "vitest";
import {
  proximosAniversarios,
  rotuloDeProximidade,
  type DataDeAniversario,
} from "@/lib/aniversarios";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const pessoa = (
  nome: string,
  tipo: DataDeAniversario["tipo"],
  data: string,
): DataDeAniversario => ({ pessoaId: nome, nome, tipo, data: d(data) });

describe("datas que voltam todo ano", () => {
  it("mostra o que cai dentro da janela e ignora o resto", () => {
    const hoje = d("2026-08-26");
    const lista = proximosAniversarios(
      [
        pessoa("Maria", "nascimento", "1980-09-02"),
        pessoa("João", "batismo", "1995-12-25"), // fora dos 30 dias
      ],
      hoje,
      30,
    );
    expect(lista.map((a) => a.nome)).toEqual(["Maria"]);
    expect(lista[0]?.faltam).toBe(7);
  });

  it("conta os anos completados, não a idade do registro", () => {
    const lista = proximosAniversarios([pessoa("Maria", "nascimento", "1980-09-02")], d("2026-08-26"));
    expect(lista[0]?.anos).toBe(46);
  });

  it("atravessa a virada do ano", () => {
    // Em 20 de dezembro, "os próximos 30 dias" incluem janeiro — e é aí que
    // uma conta ingênua deixa de fora metade da lista.
    const lista = proximosAniversarios(
      [
        pessoa("Ano novo", "nascimento", "1990-01-05"),
        pessoa("Natal", "batismo", "2000-12-25"),
      ],
      d("2026-12-20"),
      30,
    );
    expect(lista.map((a) => a.nome)).toEqual(["Natal", "Ano novo"]);
    expect(lista[1]?.quando.toISOString().slice(0, 10)).toBe("2027-01-05");
    expect(lista[1]?.anos).toBe(37);
  });

  it("o dia de hoje conta como hoje, não como daqui a um ano", () => {
    const lista = proximosAniversarios([pessoa("Hoje", "nascimento", "1970-08-26")], d("2026-08-26"));
    expect(lista[0]?.faltam).toBe(0);
  });

  it("29 de fevereiro não some nos anos comuns", () => {
    // Quem nasceu no dia bissexto comemora igual: cai em 1º de março.
    const lista = proximosAniversarios(
      [pessoa("Bissexto", "nascimento", "1996-02-29")],
      d("2027-02-20"),
      30,
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]?.quando.toISOString().slice(0, 10)).toBe("2027-03-01");
  });

  it("em ano bissexto, cai no próprio 29", () => {
    const lista = proximosAniversarios(
      [pessoa("Bissexto", "nascimento", "1996-02-29")],
      d("2028-02-20"),
      30,
    );
    expect(lista[0]?.quando.toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("aniversário de vida vem antes dos sacramentos no mesmo dia", () => {
    // É o que a paróquia lembra em voz alta na missa. Entre os sacramentos,
    // a ordem é por nome: é uma lista de pessoas, não de sacramentos.
    const lista = proximosAniversarios(
      [
        pessoa("Ana", "crisma", "2010-09-01"),
        pessoa("Bruno", "nascimento", "1985-09-01"),
        pessoa("Carlos", "batismo", "1990-09-01"),
      ],
      d("2026-08-30"),
    );
    expect(lista.map((a) => `${a.nome} (${a.tipo})`)).toEqual([
      "Bruno (nascimento)",
      "Ana (crisma)",
      "Carlos (batismo)",
    ]);
  });

  it("ordena por proximidade antes de tudo", () => {
    const lista = proximosAniversarios(
      [
        pessoa("Depois", "nascimento", "1980-09-10"),
        pessoa("Antes", "crisma", "2000-08-28"),
      ],
      d("2026-08-26"),
    );
    expect(lista.map((a) => a.nome)).toEqual(["Antes", "Depois"]);
  });

  it("lista vazia não quebra", () => {
    expect(proximosAniversarios([], d("2026-08-26"))).toEqual([]);
  });
});

describe("como a proximidade é dita", () => {
  it("usa palavra em vez de número quando é perto", () => {
    expect(rotuloDeProximidade(0)).toBe("Hoje");
    expect(rotuloDeProximidade(1)).toBe("Amanhã");
    expect(rotuloDeProximidade(9)).toBe("Em 9 dias");
  });
});
