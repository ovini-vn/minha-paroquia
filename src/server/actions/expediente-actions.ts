"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { replaceOfficeHours } from "@/server/modules/parishes/service";
import { TURNOS, interpretarExpediente } from "@/lib/expediente";

export type ExpedienteState = { error?: string; ok?: string };

export async function salvarExpedienteAction(
  _prev: ExpedienteState,
  formData: FormData,
): Promise<ExpedienteState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);

  const entradas = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (const turno of TURNOS) {
      entradas.push({
        weekday,
        rotuloDoTurno: turno.rotulo,
        abre: String(formData.get(`d${weekday}-${turno.id}-abre`) ?? ""),
        fecha: String(formData.get(`d${weekday}-${turno.id}-fecha`) ?? ""),
      });
    }
  }

  const resultado = interpretarExpediente(entradas);
  if ("erro" in resultado) return { error: resultado.erro };

  await replaceOfficeHours(session.membership.parishId, resultado.faixas);

  revalidatePath("/painel/expediente");
  revalidatePath("/contato");
  return { ok: "Horários salvos." };
}
