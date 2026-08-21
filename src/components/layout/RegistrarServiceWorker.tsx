"use client";

import { useEffect } from "react";

/**
 * Registra o service worker assim que o app abre.
 *
 * Antes ele só era registrado quando a pessoa ativava a notificação, e isso
 * era tarde demais: o navegador decide se oferece "instalar o app" olhando
 * se JÁ existe um service worker. Sem isso, no iPhone a pessoa nunca chega
 * a instalar — e sem instalar, nunca recebe o lembrete.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Falhar aqui não pode quebrar nada: sem service worker o app funciona
    // normalmente, só não instala nem avisa com a tela fechada.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
