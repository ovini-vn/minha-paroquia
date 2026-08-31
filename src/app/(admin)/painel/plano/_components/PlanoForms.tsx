"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  criarPlanoAction,
  criarSecaoAction,
  editarPlanoAction,
  editarSecaoAction,
  apagarPlanoAction,
  type ActionState,
} from "@/server/actions/plano-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { Eyebrow } from "@/components/ui/Typography";

const inicial: ActionState = {};

/** A área de texto do corpo, com a mesma moldura dos outros campos. */
const AREA_CLASSES = `${INPUT_CLASSES} min-h-[150px] leading-relaxed`;

function Campo({
  id,
  label,
  children,
  dica,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  dica?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {dica && <p className="text-[12px] leading-relaxed text-muted">{dica}</p>}
    </div>
  );
}

export function CriarPlanoForm({ anoSugerido }: { anoSugerido: number }) {
  const [estado, acao, pendente] = useActionState(criarPlanoAction, inicial);

  return (
    <form action={acao} className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[110px]">
          <Campo id="plano-ano" label="Ano">
            <input
              id="plano-ano"
              name="ano"
              type="number"
              required
              defaultValue={anoSugerido}
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
        <div className="min-w-[240px] flex-1">
          <Campo id="plano-titulo" label="Título">
            <input
              id="plano-titulo"
              name="titulo"
              required
              placeholder="Ex.: Plano pastoral 2026"
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
      </div>

      <Campo
        id="plano-intro"
        label="Abertura (opcional)"
        dica="Uma ou duas frases dizendo do que trata o plano deste ano."
      >
        <textarea id="plano-intro" name="introducao" rows={3} className={AREA_CLASSES} />
      </Campo>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pendente}>
          <Plus className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
          {pendente ? "Criando..." : "Criar plano"}
        </Button>
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

export function EditarPlanoForm({
  planoId,
  ano,
  titulo,
  introducao,
}: {
  planoId: string;
  ano: number;
  titulo: string;
  introducao: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(editarPlanoAction, inicial);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        Editar título e abertura
      </button>
    );
  }

  return (
    <form action={acao} className="mt-2 flex flex-col gap-3.5 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="planoId" value={planoId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[110px]">
          <Campo id={`ed-ano-${planoId}`} label="Ano">
            <input
              id={`ed-ano-${planoId}`}
              name="ano"
              type="number"
              required
              defaultValue={ano}
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
        <div className="min-w-[240px] flex-1">
          <Campo id={`ed-tit-${planoId}`} label="Título">
            <input
              id={`ed-tit-${planoId}`}
              name="titulo"
              required
              defaultValue={titulo}
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
      </div>
      <Campo id={`ed-intro-${planoId}`} label="Abertura (opcional)">
        <textarea
          id={`ed-intro-${planoId}`}
          name="introducao"
          rows={3}
          defaultValue={introducao ?? ""}
          className={AREA_CLASSES}
        />
      </Campo>
      <div className="flex items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

export function CriarSecaoForm({ planoId }: { planoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(criarSecaoAction, inicial);

  if (!aberto) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
        Nova seção
      </Button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3.5 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="planoId" value={planoId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[170px]">
          <Campo id="nova-rotulo" label="Tarja (opcional)">
            <input
              id="nova-rotulo"
              name="rotulo"
              placeholder="Ex.: Eixo 1"
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
        <div className="min-w-[220px] flex-1">
          <Campo id="nova-titulo" label="Título da seção">
            <input
              id="nova-titulo"
              name="titulo"
              required
              placeholder="Ex.: Comunhão — Construindo uma Igreja do Encontro"
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
      </div>
      <Campo
        id="nova-corpo"
        label="Conteúdo"
        dica="Deixe uma linha em branco entre os parágrafos — é assim que eles são separados na tela de quem lê."
      >
        <textarea id="nova-corpo" name="corpo" required rows={7} className={AREA_CLASSES} />
      </Campo>
      <div className="flex items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Adicionando..." : "Adicionar seção"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

export function EditarSecaoForm({
  secaoId,
  rotulo,
  titulo,
  corpo,
}: {
  secaoId: string;
  rotulo: string | null;
  titulo: string;
  corpo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(editarSecaoAction, inicial);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        Editar
      </button>
    );
  }

  return (
    <form action={acao} className="mt-3 flex flex-col gap-3.5 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="secaoId" value={secaoId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[170px]">
          <Campo id={`s-rot-${secaoId}`} label="Tarja (opcional)">
            <input
              id={`s-rot-${secaoId}`}
              name="rotulo"
              defaultValue={rotulo ?? ""}
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
        <div className="min-w-[220px] flex-1">
          <Campo id={`s-tit-${secaoId}`} label="Título da seção">
            <input
              id={`s-tit-${secaoId}`}
              name="titulo"
              required
              defaultValue={titulo}
              className={INPUT_CLASSES}
            />
          </Campo>
        </div>
      </div>
      <Campo id={`s-corpo-${secaoId}`} label="Conteúdo">
        <textarea
          id={`s-corpo-${secaoId}`}
          name="corpo"
          required
          rows={10}
          defaultValue={corpo}
          className={AREA_CLASSES}
        />
      </Campo>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {/* Afastado do "Salvar" de propósito: apagar por engano ao mirar em
            salvar é o acidente que a distância evita. */}
        <button
          type="submit"
          name="apagar"
          value="sim"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Apagar seção
        </button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

/** Sobe e desce, no formulário mais simples que existe. */
export function BotaoMover({
  secaoId,
  direcao,
  desabilitado,
  acao,
}: {
  secaoId: string;
  direcao: "cima" | "baixo";
  desabilitado: boolean;
  acao: (formData: FormData) => Promise<void>;
}) {
  const Icone = direcao === "cima" ? ChevronUp : ChevronDown;
  return (
    <form action={acao}>
      <input type="hidden" name="secaoId" value={secaoId} />
      <input type="hidden" name="direcao" value={direcao} />
      <button
        type="submit"
        disabled={desabilitado}
        aria-label={direcao === "cima" ? "Mover seção para cima" : "Mover seção para baixo"}
        className="rounded-md p-1 text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icone className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>
    </form>
  );
}

export function ApagarPlanoForm({ planoId, ano }: { planoId: string; ano: number }) {
  const [estado, acao, pendente] = useActionState(apagarPlanoAction, inicial);

  return (
    <div className="border-t border-error/30 pt-5">
      <Eyebrow className="mb-2 !text-error">Excluir este plano</Eyebrow>
      <p className="mb-3 max-w-prose text-[13px] leading-relaxed text-muted">
        Apaga o plano e todas as seções dele.{" "}
        <strong className="text-foreground">Não tem volta.</strong> O plano de um ano é a memória
        do rumo que a comunidade escolheu — normalmente é melhor deixá-lo como rascunho do que
        apagá-lo.
      </p>
      <form action={acao} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="planoId" value={planoId} />
        <input type="hidden" name="ano" value={ano} />
        <div className="w-[220px]">
          <Campo id={`conf-${planoId}`} label={`Digite ${ano} para confirmar`}>
            <input id={`conf-${planoId}`} name="confirmacao" autoComplete="off" className={INPUT_CLASSES} />
          </Campo>
        </div>
        <Button type="submit" disabled={pendente} className="!bg-error hover:!opacity-90 dark:!bg-error">
          <Trash2 className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden />
          {pendente ? "Excluindo..." : "Excluir plano"}
        </Button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </form>
    </div>
  );
}
