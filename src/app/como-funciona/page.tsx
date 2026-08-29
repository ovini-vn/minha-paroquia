import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Só o nome da tela: o layout raiz acrescenta "· Minha Paróquia".
  title: "Como funciona",
  description:
    "O que o Minha Paróquia faz por quem participa da comunidade e por quem administra a paróquia.",
};

/**
 * Página pública, fora de qualquer autenticação.
 *
 * Existe porque a tela de entrada só comporta uma linha sobre o que a
 * ferramenta é, e quem chega por um link compartilhado não tem como saber no
 * que está entrando antes de criar conta.
 *
 * Regra que vale para manter esta página: NADA aqui pode ser promessa. Cada
 * item abaixo corresponde a uma tela que existe hoje no aplicativo. Se uma
 * funcionalidade sair, o parágrafo sai junto — uma página de "como funciona"
 * que descreve o que ainda vai existir é propaganda, e quem lê descobre a
 * diferença no primeiro uso.
 *
 * A seção "O que o aplicativo não faz" não é modéstia: numa ferramenta que
 * toca dízimo e confissão, dizer o que NÃO acontece é a informação mais
 * valiosa da página.
 */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="pt-7">
      <h2 className="mb-2.5 font-serif text-[21px] font-semibold leading-tight text-foreground">
        {titulo}
      </h2>
      <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Lista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-1">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="select-none text-gold" aria-hidden>
            ·
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Forte({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-[18px] pb-16 pt-8">
      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
        Como funciona
      </h1>

      <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
        O Minha Paróquia é o aplicativo de uma comunidade católica. Ele existe para o que acontece
        entre um domingo e o outro: o horário que mudou, o aviso dado no fim da missa que não chegou
        a quem faltou, a escala de quem serve no próximo fim de semana, a leitura do dia.
      </p>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">
        Cada paróquia tem o seu espaço, separado das demais. Quem participa de mais de uma escolhe
        de qual está vendo a vida naquele momento.
      </p>

      <Secao titulo="Para quem participa">
        <Lista
          itens={[
            <>
              <Forte>Início.</Forte> A primeira tela responde uma pergunta só: o que acontece na
              minha paróquia agora. Próximas missas, avisos recentes e o que foi marcado para os
              próximos dias.
            </>,
            <>
              <Forte>Agenda.</Forte> Horários de missa e confissão, eventos e encontros, e o
              expediente da secretaria.
            </>,
            <>
              <Forte>Palavra.</Forte> A <Forte>Bíblia católica completa</Forte> — 73 livros, na
              tradução do padre Matos Soares, em domínio público —, a palavra do padre e a leitura
              do dia.
            </>,
            <>
              <Forte>Comunidade.</Forte> As pastorais e como entrar numa delas, os sacerdotes e o
              agendamento de atendimento com eles, e os pedidos de oração.
            </>,
            <>
              <Forte>Servir.</Forte> A escala de quem serve na liturgia, e o caminho para se
              oferecer quando falta gente.
            </>,
            <>
              <Forte>Caminhada.</Forte> O registro pessoal da própria vida sacramental: missas,
              confissões e os sacramentos recebidos. Sobre a privacidade disso, leia a seção
              seguinte.
            </>,
            <>
              <Forte>Catequese.</Forte> As turmas, os encontros e a presença — para quem é
              catequista e para o responsável que acompanha a criança.
            </>,
            <>
              <Forte>Avisos no celular.</Forte> Quando a paróquia publica algo, quem quiser recebe a
              notificação. É opcional, e desligável a qualquer momento.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="O que fica só com você">
        <p>
          As <Forte>missas e as confissões</Forte> que você registra na Caminhada servem ao seu
          próprio acompanhamento e <Forte>não aparecem para a paróquia</Forte> — nem para a
          secretaria, nem no painel de gestão.
        </p>
        <p>
          Da confissão, o aplicativo guarda <Forte>apenas a data</Forte>. Não existe campo de texto
          no banco de dados onde algo dito em confissão possa ser escrito: a proteção não depende de
          uma regra que alguém possa mudar, depende de o lugar não existir.
        </p>
        <p>
          O que a paróquia enxerga são os <Forte>sacramentos</Forte> — batismo, primeira eucaristia,
          crisma, casamento —, porque são registro da comunidade, e é o que permite lembrar de um
          aniversário de casamento ou organizar uma turma de crisma.
        </p>
        <p>
          Os detalhes, campo por campo, estão na{" "}
          <Link href="/privacidade" className="font-medium text-primary hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </Secao>

      <Secao titulo="Para quem administra a paróquia">
        <p>
          O painel de gestão é separado do aplicativo de quem participa, e cada pessoa enxerga
          apenas o que a função dela exige. De lá dá para:
        </p>
        <Lista
          itens={[
            "publicar avisos e definir horários de missa, confissão e expediente",
            "criar eventos e encontros da comunidade",
            "cuidar dos membros, das funções e das permissões de cada um",
            "organizar as pastorais e a escala de quem serve na liturgia",
            "registrar sacramentos e acompanhar os aniversários da comunidade",
            "registrar a participação no dízimo, sem qualquer dado bancário",
            "contar a história da paróquia e apresentar os sacerdotes",
            "gerar um link de nova senha para quem perdeu o acesso",
            "consultar o registro de auditoria: quem mudou o quê, e quando",
          ]}
        />
      </Secao>

      <Secao titulo="O que o aplicativo não faz">
        <Lista
          itens={[
            <>
              <Forte>Não processa pagamento.</Forte> O dízimo é registrado como participação num
              período. O aplicativo não recebe dinheiro, não guarda dado bancário e não sabe quanto
              alguém contribuiu.
            </>,
            <>
              <Forte>Não tem anúncio nem rastreador.</Forte> Nenhum dado é vendido ou cedido para
              fim comercial.
            </>,
            <>
              <Forte>Não guarda a paróquia no aparelho.</Forte> Sem internet, aparece uma tela
              avisando que não há conexão, e não uma versão antiga da vida da comunidade. Horário de
              missa muda, e mostrar o de ontem sem avisar é pior do que não mostrar nada.
            </>,
            <>
              <Forte>Não abre os dados de uma paróquia para outra.</Forte> A separação é imposta
              pelo próprio banco de dados, e não apenas pelo código.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="Como entrar">
        <p>
          Dá para entrar com Google, com Facebook ou com e-mail e senha. Depois é só escolher a sua
          paróquia — ou usar o link de convite que a comunidade enviou, que já leva direto para ela.
        </p>
        <p className="pt-1.5">
          <Link
            href="/cadastro"
            className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
          >
            Criar uma conta
          </Link>
          {" · "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
          >
            Já tenho conta
          </Link>
        </p>
      </Secao>
    </main>
  );
}
