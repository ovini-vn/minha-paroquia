"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import {
  acaoNoMembroAction,
  acolherInteressadoAction,
  adicionarMembroAction,
  colarCronogramaAction,
  dispensarInteresseAction,
  editarDadosDoGrupoAction,
  type GrupoActionState,
} from "@/server/actions/grupo-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: GrupoActionState = {};
const rotulo = "text-sm font-medium text-muted";

const EXEMPLO = `06/09/26 — Quem sou eu de verdade?
11/10/26 — Se Joga CDM (Seminário)
Data a definir — Confraternização
06 e 07/03/27 — Encontro da Essência (Seminário)`;

/**
 * Colar o cronograma inteiro de uma vez.
 *
 * A coordenação já tem o cronograma pronto — no cartaz, no Word, no grupo
 * de mensagens. Digitar trinta encontros um por um é o tipo de trabalho que
 * faz desistir da ferramenta antes de ela servir para alguma coisa.
 *
 * Os erros voltam por linha, com o texto da linha, porque "a linha 14 está
 * errada" num texto de trinta linhas obriga a contar.
 */
export function ColarCronogramaForm({ groupId }: { groupId: string }) {
  const [estado, acao, pendente] = useActionState(colarCronogramaAction, inicial);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (estado.ok && campo.current) campo.current.value = "";
  }, [estado]);

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <p className="text-[13.5px] leading-relaxed text-muted">
        Uma linha por encontro: a data, um travessão e o tema. O que estiver entre parênteses no fim vira o
        complemento. Encontros de mais de um dia vão como <em>06 e 07/03/27</em>. Colar de novo não repete o
        que já está no cronograma.
      </p>
      <textarea
        ref={campo}
        name="texto"
        rows={9}
        required
        placeholder={EXEMPLO}
        className={`${INPUT_CLASSES} font-mono text-[13px] leading-relaxed`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Lendo o cronograma…" : "Incluir no cronograma"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
      </div>
      {estado.error && (
        <div className="rounded-lg border border-error/40 bg-error-tint px-3.5 py-3 text-[13.5px] text-foreground">
          <p className="font-semibold text-error">{estado.error}</p>
          {estado.erros && (
            <ul className="mt-2 flex flex-col gap-2">
              {estado.erros.map((e) => (
                <li key={e.linha}>
                  <span className="font-semibold">Linha {e.linha}:</span> <span className="font-mono">{e.texto}</span>
                  <span className="block text-muted">{e.motivo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

/**
 * Pôr alguém no grupo pelo nome completo — o jeito do app de vincular gente
 * sem mostrar a lista da paróquia (ver `findMemberByExactName`).
 */
export function AdicionarMembroForm({ groupId }: { groupId: string }) {
  const [estado, acao, pendente] = useActionState(adicionarMembroAction, inicial);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`nome-${groupId}`} className={rotulo}>
          Nome completo ou e-mail da pessoa no app
        </label>
        <input id={`nome-${groupId}`} name="nome" required autoComplete="off" className={INPUT_CLASSES} />
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-foreground">
        <legend className="sr-only">Papel no grupo</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="papel" value="membro" defaultChecked />
          Participa do grupo
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="papel" value="coordenador" />
          Ajuda a coordenar
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          <UserPlus className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {pendente ? "Procurando…" : "Pôr no grupo"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
      <p className="text-[13px] leading-relaxed text-muted">
        Não existe lista para escolher: o app só acha quem já entrou na paróquia, pelo nome inteiro ou pelo e-mail
        — o e-mail resolve quando há duas pessoas com o mesmo nome. Para quem você não acha, mande o link de
        convite do grupo, logo abaixo.
      </p>
    </form>
  );
}

/** Os botões de cada pessoa do grupo: mudar o papel ou tirar do grupo. */
export function AcoesDoMembro({
  groupId,
  membroId,
  papel,
  ehVoce,
}: {
  groupId: string;
  membroId: string;
  papel: "coordenador" | "membro";
  ehVoce: boolean;
}) {
  const [estado, acao, pendente] = useActionState(acaoNoMembroAction, inicial);
  const botao =
    "alvo-de-toque rounded-md px-2 py-1 text-[13px] text-muted transition-colors hover:text-primary disabled:opacity-50";

  return (
    <form action={acao} className="flex flex-wrap items-center justify-end gap-1">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="membroId" value={membroId} />
      {papel === "membro" ? (
        <button type="submit" name="acao" value="coordenador" disabled={pendente} className={botao}>
          Pôr na coordenação
        </button>
      ) : (
        <button type="submit" name="acao" value="membro" disabled={pendente} className={botao}>
          {ehVoce ? "Sair da coordenação" : "Tirar da coordenação"}
        </button>
      )}
      <button
        type="submit"
        name="acao"
        value="remover"
        disabled={pendente}
        className={`${botao} hover:text-error`}
      >
        {ehVoce ? "Sair do grupo" : "Tirar do grupo"}
      </button>
      {estado.error && <p className="w-full text-right text-[13px] text-error">{estado.error}</p>}
    </form>
  );
}

/** Quem pediu para entrar: acolher, ou tirar da lista. */
export function AcoesDoInteressado({ groupId, userId }: { groupId: string; userId: string }) {
  const [acolhido, acolher, acolhendo] = useActionState(acolherInteressadoAction, inicial);
  const [, dispensar, dispensando] = useActionState(dispensarInteresseAction, inicial);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={acolher}>
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" disabled={acolhendo || dispensando}>
          {acolhendo ? "Acolhendo…" : "Acolher no grupo"}
        </Button>
      </form>
      <form action={dispensar}>
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" variant="ghost" size="sm" disabled={acolhendo || dispensando}>
          Tirar da lista
        </Button>
      </form>
      {acolhido.error && <p className="w-full text-[13px] text-error">{acolhido.error}</p>}
    </div>
  );
}

/** Nome, descrição, coordenação, horário e local — o que o cartão do grupo mostra. */
export function DadosDoGrupoForm({
  groupId,
  valores,
}: {
  groupId: string;
  valores: {
    name: string;
    description: string | null;
    leaderName: string | null;
    meetsWhen: string | null;
    meetsWhere: string | null;
  };
}) {
  const [estado, acao, pendente] = useActionState(editarDadosDoGrupoAction, inicial);

  const campo = (nome: keyof typeof valores, titulo: string, placeholder?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${nome}-${groupId}`} className={rotulo}>
        {titulo}
      </label>
      <input
        id={`${nome}-${groupId}`}
        name={nome}
        required={nome === "name"}
        defaultValue={valores[nome] ?? ""}
        placeholder={placeholder}
        className={INPUT_CLASSES}
      />
    </div>
  );

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      {campo("name", "Nome do grupo")}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`description-${groupId}`} className={rotulo}>
          Sobre o grupo
        </label>
        <textarea
          id={`description-${groupId}`}
          name="description"
          rows={3}
          defaultValue={valores.description ?? ""}
          className={INPUT_CLASSES}
        />
      </div>
      {campo("leaderName", "Coordenação (como aparece para todos)", "Nome de quem coordena")}
      {campo("meetsWhen", "Quando se encontra", "Domingos, às 17h")}
      {campo("meetsWhere", "Onde", "Centro Pastoral")}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        {estado.ok && <p className="text-sm text-success">{estado.ok}</p>}
        {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
