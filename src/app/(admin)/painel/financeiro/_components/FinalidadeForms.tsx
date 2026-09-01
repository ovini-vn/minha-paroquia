"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  criarFinalidadeAction,
  editarFinalidadeAction,
  type ActionState,
} from "@/server/actions/contribuicao-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: ActionState = {};

/**
 * O aviso do dízimo, escrito onde a escolha é feita.
 *
 * Marcar uma finalidade como "é o dízimo" tem consequência fora desta tela:
 * uma contribuição confirmada nela marca a participação do período na
 * Pastoral do Dízimo. Quem marca precisa saber disso na hora de marcar, e
 * não descobrir depois pelo efeito.
 */
function AvisoDoDizimo() {
  return (
    <p className="text-[12px] leading-relaxed text-muted">
      Marcando esta opção, quem contribuir nesta finalidade passa a constar como dizimista do mês
      na Pastoral do Dízimo — sem valor, só a participação. Só uma finalidade pode ser a do dízimo.
    </p>
  );
}

function Campos({
  prefixo,
  nome,
  descricao,
  ehDizimo,
}: {
  prefixo: string;
  nome?: string;
  descricao?: string | null;
  ehDizimo?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefixo}-nome`} className="text-sm font-medium text-muted">
          Nome
        </label>
        <input
          id={`${prefixo}-nome`}
          name="nome"
          required
          defaultValue={nome}
          placeholder="Ex.: Dízimo, Coleta, Catequese, Festa da Padroeira"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefixo}-descricao`} className="text-sm font-medium text-muted">
          Uma frase de explicação (opcional)
        </label>
        <input
          id={`${prefixo}-descricao`}
          name="descricao"
          defaultValue={descricao ?? ""}
          placeholder="Aparece abaixo do nome, na tela de quem contribui"
          className={INPUT_CLASSES}
        />
      </div>

      <label className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-foreground">
        <input
          type="checkbox"
          name="ehDizimo"
          value="sim"
          defaultChecked={ehDizimo}
          className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-primary))]"
        />
        <span>
          Esta é a finalidade do <strong>dízimo</strong>
          <AvisoDoDizimo />
        </span>
      </label>
    </>
  );
}

export function CriarFinalidadeForm() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(criarFinalidadeAction, inicial);

  if (!aberto) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
        Nova finalidade
      </Button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3.5 rounded-lg bg-sunken p-3.5">
      <Campos prefixo="nova" />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Criando..." : "Criar finalidade"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

export function EditarFinalidadeForm({
  finalidadeId,
  nome,
  descricao,
  ehDizimo,
  ativa,
}: {
  finalidadeId: string;
  nome: string;
  descricao: string | null;
  ehDizimo: boolean;
  ativa: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(editarFinalidadeAction, inicial);

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
      <input type="hidden" name="finalidadeId" value={finalidadeId} />
      <Campos prefixo={finalidadeId} nome={nome} descricao={descricao} ehDizimo={ehDizimo} />

      {/*
        Desativar, e não apagar. Uma finalidade encerrada continua sendo a
        verdade das contribuições que já entraram nela — apagá-la deixaria o
        histórico sem nome.
      */}
      <label className="flex items-center gap-2.5 text-[13.5px] text-foreground">
        <input
          type="checkbox"
          name="ativa"
          value="sim"
          defaultChecked={ativa}
          className="h-4 w-4 accent-[rgb(var(--color-primary))]"
        />
        Oferecer esta finalidade a quem contribui
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
