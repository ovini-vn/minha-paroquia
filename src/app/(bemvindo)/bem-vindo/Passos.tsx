"use client";

import { useState, useTransition } from "react";
import { ArrowRight, BellRing, Check, Eye, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Symbol } from "@/components/brand/Symbol";
import { PushToggle } from "@/components/domain/PushToggle";
import { EscolhaDeAparencia } from "@/components/domain/EscolhaDeAparencia";
import type { FontScale, ThemePreference } from "@prisma/client";
import { concluirBoasVindasAction, entrarNaPastoralAction } from "@/server/actions/onboarding-actions";

type Pastoral = { id: string; name: string; description: string | null };

const TOTAL = 4;

/**
 * Boas-vindas em quatro passos.
 *
 * Existe porque o convite entregava alguém numa tela e o app não pedia
 * nada: nem explicava o que era, nem oferecia o aviso no celular, nem
 * perguntava como a pessoa queria participar. O minuto seguinte ao convite
 * é o de maior disposição que vai existir, e estava sendo desperdiçado.
 *
 * Nenhum passo é obrigatório. "Agora não" avança igual — prender alguém
 * numa tela de cadastro é o jeito mais rápido de perder a pessoa logo no
 * começo.
 */
export function Passos({
  primeiroNome,
  parishName,
  vapidPublicKey,
  pastorais,
  fontScale,
  themePreference,
  nomeDoTempo,
}: {
  primeiroNome: string;
  parishName: string;
  vapidPublicKey: string | null;
  pastorais: Pastoral[];
  fontScale: FontScale;
  themePreference: ThemePreference;
  nomeDoTempo: string;
}) {
  const [passo, setPasso] = useState(1);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function concluir() {
    startTransition(async () => {
      if (escolhida) await entrarNaPastoralAction(escolhida);
      await concluirBoasVindasAction();
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Progresso: três traços, não uma barra — a pessoa vê quanto falta
          de relance e sabe que é curto. */}
      <div className="flex gap-1.5 px-[18px] pt-6" aria-hidden>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passo ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="px-[18px] pt-2 text-[11px] font-semibold uppercase tracking-eyebrow text-muted">
        Passo {passo} de {TOTAL}
      </p>

      <div className="flex flex-1 flex-col px-[18px] pb-8 pt-6">
        {passo === 1 && (
          <div className="flex flex-1 flex-col">
            <Symbol className="h-14 w-auto text-primary" />
            <h1 className="mt-5 font-serif text-[30px] font-semibold leading-tight text-foreground">
              Bem-vindo, {primeiroNome}.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Você agora faz parte da <span className="text-foreground">{parishName}</span> aqui
              também.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Neste app você acompanha os horários das missas, recebe os avisos da secretaria, pede
              oração, e encontra onde servir na comunidade.
            </p>
            <div className="rule-gold my-7" />
            <p className="text-[13.5px] leading-relaxed text-muted">
              São três perguntas rápidas e você já entra.
            </p>

            <div className="mt-auto pt-8">
              <Button type="button" onClick={() => setPasso(2)} className="w-full">
                Começar
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="flex flex-1 flex-col">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-tint text-primary">
              <Eye className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <h1 className="mt-5 font-serif text-[27px] font-semibold leading-tight text-foreground">
              Você consegue ler bem?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Se a letra estiver pequena, aumente agora — as telas seguintes já vêm no tamanho que
              você escolher. Dá para mudar quando quiser, em Eu › Aparência.
            </p>

            <div className="mt-6">
              <EscolhaDeAparencia
                fontScale={fontScale}
                themePreference={themePreference}
                nomeDoTempo={nomeDoTempo}
              />
            </div>

            <div className="mt-auto pt-8">
              <Button type="button" onClick={() => setPasso(3)} className="w-full">
                Continuar
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
        )}


        {passo === 3 && (
          <div className="flex flex-1 flex-col">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold/15 text-[#8a6b24] dark:text-gold">
              <BellRing className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <h1 className="mt-5 font-serif text-[27px] font-semibold leading-tight text-foreground">
              Quer ser avisado?
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Mudança no horário da missa, aviso da secretaria, e lembrete do que você se
              comprometeu a fazer — direto no celular, sem precisar abrir o app.
            </p>

            <div className="mt-6">
              <PushToggle vapidPublicKey={vapidPublicKey} />
            </div>

            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              Você escolhe depois quais avisos quer receber, em Eu → Notificações.
            </p>

            <div className="mt-auto flex flex-col gap-2 pt-8">
              <Button type="button" onClick={() => setPasso(4)} className="w-full">
                Continuar
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {passo === 4 && (
          <div className="flex flex-1 flex-col">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-tint text-primary">
              <HeartHandshake className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <h1 className="mt-5 font-serif text-[27px] font-semibold leading-tight text-foreground">
              Onde você quer estar?
            </h1>

            {pastorais.length > 0 ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Se alguma pastoral chamar sua atenção, toque nela. O coordenador vai receber seu
                  contato e procurar você — sem compromisso nenhum.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  {pastorais.map((pastoral) => {
                    const ativa = escolhida === pastoral.id;
                    return (
                      <button
                        key={pastoral.id}
                        type="button"
                        onClick={() => setEscolhida(ativa ? null : pastoral.id)}
                        aria-pressed={ativa}
                        className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                          ativa
                            ? "border-primary bg-primary-tint"
                            : "border-border bg-surface hover:border-border-strong"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                            ativa ? "border-primary bg-primary text-white" : "border-border-strong"
                          }`}
                        >
                          {ativa && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-medium text-foreground">
                            {pastoral.name}
                          </span>
                          {pastoral.description && (
                            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                              {pastoral.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Sua paróquia ainda não cadastrou as pastorais aqui. Quando cadastrar, você encontra
                todas na aba Servir — e pode dizer onde quer ajudar a qualquer momento.
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-8">
              <Button type="button" onClick={concluir} disabled={pendente} className="w-full">
                {pendente ? "Entrando…" : escolhida ? "Entrar na comunidade" : "Entrar"}
              </Button>
              {escolhida && (
                <p className="text-center text-[12.5px] text-muted">
                  Ninguém é inscrito automaticamente — é só um aviso ao coordenador.
                </p>
              )}
            </div>
          </div>
        )}

        {/* "Agora não" some no último passo, onde o botão principal já
            conclui sem exigir escolha. */}
        {passo < 3 && (
          <button
            type="button"
            onClick={concluir}
            disabled={pendente}
            className="mt-3 py-2 text-center text-[13px] text-muted transition-colors hover:text-foreground"
          >
            Agora não
          </button>
        )}
      </div>
    </div>
  );
}
