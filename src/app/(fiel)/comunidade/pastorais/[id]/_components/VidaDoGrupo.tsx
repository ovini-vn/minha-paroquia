"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Send, Trash2 } from "lucide-react";
import {
  apagarRecadoAction,
  apagarTarefaAction,
  assumirTarefaAction,
  criarTarefaAction,
  gerarConviteDoGrupoAction,
  publicarRecadoAction,
  salvarChamadaAction,
  type GrupoActionState,
} from "@/server/actions/grupo-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: GrupoActionState = {};

// ---- recados ---------------------------------------------------------------

/** A coordenação escreve; cada membro recebe no app e no celular. */
export function RecadoForm({ groupId }: { groupId: string }) {
  const [estado, acao, pendente] = useActionState(publicarRecadoAction, inicial);
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (estado.ok && campo.current) campo.current.value = "";
  }, [estado]);

  return (
    <form action={acao} className="flex flex-col gap-2.5">
      <input type="hidden" name="groupId" value={groupId} />
      <textarea
        ref={campo}
        name="texto"
        rows={3}
        required
        maxLength={2000}
        placeholder="Domingo o encontro começa às 16h30, por causa da missa das crianças."
        className={INPUT_CLASSES}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          <Send className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {pendente ? "Enviando…" : "Enviar ao grupo"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

export function ApagarRecado({ groupId, recadoId }: { groupId: string; recadoId: string }) {
  const [, acao, pendente] = useActionState(apagarRecadoAction, inicial);
  return (
    <form action={acao}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="recadoId" value={recadoId} />
      <button
        type="submit"
        disabled={pendente}
        className="alvo-de-toque inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] text-muted hover:text-error"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        Apagar
      </button>
    </form>
  );
}

// ---- chamada ---------------------------------------------------------------

export type LinhaDaChamada = { userId: string; fullName: string; presente: boolean | null };
export type EncontroDaChamada = { id: string; rotulo: string };

/**
 * A chamada de um encontro. Trocar o encontro recarrega a página com
 * `?chamada=<id>`, porque quem já estava marcado vem do servidor.
 */
export function ChamadaForm({
  groupId,
  encontros,
  encontroId,
  linhas,
}: {
  groupId: string;
  encontros: EncontroDaChamada[];
  encontroId: string;
  linhas: LinhaDaChamada[];
}) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(salvarChamadaAction, inicial);

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="encontroId" value={encontroId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="chamada-encontro" className="text-sm font-medium text-muted">
          Encontro
        </label>
        <select
          id="chamada-encontro"
          value={encontroId}
          onChange={(e) => router.push(`?chamada=${e.target.value}#coordenacao`, { scroll: false })}
          className={INPUT_CLASSES}
        >
          {encontros.map((e) => (
            <option key={e.id} value={e.id}>
              {e.rotulo}
            </option>
          ))}
        </select>
      </div>

      {linhas.length === 0 ? (
        <p className="text-[13.5px] text-muted">Ninguém no grupo ainda.</p>
      ) : (
        <ul className="flex flex-col">
          {linhas.map((l) => (
            <li key={l.userId} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
              <span className="text-[14.5px] text-foreground">{l.fullName}</span>
              <fieldset className="flex gap-3 text-[13.5px]">
                <legend className="sr-only">{l.fullName}</legend>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`presenca-${l.userId}`} value="sim" defaultChecked={l.presente === true} />
                  Veio
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`presenca-${l.userId}`} value="nao" defaultChecked={l.presente === false} />
                  Faltou
                </label>
              </fieldset>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente || linhas.length === 0}>
          {pendente ? "Salvando…" : "Salvar a chamada"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

// ---- tarefas ---------------------------------------------------------------

export type TarefaVista = { id: string; descricao: string; responsavelId: string | null; responsavel: string | null };

export function TarefasDoEncontro({
  groupId,
  encontroId,
  tarefas,
  souDoGrupo,
  coordeno,
  membros,
}: {
  groupId: string;
  encontroId: string;
  tarefas: TarefaVista[];
  souDoGrupo: boolean;
  coordeno: boolean;
  membros: { userId: string; fullName: string }[];
}) {
  const [novo, criar, criando] = useActionState(criarTarefaAction, inicial);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (novo.ok) form.current?.reset();
  }, [novo]);

  if (tarefas.length === 0 && !coordeno) return null;

  return (
    <div className="mt-3 border-t border-gold/30 pt-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-eyebrow text-[#8a6b24] dark:text-gold">
        Tarefas deste encontro
      </p>
      {tarefas.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {tarefas.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-foreground">
              <span className="font-medium">{t.descricao}</span>
              <span className="text-muted">·</span>
              {t.responsavel ? (
                <span className="text-muted">{t.responsavel}</span>
              ) : souDoGrupo ? (
                <Assumir groupId={groupId} tarefaId={t.id} />
              ) : (
                <span className="text-muted">sem ninguém</span>
              )}
              {coordeno && <ApagarTarefa groupId={groupId} tarefaId={t.id} />}
            </li>
          ))}
        </ul>
      )}
      {coordeno && (
        <form ref={form} action={criar} className="mt-2.5 flex flex-wrap items-end gap-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="encontroId" value={encontroId} />
          <input
            name="descricao"
            required
            maxLength={120}
            placeholder="Acolhida, lanche, música…"
            aria-label="Tarefa"
            className={`${INPUT_CLASSES} min-w-[160px] flex-1`}
          />
          <select name="responsavelId" aria-label="Quem fica com a tarefa" defaultValue="" className={`${INPUT_CLASSES} w-auto`}>
            <option value="">Sem ninguém ainda</option>
            {membros.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="ghost" disabled={criando}>
            Incluir
          </Button>
          {novo.error && <p className="w-full text-sm text-error">{novo.error}</p>}
        </form>
      )}
    </div>
  );
}

function Assumir({ groupId, tarefaId }: { groupId: string; tarefaId: string }) {
  const [estado, acao, pendente] = useActionState(assumirTarefaAction, inicial);
  return (
    <form action={acao} className="inline">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="tarefaId" value={tarefaId} />
      <button type="submit" disabled={pendente} className="alvo-de-toque rounded-md text-[13.5px] font-semibold text-primary hover:underline">
        Eu fico com essa
      </button>
      {estado.error && <span className="ml-2 text-[12.5px] text-error">{estado.error}</span>}
    </form>
  );
}

function ApagarTarefa({ groupId, tarefaId }: { groupId: string; tarefaId: string }) {
  const [, acao, pendente] = useActionState(apagarTarefaAction, inicial);
  return (
    <form action={acao} className="inline">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="tarefaId" value={tarefaId} />
      <button type="submit" disabled={pendente} aria-label="Apagar a tarefa" className="alvo-de-toque rounded-md p-1 text-muted hover:text-error">
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
      </button>
    </form>
  );
}

// ---- convite do grupo ------------------------------------------------------

/**
 * O link de convite do grupo. Gerar de novo troca o antigo — é o jeito de
 * fechar um link que circulou onde não devia.
 */
export function ConviteDoGrupo({ groupId }: { groupId: string }) {
  const [estado, acao, pendente] = useActionState(gerarConviteDoGrupoAction, inicial);
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="mt-5 rounded-lg bg-sunken p-3.5">
      <p className="text-[14px] font-semibold text-foreground">Link de convite do grupo</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
        Quem é da paróquia e abre o link entra direto no grupo — é você quem escolhe a quem mandar. Gerar de novo
        desliga o link anterior.
      </p>
      {estado.ok ? (
        <div className="mt-2.5 flex items-center gap-2">
          <input readOnly value={estado.ok} className={`${INPUT_CLASSES} font-mono text-[12.5px]`} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(estado.ok ?? "");
              setCopiado(true);
            }}
          >
            <Copy className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
      ) : (
        <form action={acao} className="mt-2.5">
          <input type="hidden" name="groupId" value={groupId} />
          <Button type="submit" size="sm" variant="ghost" disabled={pendente}>
            <Link2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            {pendente ? "Gerando…" : "Gerar o link"}
          </Button>
        </form>
      )}
    </div>
  );
}
