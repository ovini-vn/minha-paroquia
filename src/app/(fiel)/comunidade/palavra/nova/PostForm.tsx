"use client";

import { useActionState, useState } from "react";
import { createPostAction, type ActionState } from "@/server/actions/post-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type MediaType = "texto" | "audio" | "video";

export function PostForm() {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);
  const [mediaType, setMediaType] = useState<MediaType>("texto");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mediaType" className="text-sm font-medium text-muted">
          Tipo
        </label>
        <select
          id="mediaType"
          name="mediaType"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          <option value="texto">Texto</option>
          <option value="audio">Áudio (link)</option>
          <option value="video">Vídeo (link)</option>
        </select>
      </div>

      {/*
        O título vem DEPOIS do tipo e ANTES do conteúdo, e é opcional na
        etiqueta, não só no schema: quem publica precisa ver que pode pular.
        A ajuda embaixo diz para que serve — sem ela, um campo opcional sem
        explicação é só mais uma coisa para ignorar.
      */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="titulo" className="text-sm font-medium text-muted">
          Título <span className="font-normal">(opcional)</span>
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          maxLength={80}
          placeholder={
            mediaType === "texto" ? "Ex.: A alegria de servir" : "Ex.: Lucas 4, 38-44"
          }
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
        <p className="text-xs text-muted">
          É o que a comunidade lê no aviso do celular. Sem título, o aviso mostra o começo da
          mensagem — e num {mediaType === "texto" ? "texto" : mediaType === "audio" ? "áudio" : "vídeo"}
          {mediaType === "texto" ? " isso costuma bastar." : " ele só consegue dizer que chegou um novo."}
        </p>
      </div>

      {mediaType === "texto" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contentText" className="text-sm font-medium text-muted">
            Sua mensagem
          </label>
          <textarea
            id="contentText"
            name="contentText"
            rows={6}
            placeholder="O que Deus colocou no seu coração para compartilhar com a comunidade hoje?"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mediaUrl" className="text-sm font-medium text-muted">
            Link do {mediaType === "audio" ? "áudio" : "vídeo"}
          </label>
          <input
            id="mediaUrl"
            name="mediaUrl"
            type="url"
            placeholder="https://..."
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          />
          <p className="text-xs text-muted">
            Cole o link de onde o {mediaType === "audio" ? "áudio" : "vídeo"} já está hospedado.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando..." : "Publicar"}
      </Button>
    </form>
  );
}
