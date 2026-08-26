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
      // Só quem pertence de fato: pendente ainda não foi confirmado pela
      // secretaria, e quem saiu não é mais da casa.
      tx.parishMembership.findMany({
        where: { parishId, status: "active" },
        select: { user: { select: { id: true, fullName: true, birthDate: true } } },
      }),
      tx.sacrament.findMany({
        where: { parishId },
        select: { userId: true, type: true, date: true, user: { select: { fullName: true } } },
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
      datas.push({
        pessoaId: s.userId,
        nome: s.user.fullName,
        tipo: s.type as TipoDeAniversario,
        data: s.date,
      });
    }

    return proximosAniversarios(datas, hoje, dias);
  });
}
