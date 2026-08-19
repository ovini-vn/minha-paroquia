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
        <label htmlFor="mediaType" className="text-sm font-medium text-ink-700">
          Tipo
        </label>
        <select
          id="mediaType"
          name="mediaType"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType)}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="texto">Texto</option>
          <option value="audio">Áudio (link)</option>
          <option value="video">Vídeo (link)</option>
        </select>
      </div>

      {mediaType === "texto" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contentText" className="text-sm font-medium text-ink-700">
            Sua mensagem
          </label>
          <textarea
            id="contentText"
            name="contentText"
            rows={6}
            placeholder="O que Deus colocou no seu coração para compartilhar com a comunidade hoje?"
            className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mediaUrl" className="text-sm font-medium text-ink-700">
            Link do {mediaType === "audio" ? "áudio" : "vídeo"}
          </label>
          <input
            id="mediaUrl"
            name="mediaUrl"
            type="url"
            placeholder="https://..."
            className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
          />
          <p className="text-xs text-ink-700">
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
