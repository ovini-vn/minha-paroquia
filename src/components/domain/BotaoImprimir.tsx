"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Manda o navegador imprimir a página.
 *
 * Cliente por um motivo só: `window.print()` não existe no servidor. Fica
 * num componente próprio para a página da certidão continuar sendo um
 * Server Component — ela lê o banco, e nada nela precisa de JavaScript além
 * deste botão.
 *
 * "Imprimir" e não "Baixar PDF": o diálogo do navegador oferece as duas
 * coisas, e prometer PDF num botão que abre a caixa de impressão faz a
 * pessoa achar que clicou errado.
 */
export function BotaoImprimir({ rotulo = "Imprimir" }: { rotulo?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
      {rotulo}
    </Button>
  );
}
