"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, TriangleAlert } from "lucide-react";
import { subscribeToPushAction } from "@/server/actions/push-actions";
import { Button } from "@/components/ui/Button";

/**
 * base64url do padrão VAPID → ArrayBuffer, formato exigido por
 * `pushManager.subscribe`. Devolve o ArrayBuffer em vez do Uint8Array
 * porque a tipagem de BufferSource não aceita um Uint8Array cujo buffer
 * pode ser SharedArrayBuffer.
 */
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

type Estado =
  | { tipo: "verificando" }
  | { tipo: "indisponivel"; motivo: string }
  | { tipo: "bloqueado" }
  | { tipo: "pronto" }
  | { tipo: "ativo" }
  | { tipo: "erro"; mensagem: string };

/**
 * Ativa a notificação que chega com o app fechado.
 *
 * Precisa ser componente de cliente: pedir permissão e registrar o service
 * worker só existe no navegador. O que dá para fazer no servidor (guardar a
 * inscrição) vai por Server Action.
 */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "verificando" });
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    if (!vapidPublicKey) {
      setEstado({ tipo: "indisponivel", motivo: "Notificações não estão configuradas no servidor." });
      return;
    }
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado({
        tipo: "indisponivel",
        motivo:
          "Este navegador não recebe notificações. No iPhone, é preciso adicionar o site à Tela de Início primeiro.",
      });
      return;
    }
    if (Notification.permission === "denied") {
      setEstado({ tipo: "bloqueado" });
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? { tipo: "ativo" } : { tipo: "pronto" }))
      .catch(() => setEstado({ tipo: "pronto" }));
  }, [vapidPublicKey]);

  async function ativar() {
    if (!vapidPublicKey) return;
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado({ tipo: "bloqueado" });
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
      });

      const json = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const formData = new FormData();
      formData.set("endpoint", subscription.endpoint);
      formData.set("p256dh", json.keys?.p256dh ?? "");
      formData.set("auth", json.keys?.auth ?? "");
      formData.set("userAgent", navigator.userAgent);

      startTransition(async () => {
        const resultado = await subscribeToPushAction({}, formData);
        setEstado(resultado.error ? { tipo: "erro", mensagem: resultado.error } : { tipo: "ativo" });
      });
    } catch (error) {
      setEstado({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Não foi possível ativar.",
      });
    }
  }

  if (estado.tipo === "verificando") {
    return <p className="text-[13px] text-muted">Verificando…</p>;
  }

  if (estado.tipo === "indisponivel") {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        {estado.motivo}
      </p>
    );
  }

  if (estado.tipo === "bloqueado") {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        As notificações estão bloqueadas para este site. Libere nas permissões do navegador e
        recarregue a página.
      </p>
    );
  }

  if (estado.tipo === "ativo") {
    return (
      <p className="text-[13px] leading-relaxed text-success">
        Este aparelho vai receber os lembretes, mesmo com o app fechado.
      </p>
    );
  }

  return (
    <div>
      {estado.tipo === "erro" && (
        <p className="mb-2 text-[13px] text-error">{estado.mensagem}</p>
      )}
      <Button type="button" onClick={ativar} disabled={pendente}>
        <BellRing className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        {pendente ? "Ativando…" : "Ativar neste aparelho"}
      </Button>
    </div>
  );
}
