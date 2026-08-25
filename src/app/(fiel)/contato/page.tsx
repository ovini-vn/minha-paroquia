import { Church, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { getParish, listOfficeHours } from "@/server/modules/parishes/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { calcularExpediente, agruparPorDia } from "@/lib/expediente";

/*
 * Instagram e Facebook desenhados aqui: a lucide tirou os ícones de marca
 * da biblioteca, e trazer um pacote inteiro por dois símbolos não se paga.
 */
function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <path d="M15.2 8.1h-1.6c-.9 0-1.5.6-1.5 1.5v1.6h3l-.4 3h-2.6v6.3" />
      <path d="M9.3 11.2h2.8" />
    </svg>
  );
}

/** Só dígitos, com o 55 do Brasil — formato que o WhatsApp espera na URL. */
function paraWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export default async function ContatoPage() {
  const session = await requireSessionForPage();
  if (!session.membership) {
    return (
      <EmptyState
        icon={Church}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para ver os contatos dela."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [parish, faixas] = await Promise.all([getParish(parishId), listOfficeHours(parishId)]);
  if (!parish) return null;

  const expediente = calcularExpediente(faixas, new Date());
  const horarios = agruparPorDia(faixas);

  const endereco = [parish.address, parish.city, parish.state].filter(Boolean).join(", ");
  const mensagem = encodeURIComponent(
    `Olá! Sou ${session.fullName} e vim pelo aplicativo Minha Paróquia. Gostaria de falar com a secretaria.`,
  );

  const linha =
    "flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0 transition-colors hover:bg-primary-tint";
  const icone = "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md";

  return (
    <div className="flex flex-col">
      <PageHeader title="Contato" description={parish.name} />

      {/* Estado da secretaria vem primeiro: é a pergunta que traz a pessoa
          a esta tela. "Fechada" sozinho não ajuda — junto vem quando abre. */}
      <Card>
        <div className="flex items-start gap-3">
          <span className={`${icone} bg-primary-tint text-primary`}>
            <Clock className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14.5px] font-medium text-foreground">Secretaria paroquial</p>
              {faixas.length > 0 &&
                (expediente.aberta ? (
                  <Badge tone="success">Aberta agora</Badge>
                ) : (
                  <Badge tone="muted">Fechada</Badge>
                ))}
            </div>

            {faixas.length === 0 ? (
              <p className="mt-1 text-[13px] text-muted">
                Os horários ainda não foram cadastrados pela paróquia.
              </p>
            ) : (
              <>
                <p className="mt-1 text-[13px] text-muted">
                  {expediente.aberta
                    ? `Fecha às ${expediente.fechaAs}.`
                    : expediente.proxima
                      ? `Abre ${expediente.proxima.dia} às ${expediente.proxima.hora}.`
                      : "Sem previsão de reabertura."}
                </p>
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                  {horarios.map((h) => (
                    <p key={h.dia} className="flex justify-between gap-3 text-[12.5px] text-muted">
                      <span>{h.dia}</span>
                      <span className="text-foreground">{h.horarios}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <section className="pt-6">
        <Eyebrow tone="accent" className="mb-3">
          Falar com a paróquia
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          {parish.phone && (
            // tel: abre o discador com o número pronto — no celular é um
            // toque, sem copiar e colar.
            <a href={`tel:${parish.phone.replace(/\s/g, "")}`} className={linha}>
              <span className={`${icone} bg-primary-tint text-primary`}>
                <Phone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-foreground">Ligar</span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{parish.phone}</span>
              </span>
            </a>
          )}

          {parish.whatsapp && (
            // A mensagem já vai escrita e assinada: quem recebe sabe quem é
            // e de onde veio, sem precisar perguntar.
            <a
              href={`https://wa.me/${paraWhatsapp(parish.whatsapp)}?text=${mensagem}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linha}
            >
              <span className={`${icone} bg-[#25D366]/15 text-[#1a8f47] dark:text-[#4ade80]`}>
                <MessageCircle className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-foreground">
                  Enviar mensagem
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  Abre o WhatsApp com a mensagem pronta
                </span>
              </span>
            </a>
          )}

          {endereco && (
            // maps: é o esquema que o próprio aparelho resolve — abre no app
            // de navegação que a pessoa usa, não força um específico.
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linha}
            >
              <span className={`${icone} bg-primary-tint text-primary`}>
                <MapPin className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-foreground">Como chegar</span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{endereco}</span>
              </span>
            </a>
          )}
        </Card>

        {!parish.phone && !parish.whatsapp && !endereco && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            A paróquia ainda não cadastrou telefone, WhatsApp nem endereço.
          </p>
        )}
      </section>

      {(parish.instagramUrl || parish.facebookUrl) && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Nas redes
          </Eyebrow>
          <div className="flex gap-2.5">
            {parish.instagramUrl && (
              <a
                href={parish.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-primary"
              >
                <IconeInstagram className="h-5 w-5 shrink-0 text-[#C13584]" />
                <span className="text-[14px] font-medium text-foreground">Instagram</span>
              </a>
            )}
            {parish.facebookUrl && (
              <a
                href={parish.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-primary"
              >
                <IconeFacebook className="h-5 w-5 shrink-0 text-[#1877F2]" />
                <span className="text-[14px] font-medium text-foreground">Facebook</span>
              </a>
            )}
          </div>
        </section>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
