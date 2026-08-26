import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Minha Paróquia",
  description:
    "Como o aplicativo Minha Paróquia trata os dados de quem participa da vida da comunidade.",
};

/**
 * Página pública, fora de qualquer autenticação.
 *
 * Precisa ser alcançável sem conta: é o endereço que a Meta, o Google e as
 * lojas de aplicativo exigem, e é onde alguém que ainda não entrou pode ler
 * o que aconteceria com os dados dela antes de decidir entrar.
 *
 * O texto é deliberadamente específico. Política genérica de modelo diz
 * "podemos coletar informações de uso" e não compromete ninguém a nada; a
 * lista abaixo é a que existe no banco, campo por campo, e mudá-la exige
 * mudar esta página junto.
 */
const ATUALIZADO_EM = "26 de agosto de 2026";

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

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-[18px] pb-16 pt-8">
      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-[13px] text-muted">Atualizada em {ATUALIZADO_EM}</p>

      <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
        O <strong className="font-semibold text-foreground">Minha Paróquia</strong> é um aplicativo
        para a vida da comunidade paroquial: agenda de missas, catequese, pastorais, pedidos de
        oração e comunicação da secretaria. Esta página explica, em detalhe, quais dados o
        aplicativo guarda, por quê, com quem eles são compartilhados e o que você pode exigir a
        respeito deles.
      </p>

      <Secao titulo="Quem responde pelos seus dados">
        <p>
          Quem decide o que é feito com os dados da sua comunidade é a{" "}
          <strong className="font-semibold text-foreground">sua paróquia</strong> — ela é a
          controladora, no vocabulário da Lei Geral de Proteção de Dados (Lei 13.709/2018). O
          Minha Paróquia é a ferramenta que ela usa, e atua como operadora: tratamos os dados
          seguindo as instruções da paróquia, e não os usamos para finalidade própria.
        </p>
        <p>
          Na prática, isso significa que pedidos sobre os seus dados começam na secretaria da sua
          paróquia. Os contatos dela estão na tela de Contato dentro do aplicativo.
        </p>
      </Secao>

      <Secao titulo="Que dados o aplicativo guarda">
        <p>
          <strong className="font-semibold text-foreground">Da sua conta:</strong> nome completo,
          e-mail, senha (guardada de forma cifrada, nunca em texto legível), e — se você quiser
          preencher — telefone, data de nascimento e foto de perfil.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Da sua participação:</strong>
        </p>
        <Lista
          itens={[
            "a paróquia a que você pertence e a sua função nela (fiel, catequista, secretaria, e assim por diante)",
            "pedidos de atendimento com o sacerdote: a categoria escolhida (confissão, direção espiritual, conversa, questão familiar, sacramento ou outro), a data e o horário",
            "pedidos de oração que você escrever, com o texto que você escrever",
            "registro de participação no dízimo, por período",
            "presença em encontros de catequese e sacramentos recebidos",
            "interesse em servir em pastorais e ministérios",
            "sua preferência de tema visual e, se você autorizar, o registro para receber notificações",
          ]}
        />
        <p>
          <strong className="font-semibold text-foreground">Se você entrar com Google ou
          Facebook:</strong> recebemos do provedor apenas o seu nome, o seu e-mail e um
          identificador da conta. Não recebemos a sua senha, nem sua lista de contatos, nem
          publicações.
        </p>
      </Secao>

      <Secao titulo="Dados sensíveis: a fé é um deles">
        <p>
          A lei brasileira trata convicção religiosa como{" "}
          <strong className="font-semibold text-foreground">dado pessoal sensível</strong>. Um
          aplicativo de paróquia é, por natureza, feito desse tipo de dado: o simples fato de você
          ter uma conta aqui revela que você participa de uma comunidade católica.
        </p>
        <p>
          Além disso, um pedido de oração pode conter aquilo que a pessoa está vivendo — uma
          doença, um luto, um conflito de família. Trate esse campo com o cuidado que ele merece, e
          escolha conscientemente entre deixá-lo visível só para o sacerdote ou para a comunidade.
        </p>
        <p>
          A base legal para esse tratamento é o seu consentimento, dado ao criar a conta, e o
          legítimo exercício da atividade religiosa pela paróquia. Você pode retirar o
          consentimento a qualquer momento pedindo a exclusão da conta.
        </p>
      </Secao>

      <Secao titulo="Minha Caminhada: o que a paróquia vê e o que não vê">
        <p>
          A Caminhada é uma tela da paróquia, dentro do aplicativo da paróquia. É razoável supor
          que a paróquia esteja olhando tudo o que se registra ali — e não está. A separação é
          esta:
        </p>
        <Lista
          itens={[
            <>
              <strong className="font-semibold text-foreground">
                Missas registradas e confissões: ninguém além de você.
              </strong>{" "}
              Nem o pároco, nem a secretaria, nem quem administra a plataforma. Essas listas só são
              lidas pela conta que as escreveu, e servem ao acompanhamento que a pessoa faz de si
              mesma.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                As reflexões que você escreve não saem da sua conta.
              </strong>{" "}
              A paróquia enxerga um único número agregado — quantas participações em missa foram
              registradas na comunidade inteira no mês, e que proporção veio acompanhada de algum
              texto. Sem nome, sem data individual, sem uma palavra do que foi escrito, e apenas
              acima de um mínimo de registros, para que ninguém seja deduzido numa comunidade
              pequena.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Sacramentos e data de nascimento: visíveis para a paróquia.
              </strong>{" "}
              Batismo, Primeira Eucaristia, Crisma e Casamento ficam à vista do pároco e da
              secretaria, com a data de nascimento de quem a preencheu. É o que permite confirmar
              um registro e lembrar de um aniversário — a única finalidade para a qual essas datas
              são usadas.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="O que o aplicativo NÃO guarda">
        <p>Algumas ausências são decisões de projeto, e valem ser ditas com clareza:</p>
        <Lista
          itens={[
            <>
              <strong className="font-semibold text-foreground">
                Nada do conteúdo de uma confissão.
              </strong>{" "}
              O registro de confissão guarda exclusivamente a data. Não há campo de texto, não há
              anotação do sacerdote, não existe lugar no banco de dados onde algo dito em confissão
              possa ser escrito. O sigilo sacramental não depende de política: ele é impossível de
              violar aqui porque a estrutura não permite.
            </>,
            <>
              <strong className="font-semibold text-foreground">Valores de dízimo ou doação.</strong>{" "}
              O dízimo é registrado apenas como participação num período. O aplicativo não processa
              pagamentos, não guarda dados bancários seus e não sabe quanto alguém contribuiu.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Sua localização, sua agenda ou seus contatos.
              </strong>{" "}
              O aplicativo não pede nem usa essas permissões.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Nada para publicidade.
              </strong>{" "}
              Não há anúncios, não há rastreador nosso nem de análise de comportamento, e nenhum
              dado é vendido ou cedido para fins comerciais. A única exceção é o vídeo do YouTube,
              explicada abaixo, e ela só acontece se você tocar para assistir.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="Crianças e adolescentes">
        <p>
          A catequese envolve crianças. Os cadastros de catequizandos são feitos pelos pais ou
          responsáveis, ou pela secretaria da paróquia, e guardam nome, data de nascimento e o
          contato de um responsável.
        </p>
        <p>
          Esses dados existem para uma finalidade específica e limitada: organizar as turmas,
          registrar a presença nos encontros e permitir que a catequista avise a família quando
          precisar. O tratamento é feito no melhor interesse da criança, como exige o artigo 14 da
          LGPD, e depende do consentimento de quem responde por ela.
        </p>
        <p>
          Uma criança não tem conta própria no aplicativo. Quem enxerga o cadastro dela é o
          responsável vinculado, a catequista da turma e a secretaria — ninguém mais.
        </p>
      </Secao>

      <Secao titulo="Quem enxerga o quê">
        <p>
          Pertencer a uma paróquia não dá acesso aos dados das outras pessoas dela. O aplicativo
          separa o que é público da comunidade — missas, eventos, avisos, a história da paróquia —
          daquilo que é de cada um.
        </p>
        <Lista
          itens={[
            "seus atendimentos, seus pedidos de oração privados e seu registro de dízimo são vistos por você e por quem tem função para isso na paróquia",
            "um pedido de oração marcado como privado só é visto pelo pároco e pelos sacerdotes",
            "quem tem função na paróquia (secretaria, catequista, coordenação) enxerga apenas o necessário para exercer aquela função",
            "um fiel comum não tem acesso à lista de membros nem aos dados de outros fiéis",
          ]}
        />
        <p>
          Essa separação é aplicada pelo próprio banco de dados, e não apenas pelo código do
          aplicativo. Cada consulta carrega a identificação da paróquia, e o banco recusa devolver
          linhas de outra — uma falha de programação não é suficiente para vazar dados entre
          paróquias.
        </p>
      </Secao>

      <Secao titulo="Onde os dados ficam e com quem são compartilhados">
        <p>
          Os dados ficam armazenados em servidores localizados no{" "}
          <strong className="font-semibold text-foreground">Brasil</strong>, na região de São Paulo.
          Usamos os seguintes serviços para operar o aplicativo:
        </p>
        <Lista
          itens={[
            "Vercel — hospedagem do aplicativo",
            "Neon — banco de dados",
            "Vercel Blob — armazenamento das imagens enviadas pela paróquia",
            "Google e Meta — apenas quando você escolhe entrar com Google ou Facebook",
            "serviços de notificação do seu navegador ou celular — apenas se você autorizar notificações",
          ]}
        />
        <p>
          Nenhum desses serviços recebe os seus dados para uso próprio: eles são fornecedores de
          infraestrutura. Fora deles, os dados não são compartilhados com ninguém, exceto se houver
          ordem judicial ou obrigação legal.
        </p>
      </Secao>

      <Secao titulo="Por quanto tempo">
        <p>
          Os dados permanecem enquanto a sua conta existir. Registros que fazem parte da vida
          sacramental da comunidade — o recebimento de um sacramento, por exemplo — seguem as
          normas de guarda da Igreja, que são anteriores e independentes deste aplicativo.
        </p>
        <p>
          Se você pedir a exclusão da conta, os dados pessoais são apagados, preservando-se apenas
          o que a paróquia precise manter por obrigação legal ou canônica.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>A LGPD garante a você, sobre os seus dados, o direito de:</p>
        <Lista
          itens={[
            "saber se existem e quais são",
            "corrigir o que estiver errado ou desatualizado",
            "pedir uma cópia",
            "pedir a exclusão dos dados tratados com base no seu consentimento",
            "retirar o consentimento, sabendo que isso encerra o seu uso do aplicativo",
            "saber com quem foram compartilhados",
          ]}
        />
        <p>
          Boa parte disso você faz sozinho, na aba <strong className="font-semibold text-foreground">Eu</strong>{" "}
          do aplicativo. Para o resto, procure a secretaria da sua paróquia.
        </p>
      </Secao>

      <Secao titulo="Segurança">
        <p>
          Senhas são guardadas cifradas, de forma que nem quem administra o sistema consegue lê-las.
          Todo o tráfego entre o seu aparelho e o servidor é criptografado. O acesso aos dados de
          cada paróquia é isolado no banco de dados, como descrito acima.
        </p>
        <p>
          Nenhum sistema é imune a falhas. Se acontecer um incidente que possa trazer risco a você,
          a paróquia será comunicada e você também, junto com a Autoridade Nacional de Proteção de
          Dados, quando a lei exigir.
        </p>
      </Secao>

      <Secao titulo="Vídeos do YouTube">
        <p>
          Quando a paróquia publica um vídeo na Palavra do Padre, o aplicativo mostra a capa dele
          e só carrega o reprodutor quando <strong className="font-semibold text-foreground">você
          toca para assistir</strong>. Até esse momento, o YouTube não é acionado.
        </p>
        <p>
          Ao assistir, o vídeo passa a vir do Google, que pode registrar essa visualização segundo
          as próprias regras dele. Usamos o domínio de incorporação sem cookie que o próprio
          YouTube publica para reduzir isso, mas quem assiste dentro do aplicativo assiste no
          YouTube — e vale saber disso antes de tocar.
        </p>
        <p>A capa do vídeo é uma imagem servida pelo YouTube, carregada junto com a tela.</p>
      </Secao>

      <Secao titulo="Cookies">
        <p>
          O aplicativo usa cookies apenas para manter você conectado e para proteger o login contra
          fraude. Não há cookies de publicidade nem de análise de comportamento.
        </p>
      </Secao>

      <Secao titulo="Mudanças nesta política">
        <p>
          Quando esta política mudar, a data no topo muda junto. Se a mudança afetar de forma
          relevante o tratamento dos seus dados, você será avisado dentro do aplicativo.
        </p>
      </Secao>

      <Secao titulo="Contato">
        <p>
          Para qualquer questão sobre os seus dados, procure a secretaria da sua paróquia — os
          contatos estão na tela de Contato do aplicativo. Ela responde pelos dados da sua
          comunidade e encaminha o que precisar ser tratado com quem mantém a plataforma.
        </p>
      </Secao>

      <div className="rule-gold my-8" />

      <Link href="/login" className="text-[14px] text-primary underline underline-offset-2">
        Voltar para o início
      </Link>
    </main>
  );
}
