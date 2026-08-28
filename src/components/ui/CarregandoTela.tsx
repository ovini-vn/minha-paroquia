import { Esqueleto } from "@/components/ui/Esqueleto";

/**
 * Silhueta de uma tela enquanto ela é montada no servidor.
 *
 * Existe porque sem `loading.tsx` a navegação parece travada: o toque não
 * produz efeito nenhum até a tela inteira chegar, e num celular em rede
 * ruim são segundos de nada acontecendo — tempo suficiente para a pessoa
 * tocar de novo achando que falhou.
 *
 * ATENÇÃO ao decidir ONDE colocar um `loading.tsx`. Ele faz o segmento (e
 * tudo abaixo dele) ser transmitido em fluxo, e aí o cabeçalho HTTP sai
 * como 200 ANTES de a página poder chamar `notFound()`. O resultado é uma
 * página de "não existe" respondendo 200 — a tela certa com o status
 * errado. Medido: /biblia/joao/999 devolvia 404 sem esta fronteira e 200
 * com ela.
 *
 * Por isso só existe fronteira de carregamento em rotas SEM `notFound()`
 * abaixo. Todas as que usam `notFound()` são páginas de detalhe com
 * segmento dinâmico — não coloque um `loading.tsx` acima delas.
 */
export function CarregandoTela() {
  return (
    <div className="flex flex-col gap-4 py-2" role="status" aria-label="Carregando">
      <Esqueleto className="h-7 w-1/2" />
      <Esqueleto className="h-[120px] w-full" />
      <Esqueleto className="h-[74px] w-full" />
      <Esqueleto className="h-[74px] w-full" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
