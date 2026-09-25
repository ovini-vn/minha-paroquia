"use client";

import { useActionState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import type { IntencaoState } from "@/server/actions/intencao-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

export type OpcaoDeMissa = { id: string; rotulo: string };
export type OpcaoDeTipo = { valor: string; rotulo: string };

/**
 * O mesmo formulário serve ao fiel (pedido) e ao balcão (registro).
 *
 * No balcão há um campo a mais — o nome de quem pediu, para a secretaria
 * saber a quem avisar. E nenhum dos dois tem campo de valor: intenção de
 * missa não tem preço.
 */
export function PedirIntencaoForm({
  acao,
  missas,
  tipos,
  balcao = false,
  rotuloDoBotao,
}: {
  acao: (prev: IntencaoState, formData: FormData) => Promise<IntencaoState>;
  missas: OpcaoDeMissa[];
  tipos: OpcaoDeTipo[];
  balcao?: boolean;
  rotuloDoBotao: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const form = useRef<HTMLFormElement>(null);

  // Depois de enviar, limpa o texto e deixa a missa escolhida: no balcão é
  // comum registrar várias intenções seguidas para a mesma missa.
  useEffect(() => {
    if (estado.ok && form.current) {
      const texto = form.current.elements.namedItem("texto") as HTMLTextAreaElement | null;
      const nome = form.current.elements.namedItem("pedidoPorNome") as HTMLInputElement | null;
      if (texto) texto.value = "";
      if (nome) nome.value = "";
    }
  }, [estado]);

  if (missas.length === 0) {
    return (
      <p className="text-[13.5px] text-muted">
        Nenhuma missa marcada nos próximos dias. Assim que a paróquia publicar os horários, você pode pedir aqui.
      </p>
    );
  }

  const prefixo = balcao ? "balcao" : "pedido";

  return (
    <form ref={form} action={enviar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefixo}-missa`} className="text-xs font-medium text-muted">
          Em qual missa
        </label>
        <select id={`${prefixo}-missa`} name="celebrationId" required className={INPUT_CLASSES}>
          {missas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefixo}-tipo`} className="text-xs font-medium text-muted">
          Intenção
        </label>
        <select id={`${prefixo}-tipo`} name="tipo" required defaultValue="sufragio" className={INPUT_CLASSES}>
          {tipos.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefixo}-texto`} className="text-xs font-medium text-muted">
          Por quem, ou pelo quê
        </label>
        <textarea
          id={`${prefixo}-texto`}
          name="texto"
          required
          minLength={3}
          maxLength={200}
          rows={2}
          placeholder="Maria das Graças Souza"
          className={INPUT_CLASSES}
        />
        <p className="text-[12px] text-muted">Escreva como deve ser lido na missa.</p>
      </div>

      {balcao && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="balcao-nome" className="text-xs font-medium text-muted">
            Quem pediu (opcional)
          </label>
          <input id="balcao-nome" name="pedidoPorNome" maxLength={120} className={INPUT_CLASSES} />
        </div>
      )}

      <div>
        <Button type="submit" size="sm" disabled={enviando}>
          <Send className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          {enviando ? "Enviando..." : rotuloDoBotao}
        </Button>
      </div>
      {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-primary">{estado.ok}</p>}
    </form>
  );
}
