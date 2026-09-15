"use client";

import { useEffect, useState } from "react";
import { Mic, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Estado = "verificando" | "indisponivel" | "bloqueado" | "pronto" | "liberado" | "pedindo";

/**
 * Libera o microfone deste aparelho para o Terço com a voz.
 *
 * Pedir aqui, com calma, e não só na hora de rezar: no carro, a janela do
 * navegador pedindo permissão é mais uma coisa para tocar. O pedido abre o
 * microfone por um instante e fecha na hora — não grava nada; serve só para
 * o navegador guardar o "Permitir" para este site.
 *
 * O mesmo componente mora no onboarding e na tela do Terço com a voz.
 */
export function PermitirMicrofone() {
  const [estado, setEstado] = useState<Estado>("verificando");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const reconheceVoz = Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    if (!navigator.mediaDevices?.getUserMedia || !reconheceVoz) {
      setEstado("indisponivel");
      return;
    }
    // A consulta de permissão não existe em todo navegador; sem ela, oferece o botão.
    const permissoes = navigator.permissions as
      | { query: (d: { name: string }) => Promise<{ state: string }> }
      | undefined;
    if (!permissoes?.query) {
      setEstado("pronto");
      return;
    }
    permissoes
      .query({ name: "microphone" })
      .then((p) => setEstado(p.state === "granted" ? "liberado" : p.state === "denied" ? "bloqueado" : "pronto"))
      .catch(() => setEstado("pronto"));
  }, []);

  async function pedir() {
    setEstado("pedindo");
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxo.getTracks().forEach((faixa) => faixa.stop());
      setEstado("liberado");
    } catch (erro) {
      const nome = erro instanceof DOMException ? erro.name : "";
      setEstado(nome === "NotAllowedError" || nome === "SecurityError" ? "bloqueado" : "indisponivel");
    }
  }

  if (estado === "verificando") return <p className="text-[13px] text-muted">Verificando…</p>;

  if (estado === "indisponivel") {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        Este navegador não reconhece voz. No Android, abra o aplicativo pelo Chrome; no iPhone, pelo Safari. Link aberto
        dentro do WhatsApp ou do Instagram também não funciona.
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <div className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" strokeWidth={1.5} aria-hidden />
        <div>
          <p className="text-foreground">O microfone está bloqueado para este site.</p>
          <p className="mt-1">
            <strong className="font-semibold">Android (Chrome):</strong> toque no ícone à esquerda do endereço ›
            Permissões › Microfone › Permitir. No aplicativo instalado, o caminho é Chrome › Configurações ›
            Configurações do site › Microfone.
          </p>
          <p className="mt-1">
            <strong className="font-semibold">iPhone (Safari):</strong> toque em “aA” ao lado do endereço ›
            Ajustes do Site › Microfone › Permitir.
          </p>
          <p className="mt-1">Depois, recarregue a página.</p>
        </div>
      </div>
    );
  }

  if (estado === "liberado") {
    return (
      <p className="flex items-center gap-2 text-[13.5px] leading-relaxed text-success">
        <Mic className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
        Microfone liberado neste aparelho.
      </p>
    );
  }

  return (
    <Button type="button" onClick={pedir} disabled={estado === "pedindo"}>
      <Mic className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
      {estado === "pedindo" ? "Aguardando…" : "Permitir o microfone"}
    </Button>
  );
}
