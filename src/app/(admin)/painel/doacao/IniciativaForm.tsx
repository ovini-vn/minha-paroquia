"use client";

import { useActionState } from "react";
import { salvarIniciativaAction, type DoacaoState } from "@/server/actions/doacao-actions";
import { Button } from "@/components/ui/Button";
import { CampoDeImagem } from "@/components/ui/CampoDeImagem";
import { ICONES_DE_DOACAO, CATEGORIAS_DE_INICIATIVA } from "@/lib/doacao";

const initialState: DoacaoState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

/** Data de `@db.Date` chega como meia-noite UTC; o input quer "AAAA-MM-DD". */
function paraInput(data: Date | null): string {
  return data ? data.toISOString().slice(0, 10) : "";
}

export function IniciativaForm({
  id = "",
  title = "",
  description = "",
  icon = "obras",
  category = "outros",
  finalidadeId = "",
  finalidades = [],
  imageUrl = "",
  startsOn = null,
  endsOn = null,
  podeEnviarArquivo,
  motivoIndisponivel,
}: {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;
  finalidadeId?: string | null;
  /** As finalidades cadastradas em Financeiro, para vincular a esta. */
  finalidades?: { id: string; nome: string }[];
  imageUrl?: string;
  startsOn?: Date | null;
  endsOn?: Date | null;
  podeEnviarArquivo: boolean;
  motivoIndisponivel: string;
}) {
  const [state, formAction, pending] = useActionState(salvarIniciativaAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`ini-title-${id}`} className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id={`ini-title-${id}`}
          name="title"
          required
          maxLength={120}
          defaultValue={title}
          placeholder="Obra dos hidrantes"
          className={campo}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`ini-desc-${id}`} className="text-sm font-medium text-muted">
          O que a paróquia está realizando
        </label>
        <textarea
          id={`ini-desc-${id}`}
          name="description"
          required
          rows={3}
          maxLength={1500}
          defaultValue={description}
          placeholder="Estamos realizando a obra de adequação do sistema de hidrantes da nossa igreja…"
          className={campo}
        />
      </div>

      {finalidades.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ini-fim-${id}`} className="text-sm font-medium text-muted">
            Caminho para contribuir (opcional)
          </label>
          <select
            id={`ini-fim-${id}`}
            name="finalidadeId"
            defaultValue={finalidadeId ?? ""}
            className={campo}
          >
            <option value="">Nenhum — esta iniciativa só informa</option>
            {finalidades.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          {/*
            Dito aqui porque é uma decisão pastoral, não técnica: escolher
            uma finalidade acrescenta ao cartão um convite a ajudar. Deixar
            em branco mantém o cartão como notícia do que a paróquia faz.
          */}
          <p className="text-[12px] leading-relaxed text-muted">
            Escolhendo uma finalidade, o cartão ganha um link discreto para quem quiser ajudar
            nisto. Em branco, ele continua sendo só a notícia do que estamos realizando.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ini-cat-${id}`} className="text-sm font-medium text-muted">
            Categoria
          </label>
          <select id={`ini-cat-${id}`} name="category" defaultValue={category} className={campo}>
            {Object.entries(CATEGORIAS_DE_INICIATIVA).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ini-icon-${id}`} className="text-sm font-medium text-muted">
            Ícone
          </label>
          <select id={`ini-icon-${id}`} name="icon" defaultValue={icon} className={campo}>
            {Object.entries(ICONES_DE_DOACAO).map(([chave, { rotulo }]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ini-inicio-${id}`} className="text-sm font-medium text-muted">
            Início (opcional)
          </label>
          <input
            id={`ini-inicio-${id}`}
            name="startsOn"
            type="date"
            defaultValue={paraInput(startsOn)}
            className={campo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`ini-fim-${id}`} className="text-sm font-medium text-muted">
            Previsão de término (opcional)
          </label>
          <input
            id={`ini-fim-${id}`}
            name="endsOn"
            type="date"
            defaultValue={paraInput(endsOn)}
            className={campo}
          />
        </div>
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Imagem cadastrada da iniciativa"
          className="max-h-40 w-full rounded-lg border border-border object-cover"
        />
      )}

      <CampoDeImagem
        nomeDoArquivo="imageFile"
        nomeDoLink="imageUrl"
        rotulo="Imagem (opcional)"
        linkAtual={imageUrl}
        podeEnviarArquivo={podeEnviarArquivo}
        motivoIndisponivel={motivoIndisponivel}
        ajuda="Uma foto da obra ou da ação ajuda o fiel a ver onde a oferta chega."
      />

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvando..." : id ? "Salvar alterações" : "Adicionar iniciativa"}
        </Button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      </div>
    </form>
  );
}
