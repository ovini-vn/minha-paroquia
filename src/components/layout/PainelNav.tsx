"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { GRUPOS_DO_PAINEL, ITENS_DO_PAINEL, itemAtivoDoPainel } from "./painel-items";

/**
 * A barra lateral do painel, no computador.
 *
 * O problema que ela resolve foi medido: o índice do painel tem 5.248px de
 * altura — 8,8 telas — com 22 destinos e nenhuma navegação permanente. Ir
 * de Financeiro para Membros custava voltar ao índice, rolar e procurar. A
 * secretaria faz esse caminho dezenas de vezes numa manhã.
 *
 * SÓ no computador (`lg:`). No celular a navegação por índice está certa:
 * uma barra lateral de 22 destinos numa tela de 390px comeria o conteúdo, e
 * quem usa o telefone entra para fazer uma coisa e sair, não para passar a
 * manhã. A medida de "computador" é a mesma do resto do app.
 *
 * Não é `position: fixed` de propósito. `sticky` dentro da grade deixa a
 * barra acompanhar a rolagem sem sair do fluxo — com `fixed` seria preciso
 * reservar a largura à mão no conteúdo, e as duas medidas sairiam do lugar
 * na primeira vez que alguém mudasse uma delas.
 *
 * RECEBE ENDEREÇOS, e não os itens inteiros. O ícone de cada destino é um componente — uma função —, e função não
 * atravessa a fronteira do servidor para o cliente: o React não tem como
 * serializar. Passar `ItemDoPainel[]` derrubava o painel inteiro com
 * "Functions cannot be passed directly to Client Components". Visto na
 * tela, não deduzido.
 *
 * Mandando só os caminhos permitidos, o ícone nunca cruza a fronteira: a
 * lista já vive deste lado, e aqui só se decide o que dela mostrar.
 */
export function PainelNav({ permitidos }: { permitidos: string[] }) {
  const pathname = usePathname();
  const ativo = itemAtivoDoPainel(pathname);
  const liberados = new Set(permitidos);
  const itens = ITENS_DO_PAINEL.filter((item) => liberados.has(item.href));

  return (
    <nav
      aria-label="Áreas do painel"
      /*
        Rola por dentro, porque não cabe.
        Medido: 21 destinos dão 907px de barra, e um notebook comum tem
        599px de janela. Sem isto, o grupo "Acessos" ficava abaixo da
        dobra e inalcançável enquanto a barra estivesse grudada — existia
        e não dava para clicar.
        O topo é 88px: o cabeçalho mede 69, e 76 deixava a barra
        encostada nele.
      */
      className="hidden lg:sticky lg:top-[88px] lg:block lg:max-h-[calc(100dvh-108px)] lg:w-[212px] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
    >
      {GRUPOS_DO_PAINEL.map((grupo) => {
        const doGrupo = itens.filter((item) => item.grupo === grupo);
        // Grupo inteiro invisível para quem não tem as permissões dele: o
        // título sozinho anunciaria uma área que a pessoa não pode abrir.
        if (doGrupo.length === 0) return null;

        return (
          <div key={grupo} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
              {grupo}
            </p>
            <ul className="flex flex-col gap-0.5">
              {doGrupo.map((item) => {
                const aberto = ativo?.href === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={aberto ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] leading-tight transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-sunken",
                        aberto
                          ? "bg-primary-tint font-semibold text-primary"
                          : "font-medium text-foreground hover:bg-surface",
                      )}
                    >
                      <Icon
                        className="h-[17px] w-[17px] shrink-0"
                        strokeWidth={aberto ? 2 : 1.5}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {/*
                        O aviso de que este destino sai do painel.
                        Sem ele, a barra simplesmente some ao clicar em
                        Catequese — e sumiço sem explicação se lê como
                        defeito, não como "você mudou de área".
                      */}
                      {item.saiDoPainel && (
                        <>
                          <ExternalLink
                            className="h-3.5 w-3.5 shrink-0 text-muted"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          <span className="sr-only"> — abre fora do painel</span>
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
