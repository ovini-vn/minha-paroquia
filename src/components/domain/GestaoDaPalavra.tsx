"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  apagarPostAction,
  editarPostAction,
  type ActionState,
} from "@/server/actions/post-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: ActionState = {};

/**
 * Corrigir ou apagar uma publicação, dentro do próprio cartão.
 *
 * Fica aqui, e não numa tela de gestão à parte, porque é onde a pessoa
 * ENCONTRA o erro: ela lê a própria mensagem no mural e vê a vírgula
 * trocada. Mandá-la procurar uma lista noutro lugar seria pedir que
 * guardasse na cabeça qual das publicações queria corrigir.
 *
 * Fechado por padrão: o mural é para ler. O botão de corrigir é discreto e
 * só aparece para quem pode mexer naquela publicação.
 */
export function GestaoDaPalavra({
  postId,
  mediaType,
  contentText,
  mediaUrl,
}: {
  postId: string;
  mediaType: string;
  contentText: string | null;
  mediaUrl: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [estadoEdicao, editar, editando] = useActionState(editarPostAction, inicial);
  const [estadoExclusao, apagar, apagando] = useActionState(apagarPostAction, inicial);
  const ehTexto = mediaType === "texto";

  if (!aberto) {
    return (
      <div className="mt-3 border-t border-border pt-2.5">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Corrigir
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-sunken p-3.5">
      <form action={editar} className="flex flex-col gap-3">
        <input type="hidden" name="postId" value={postId} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`palavra-${postId}`} className="text-sm font-medium text-muted">
            {ehTexto ? "Mensagem" : "Endereço da mídia"}
          </label>
          {ehTexto ? (
            <textarea
              id={`palavra-${postId}`}
              name="contentText"
              required
              rows={7}
              defaultValue={contentText ?? ""}
              className={`${INPUT_CLASSES} min-h-[140px] leading-relaxed`}
            />
          ) : (
            <input
              id={`palavra-${postId}`}
              name="mediaUrl"
              type="url"
              required
              defaultValue={mediaUrl ?? ""}
              className={INPUT_CLASSES}
            />
          )}
          {/*
            Dito antes de salvar, e não depois: quem corrige um texto já
            anunciado costuma temer justamente que a paróquia seja acordada
            de novo.
          */}
          <p className="text-[12px] leading-relaxed text-muted">
            Corrigir não envia notificação — o aviso foi da publicação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" size="sm" disabled={editando}>
            {editando ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          {estadoEdicao.error && <p className="w-full text-sm text-error">{estadoEdicao.error}</p>}
        </div>
      </form>

      {/*
        Formulário separado, e não um segundo botão no de cima: apagar por
        engano ao mirar em "Salvar" é o acidente que a separação evita.
      */}
      <form action={apagar} className="border-t border-error/30 pt-3">
        <input type="hidden" name="postId" value={postId} />
        <p className="mb-2 text-[12.5px] leading-relaxed text-muted">
          Apagar tira a mensagem do Início e da Comunidade.{" "}
          <strong className="text-foreground">Não tem volta.</strong>
        </p>
        <button
          type="submit"
          disabled={apagando}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          {apagando ? "Apagando..." : "Apagar publicação"}
        </button>
        {estadoExclusao.error && (
          <p className="mt-2 text-sm text-error">{estadoExclusao.error}</p>
        )}
      </form>
    </div>
  );
}
