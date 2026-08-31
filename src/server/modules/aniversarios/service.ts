import { withTenantContext } from "@/server/db/tenant-context";
import {
  proximosAniversarios,
  type Aniversario,
  type DataDeAniversario,
  type TipoDeAniversario,
} from "@/lib/aniversarios";

/**
 * As datas que voltam todo ano, para a paróquia lembrar de quem é o dia.
 *
 * Duas fontes: a data de nascimento que a pessoa preencheu no perfil, e os
 * sacramentos que ela registrou na Caminhada. Nenhuma é obrigatória — quem
 * não preencheu simplesmente não aparece, e a lista não inventa.
 */
export async function listarAniversarios(
  parishId: string,
  hoje: Date,
  dias = 30,
): Promise<Aniversario[]> {
  return withTenantContext(parishId, async (tx) => {
    const [membros, sacramentos] = await Promise.all([
      // Quem saiu não é mais da casa: o vínculo fica inativo, e a data
      // dele deixa de aparecer aqui.
      tx.parishMembership.findMany({
        where: { parishId, status: "active" },
        select: { user: { select: { id: true, fullName: true, birthDate: true } } },
      }),
      tx.sacrament.findMany({
        where: { parishId },
        select: {
          userId: true,
          familyMemberId: true,
          type: true,
          date: true,
          user: { select: { fullName: true } },
          // O sacramento pode ser de quem não tem conta — a criança da
          // catequese. O aniversário dela é da comunidade do mesmo jeito.
          familyMember: { select: { fullName: true } },
        },
      }),
    ]);

    const datas: DataDeAniversario[] = [];

    for (const m of membros) {
      if (!m.user.birthDate) continue;
      datas.push({
        pessoaId: m.user.id,
        nome: m.user.fullName,
        tipo: "nascimento",
        data: m.user.birthDate,
      });
    }

    for (const s of sacramentos) {
      // Uma das duas pontas está preenchida, garantido por CHECK no banco.
      const pessoaId = s.userId ?? s.familyMemberId;
      const nome = s.user?.fullName ?? s.familyMember?.fullName;
      if (!pessoaId || !nome) continue;

      datas.push({
        pessoaId,
        nome,
        tipo: s.type as TipoDeAniversario,
        data: s.date,
      });
    }

    return proximosAniversarios(datas, hoje, dias);
  });
}
