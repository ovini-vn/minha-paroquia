import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2 } from "lucide-react";
import { acaoDeItemDoacaoAction } from "@/server/actions/doacao-actions";
import { Badge } from "@/components/ui/Badge";

/**
 * Os botões de ordenar, ligar/desligar e apagar de cada item.
 *
 * Subir/descer em vez de arrastar-e-soltar: não há biblioteca de dnd no
 * projeto, e botão funciona no celular, no teclado e com leitor de tela —
 * que é onde arrastar costuma falhar.
 *
 * Cada botão é um formulário próprio com Server Action: sem JavaScript no
 * cliente, e o estado volta do servidor já correto.
 */
export function AcoesDoItem({
  tabela,
  id,
  ativo,
  primeiro,
  ultimo,
}: {
  tabela: "finalidade" | "iniciativa";
  id: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const botao =
    "grid h-8 w-8 place-items-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Acao tabela={tabela} id={id} acao="cima">
        <button type="submit" disabled={primeiro} className={botao} aria-label="Mover para cima">
          <ChevronUp className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
      </Acao>

      <Acao tabela={tabela} id={id} acao="baixo">
        <button type="submit" disabled={ultimo} className={botao} aria-label="Mover para baixo">
          <ChevronDown className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
      </Acao>

      <Acao tabela={tabela} id={id} acao={ativo ? "desativar" : "ativar"}>
        <button
          type="submit"
          className={botao}
          aria-label={ativo ? "Ocultar do fiel" : "Mostrar para o fiel"}
        >
          {ativo ? (
            <Eye className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          ) : (
            <EyeOff className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          )}
        </button>
      </Acao>

      <Acao tabela={tabela} id={id} acao="excluir">
        <button
          type="submit"
          className={`${botao} hover:border-red-500 hover:text-red-600`}
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        </button>
      </Acao>
    </div>
  );
}

function Acao({
  tabela,
  id,
  acao,
  children,
}: {
  tabela: string;
  id: string;
  acao: string;
  children: React.ReactNode;
}) {
  return (
    <form action={acaoDeItemDoacaoAction}>
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value={acao} />
      {children}
    </form>
  );
}

/** Etiqueta de "o fiel não está vendo isto" — some quando o item está ativo. */
export function EtiquetaOculto({ ativo }: { ativo: boolean }) {
  if (ativo) return null;
  return <Badge tone="muted">Oculto</Badge>;
}
