"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
      }}
    >
      <Copy className="h-4 w-4" strokeWidth={1.6} aria-hidden />
      {copiado ? "Copiado" : "Copiar o link"}
    </Button>
  );
}
