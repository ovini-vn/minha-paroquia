"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type AcaoRapida = {
  id: string;
  label: string;
  /** Ícone já renderizado — função não atravessa a fronteira servidor/cliente. */
  icone: ReactNode;
  /** O formulário de criação, o mesmo componente usado no painel. */
  conteudo: ReactNode;
};

/**
 * Lançar de onde se está olhando.
 *
 * Antes, publicar um aviso enquanto se lia os avisos exigia sair da aba, ir
 * ao painel, achar a seção e voltar. O painel continua sendo a visão
 * completa; ele só deixa de ser o único caminho.
 *
 * O formulário aberto é O MESMO componente do painel, não uma segunda
 * versão dele: dois formulários para a mesma coisa divergem com o tempo, e
 * um deles vira o que ninguém lembra de atualizar.
 *
 * Quem chama é responsável por só passar ações que a pessoa pode fazer —
 * o fiel comum não recebe nenhuma e não vê barra alguma.
 */
export function AcoesRapidas({ acoes }: { acoes: AcaoRapida[] }) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (acoes.length === 0) return null;

  const ativa = acoes.find((a) => a.id === aberta);

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        {acoes.map((acao) => {
          const estaAberta = acao.id === aberta;
          return (
            <button
              key={acao.id}
              type="button"
              onClick={() => setAberta(estaAberta ? null : acao.id)}
              aria-expanded={estaAberta}
              className={
                estaAberta
                  ? "inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors dark:bg-primary-light"
                  : "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-primary hover:bg-primary-tint"
              }
            >
              {estaAberta ? (
                <X className="h-[15px] w-[15px]" strokeWidth={1.5} aria-hidden />
              ) : (
                <Plus className="h-[15px] w-[15px]" strokeWidth={1.5} aria-hidden />
              )}
              {acao.label}
            </button>
          );
        })}
      </div>

      {ativa && (
        <Card className="mt-3">
          <div className="mb-3 flex items-center gap-2 text-muted">
            {ativa.icone}
            <p className="text-[13px] font-medium">{ativa.label}</p>
          </div>
          {ativa.conteudo}
        </Card>
      )}
    </div>
  );
}
