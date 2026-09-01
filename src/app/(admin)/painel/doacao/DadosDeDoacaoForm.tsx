"use client";

import { useActionState, useState } from "react";
import { salvarDadosDeDoacaoAction, type DoacaoState } from "@/server/actions/doacao-actions";
import { Button } from "@/components/ui/Button";
import { TIPOS_DE_CHAVE_PIX } from "@/lib/pix";

const initialState: DoacaoState = {};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export type DadosDeDoacao = {
  cnpj: string;
  email: string;
  pixKey: string;
  pixKeyType: string;
  pixPayload: string;
  dizimoAtivo: boolean;
  dizimoTitulo: string;
  dizimoTexto: string;
  dizimoCtaLabel: string;
  dizimoCtaTipo: string;
  dizimoCtaValor: string;
};

export function DadosDeDoacaoForm({ dados }: { dados: DadosDeDoacao }) {
  const [state, formAction, pending] = useActionState(salvarDadosDeDoacaoAction, initialState);
  // Controlados, e não defaultValue: depois de salvar, o componente
  // re-renderiza e um <select> não controlado volta a mostrar "Escolha…"
  // mesmo com o tipo já gravado — e aí o próximo salvamento é recusado
  // dizendo que falta escolher o tipo.
  const [tipoDaChave, setTipoDaChave] = useState(dados.pixKeyType);
  const [ctaTipo, setCtaTipo] = useState(dados.dizimoCtaTipo);

  const ajudaDoCta =
    ctaTipo === "whatsapp"
      ? "Número com DDD de quem atende a Pastoral do Dízimo."
      : ctaTipo === "link"
        ? "Endereço completo do formulário ou página, começando com https://"
        : ctaTipo === "interno"
          ? "Leva o fiel ao registro de dízimo dentro do aplicativo. Não precisa preencher nada abaixo."
          : "Sem destino escolhido, o botão não aparece para o fiel.";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <p className="font-serif text-lg font-semibold text-foreground">Identificação</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doacao-cnpj" className="text-sm font-medium text-muted">
              CNPJ
            </label>
            <input
              id="doacao-cnpj"
              name="cnpj"
              defaultValue={dados.cnpj}
              placeholder="00.000.000/0000-00"
              className={campo}
            />
            <p className="text-[12px] text-muted">
              Aparece na tela de Ofertar, para o fiel conferir a quem está ofertando.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doacao-email" className="text-sm font-medium text-muted">
              E-mail da paróquia
            </label>
            <input
              id="doacao-email"
              name="email"
              type="email"
              defaultValue={dados.email}
              className={campo}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <p className="font-serif text-lg font-semibold text-foreground">Chave PIX</p>

        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doacao-tipo" className="text-sm font-medium text-muted">
              Tipo da chave
            </label>
            <select
              id="doacao-tipo"
              name="pixKeyType"
              value={tipoDaChave}
              onChange={(e) => setTipoDaChave(e.target.value)}
              className={campo}
            >
              <option value="">Escolha…</option>
              {TIPOS_DE_CHAVE_PIX.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doacao-chave" className="text-sm font-medium text-muted">
              Chave
            </label>
            <input id="doacao-chave" name="pixKey" defaultValue={dados.pixKey} className={campo} />
            <p className="text-[12px] text-muted">
              Conferimos o formato antes de salvar. Em branco, a área de oferta não aparece para o
              fiel.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="doacao-payload" className="text-sm font-medium text-muted">
            PIX Copia e Cola (opcional)
          </label>
          <textarea
            id="doacao-payload"
            name="pixPayload"
            rows={4}
            defaultValue={dados.pixPayload}
            placeholder="00020126…"
            className={`${campo} font-mono text-[12px] leading-relaxed`}
          />
          {/* O código não é montado por nós de propósito: payload de
              pagamento errado manda dinheiro para o lugar errado. */}
          <p className="text-[12px] leading-relaxed text-muted">
            Gere no aplicativo do banco da paróquia e cole aqui. Nós não montamos esse código — ele
            precisa vir do banco para o pagamento cair na conta certa.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <p className="font-serif text-lg font-semibold text-foreground">Pastoral do Dízimo</p>
        <p className="text-[12.5px] leading-relaxed text-muted">
          Dízimo não é oferta avulsa: é compromisso contínuo, acompanhado pela pastoral. Esta seção convida
          o fiel a conversar com alguém — não abre um pagamento.
        </p>

        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            name="dizimoAtivo"
            defaultChecked={dados.dizimoAtivo}
            className="h-4 w-4 rounded border-border"
          />
          Mostrar o convite ao dízimo na tela de Ofertar
        </label>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dizimo-titulo" className="text-sm font-medium text-muted">
            Título
          </label>
          <input
            id="dizimo-titulo"
            name="dizimoTitulo"
            defaultValue={dados.dizimoTitulo}
            placeholder="Seja dizimista da nossa comunidade"
            className={campo}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dizimo-texto" className="text-sm font-medium text-muted">
            Texto do convite
          </label>
          <textarea
            id="dizimo-texto"
            name="dizimoTexto"
            rows={4}
            defaultValue={dados.dizimoTexto}
            placeholder="O dízimo é uma expressão de gratidão a Deus…"
            className={campo}
          />
          <p className="text-[12px] text-muted">Em branco, usamos um texto padrão.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dizimo-cta-tipo" className="text-sm font-medium text-muted">
              Para onde o botão leva
            </label>
            <select
              id="dizimo-cta-tipo"
              name="dizimoCtaTipo"
              value={ctaTipo}
              onChange={(e) => setCtaTipo(e.target.value)}
              className={campo}
            >
              <option value="">Não mostrar botão</option>
              <option value="whatsapp">WhatsApp da pastoral</option>
              <option value="link">Link externo</option>
              <option value="interno">Meu dízimo, no aplicativo</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dizimo-cta-valor" className="text-sm font-medium text-muted">
              Destino
            </label>
            <input
              id="dizimo-cta-valor"
              name="dizimoCtaValor"
              defaultValue={dados.dizimoCtaValor}
              disabled={ctaTipo === "interno" || ctaTipo === ""}
              className={`${campo} disabled:opacity-50`}
            />
            <p className="text-[12px] leading-relaxed text-muted">{ajudaDoCta}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dizimo-cta-label" className="text-sm font-medium text-muted">
            Texto do botão
          </label>
          <input
            id="dizimo-cta-label"
            name="dizimoCtaLabel"
            defaultValue={dados.dizimoCtaLabel}
            placeholder="Quero ser dizimista"
            className={campo}
          />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      </div>
    </form>
  );
}
