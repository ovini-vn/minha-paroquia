"use client";

import { useActionState, useState } from "react";
import { Trash2, UserPen } from "lucide-react";
import {
  editarTurmaAction,
  apagarTurmaAction,
  definirCatequistaAction,
  type ActionState,
} from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { Eyebrow } from "@/components/ui/Typography";

const initialState: ActionState = {};

type Catequista = { id: string; fullName: string };

/**
 * Editar a turma, trocar a catequista e — no fim, separado — excluir.
 *
 * A exclusão fica visualmente afastada e pede o NOME DIGITADO. Não é
 * "tem certeza?", que se clica no automático: digitar o nome obriga a
 * pessoa a ter olhado qual turma está apagando, e é o único jeito de a
 * confirmação significar alguma coisa.
 */
export function GestaoDaTurma({
  groupId,
  nome,
  ano,
  catequistas,
  catechistUserId,
  catechistName,
}: {
  groupId: string;
  nome: string;
  ano: number;
  /** Membros da paróquia com o papel de catequista. */
  catequistas: Catequista[];
  catechistUserId: string | null;
  catechistName: string | null;
}) {
  const [estadoEdicao, editar, editando] = useActionState(editarTurmaAction, initialState);
  const [estadoExclusao, apagar, apagando] = useActionState(apagarTurmaAction, initialState);

  /*
   * Uma catequista por turma, e duas formas de dizer quem é: a conta do app
   * ou o nome digitado. O seletor decide qual formulário aparece — mandar os
   * dois campos preenchidos seria a receita para o banco recusar (é CHECK) e
   * para a tela ter de escolher qual mostrar.
   */
  const [semApp, setSemApp] = useState(Boolean(catechistName));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Eyebrow className="mb-3">Dados da turma</Eyebrow>
        <form action={editar} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="groupId" value={groupId} />
          <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
            <label htmlFor="turma-nome" className="text-sm font-medium text-muted">
              Nome
            </label>
            <input
              id="turma-nome"
              name="name"
              required
              defaultValue={nome}
              className={INPUT_CLASSES}
            />
          </div>
          <div className="flex w-[110px] flex-col gap-1.5">
            <label htmlFor="turma-ano" className="text-sm font-medium text-muted">
              Ano
            </label>
            <input
              id="turma-ano"
              name="year"
              type="number"
              required
              defaultValue={ano}
              className={INPUT_CLASSES}
            />
          </div>
          <Button type="submit" disabled={editando}>
            {editando ? "Salvando..." : "Salvar"}
          </Button>
          {estadoEdicao.error && (
            <p className="w-full text-sm text-error">{estadoEdicao.error}</p>
          )}
        </form>
      </div>

      <div>
        <Eyebrow className="mb-3">Catequista</Eyebrow>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSemApp(false)}
            aria-pressed={!semApp}
            className={
              !semApp
                ? "rounded-full border border-primary bg-primary px-3.5 py-2 text-[13px] font-semibold text-white dark:bg-primary-light"
                : "rounded-full border border-border-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-primary"
            }
          >
            Já usa o app
          </button>
          <button
            type="button"
            onClick={() => setSemApp(true)}
            aria-pressed={semApp}
            className={
              semApp
                ? "rounded-full border border-primary bg-primary px-3.5 py-2 text-[13px] font-semibold text-white dark:bg-primary-light"
                : "rounded-full border border-border-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-primary"
            }
          >
            Ainda não usa
          </button>
        </div>

        <form action={definirCatequistaAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="groupId" value={groupId} />

          {semApp ? (
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label htmlFor="cat-nome" className="text-sm font-medium text-muted">
                Nome da catequista
              </label>
              <input
                id="cat-nome"
                name="catechistName"
                defaultValue={catechistName ?? ""}
                className={INPUT_CLASSES}
                placeholder="Ex.: Ana Lúcia Moreira"
              />
            </div>
          ) : (
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label htmlFor="cat-conta" className="text-sm font-medium text-muted">
                Quem já tem conta
              </label>
              <select
                id="cat-conta"
                name="catechistUserId"
                defaultValue={catechistUserId ?? ""}
                className={INPUT_CLASSES}
              >
                <option value="">Sem catequista</option>
                {catequistas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" variant="ghost">
            <UserPen className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Definir
          </Button>
        </form>

        {catechistName && (
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
            {catechistName} ainda não usa o aplicativo, então não consegue lançar chamada. Quando
            ela se cadastrar, troque para <strong className="text-foreground">Já usa o app</strong> —
            o histórico da turma continua o mesmo.
          </p>
        )}
      </div>

      {/*
        A exclusão fica no fim e afastada. Não é uma ação que se procura, é
        uma que se encontra quando já se decidiu.
      */}
      <div className="border-t border-error/30 pt-5">
        <Eyebrow className="mb-2 !text-error">Excluir a turma</Eyebrow>
        <p className="mb-3 max-w-prose text-[13px] leading-relaxed text-muted">
          Apaga a turma, as matrículas, os encontros, as chamadas e os ritos dela.{" "}
          <strong className="text-foreground">Não tem volta.</strong> O cadastro dos catequizandos
          continua na paróquia, e os sacramentos já registrados também.
        </p>

        <form action={apagar} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="nomeDaTurma" value={nome} />
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label htmlFor="confirmacao" className="text-sm font-medium text-muted">
              Digite <strong className="text-foreground">{nome}</strong> para confirmar
            </label>
            <input id="confirmacao" name="confirmacao" className={INPUT_CLASSES} autoComplete="off" />
          </div>
          <Button
            type="submit"
            disabled={apagando}
            className="!bg-error hover:!opacity-90 dark:!bg-error"
          >
            <Trash2 className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden />
            {apagando ? "Excluindo..." : "Excluir turma"}
          </Button>
          {estadoExclusao.error && (
            <p className="w-full text-sm text-error">{estadoExclusao.error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
