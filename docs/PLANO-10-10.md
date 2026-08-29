# Plano de elevação — Minha Paróquia

**Data:** 28 de agosto de 2026

Este documento funde três fontes num plano só:

| Fonte | Escopo | O que trouxe |
|---|---|---|
| `PROMPT_CLAUDE_CODE_MINHA_PAROQUIA_10_10.md` | Projeto inteiro, 30 fases | Estrutura e amplitude |
| `melhorias-minha-paroquia.md` | Tela de entrada (login), 7 critérios | Itens finos de UX e acessibilidade |
| `docs/AUDITORIA-TECNICA.md` | Leitura do código, medida | Fatos verificados |

**Cada item abaixo foi conferido contra o código.** Onde uma das fontes pedia
algo que já existe, está marcado como feito, com a evidência. Onde pedia algo
que de fato falta, está marcado como confirmado. O que depende de execução — e
não de leitura — está separado no fim, e não recebeu prioridade fingida.

Nenhuma nota nova foi atribuída. As fontes divergem (8,1 no projeto, 8,5 na tela
de entrada) porque medem escopos diferentes, e inventar uma terceira número não
ajudaria ninguém.

---

## Já feito

| Item | Evidência |
|---|---|
| **Fronteiras de erro** (`error`, `global-error`, `not-found`) | Criadas em 27/08. Verificadas em modo de produção. |
| **Recuperação de senha pelo painel** | `/painel/acesso`, em produção em 28/08. Era o item 1.1, o único que travava um piloto. |
| **Fronteiras de carregamento** | 4 rotas: Início, Agenda, Palavra, Servir. |
| **`prefers-reduced-motion`** | Já respeitado globalmente em `globals.css:211`, para todos os elementos. A fonte pedia "garantir"; já estava garantido. |
| **RLS completo** | 38 tabelas com `parish_id`, 38 com política. |
| **Server Actions guardadas** | 30 de 30 verificam sessão ou permissão. |
| **Botões OAuth nas marcas oficiais** | Google e Meta, com variante clara/escura. |
| **`autoComplete` correto** | `email` e `current-password` já presentes. |
| **Política de privacidade** | Pública, específica, com LGPD art. 5º II e art. 14. |
| **Idempotência do robô diário** | `notification_dispatches`. |

---

## Onda 1 — P0: o que já causou dano ou impede o piloto

### 1.1 Recuperação de senha pelo painel — FEITO em 28/08
**Origem:** auditoria. **Status:** resolvido. Mantido aqui pelo registro.

`createPasswordResetToken(email)` existe; falta a tela para a secretaria gerar e
copiar o link. Hoje **não há recuperação de senha em produção** — o e-mail
depende de domínio verificado, que não existe. Num piloto com pessoas mais
velhas, isso acontece na primeira semana.

Já há paliativo: `scripts/definir-senha.ts`, que exige acesso ao banco.

### 1.2 Rate limiting no login e nas rotas de autenticação
**Origem:** ambas as fontes. **Status:** confirmado ausente (nenhuma ocorrência
no código).

**Divergência registrada:** a análise da tela de entrada classifica isto como
prioridade **baixa**. Discordo, e a razão é específica deste projeto: a senha usa
Argon2id com `memoryCost 19456`, que é caro **de propósito**. Sem limite de
tentativas, o próprio mecanismo de segurança vira o vetor — cada tentativa
consome memória e CPU do servidor. Não é só risco de força bruta; é risco de
derrubar a aplicação.

Alcance: `loginAction`, `/api/auth/*` e a recuperação de senha.

### 1.3 Foco visível em todos os interativos
**Origem:** tela de entrada. **Status:** confirmado ausente —
`src/components/ui/Button.tsx` não tem nenhuma regra `focus`.

Quem navega por teclado hoje não enxerga onde está. Vale para o app inteiro, não
só para o login: o `Button` é usado em todas as telas.

---

## Onda 2 — P1: confiança e operação

### 2.1 Migration automática no deploy
**Origem:** auditoria. **Status:** decisão em aberto desde antes.

O passo manual já foi esquecido uma vez, e o efeito foi tela quebrada em
produção. Proposta: rodar `prisma migrate deploy` no build da Vercel, guardado
por `DIRECT_URL` existir apenas no ambiente de produção.

### 2.2 Log de auditoria
**Origem:** master, Fase 8. **Status:** não existe modelo `AuditLog`.

Numa ferramenta com dado sensível, não há como responder "quem mudou o papel
desta pessoa" nem "quem apagou este aviso".

### 2.3 Título por página
**Origem:** tela de entrada (pedia só para o login). **Status:** confirmado —
**nenhuma** tela pública ou privada define `metadata`. Todas as 73 herdam
"Minha Paróquia" do layout raiz.

Generalizei o item: o problema não é do login, é de todas as telas. Afeta aba do
navegador, histórico, atalho na tela inicial e leitor de tela.

### 2.4 `aria-expanded` e `aria-controls` no formulário colapsável
**Origem:** tela de entrada. **Status:** confirmado ausente em `LoginForm.tsx`.

O botão abre um formulário e não anuncia isso a quem usa leitor de tela.

### 2.5 Administrador da plataforma enxerga telas cujo link não vê
**Origem:** descoberto em 28/08 verificando a tela de nova senha.
**Status:** confirmado, `guards.ts:31`.

`requirePermissionForPage` libera quem é `isPlatformAdmin`, mesmo sem a
permissão. Já as entradas do painel testam `session.permissions.includes(...)`
puro. O resultado é que o administrador da plataforma abre uma página cujo
link não aparece para ele.

Não é falha de segurança — é a exceção funcionando como projetada. Mas
**mascara diagnóstico**: ao conferir se a permissão `MEMBER_PASSWORD_RESET`
tinha sido semeada em produção, a página abriu normalmente e passou a
impressão de que estava tudo certo. Não estava: abria pela exceção, e a
secretaria — o público real da tela — continuava sem acesso.

Duas saídas possíveis: fazer o painel mostrar a entrada também para o
administrador da plataforma (alinhando as duas regras), ou tirar a exceção
da guarda e conceder a permissão explicitamente a quem administra a
plataforma. A primeira é menor; a segunda é mais honesta.

### 2.6 Testes de ponta a ponta
**Origem:** master, Fase 26. **Status:** zero. Playwright está instalado, mas só
serve à geração da apresentação comercial.

Fluxos que merecem um E2E: cadastro → escolha de paróquia → Início; publicar
aviso → notificação chega; e o isolamento entre paróquias pela interface.

---

## Onda 3 — P2: descoberta e alcance

### 3.1 "Criar conta" sempre visível
**Origem:** tela de entrada. **Status:** confirmado — o link está **dentro** do
formulário colapsável (`LoginForm.tsx:64`), e só aparece depois de a pessoa
expandir "Entrar com e-mail e senha".

Quem chega sem convite e não quer usar Google ou Facebook não encontra como
criar conta. É a porta de entrada do produto.

### 3.2 Microcopy de valor na tela de entrada
**Origem:** tela de entrada. **Status:** confirmado — a tela não diz o que o
aplicativo faz.

Uma linha acima de "Entrar" resolve. O conteúdo pode sair da apresentação
comercial, que já tem a frase pronta: *a vida da paróquia continua durante a
semana*.

### 3.3 Skip-link
**Origem:** tela de entrada. **Status:** confirmado ausente.

### 3.4 Estado de carregamento nos botões OAuth
**Origem:** tela de entrada. **Status:** são âncoras (`<a href>`), sem estado.

Toque duplo numa rede lenta dispara dois fluxos OAuth.

### 3.5 Rodapé na área pública
**Origem:** tela de entrada. **Status:** confirmado ausente em
`(public)/layout.tsx`.

Resolve dois problemas de uma vez: o vazio do desktop abaixo do card, e o acesso
à política de privacidade sem estar logado.

### 3.6 Página offline e estratégia de cache — JÁ EXISTE, medido em 29/08
**Origem:** auditoria e master, Fase 24. **Status:** o achado estava errado.

`public/offline.html` e a estratégia inteira entraram em 21/08, no commit
`8d023c4`. O service worker guarda dois arquivos no `install` — a página e o
emblema — e, em toda navegação que falhar por rede, responde com ela.

E a estratégia de cache **é uma decisão, não uma falta**: nenhum dado de
paróquia vai para o cache, de propósito. Escala, aviso e horário de missa
mudam, e mostrar uma versão velha sem avisar é pior do que dizer que não há
conexão — a pessoa confiaria num horário que já não vale. O que se guarda é
só a tela que não contém dado nenhum.

**Verificado com o servidor desligado:** navegando para `/inicio` sem
servidor, a tela "Sem conexão" aparece, com o emblema — que também veio do
cache. Antes disso, conferido no navegador que o service worker controla a
aba e que o cache `minha-paroquia-v1` tem os dois arquivos.

### 3.7 Uma imagem sem `alt` — NÃO EXISTE, medido em 29/08
**Origem:** auditoria. **Status:** o achado estava errado.

São doze `<img>` no código e as doze têm `alt`. A linha 60 de
`ProximosEncontros.tsx` é o comentário sobre a imagem; a imagem está na 66 e
sempre teve `alt=""`. Cinco das doze usam `alt` vazio, e conferindo uma a uma,
as cinco estão certas: duas são o logo da paróquia ao lado do próprio nome,
duas são fotos com o texto já escrito acima, e a do vídeo está dentro de um
`<button aria-label="Assistir: …">`, onde preencher o `alt` faria o leitor de
tela dizer o título duas vezes.

Fica o registro do método: `grep` conta linhas, não conta JSX. Três contagens
diferentes (13, 1, 0) saíram da mesma pergunta, e só a que abriu arquivo por
arquivo valia.

---

**Onda 3 encerrada em 29/08.** Cinco itens implementados (3.1 a 3.5, commit
`b4e97f5`) e dois desmentidos por medição (3.6 e 3.7). Vale o registro: um
terço desta onda era achado falso da auditoria, e os dois casos vieram da
mesma causa — `grep` conta linha, não conta significado.

---

## Onda 4 — polimento — FEITA em 29/08, commit `2c087ba`

- **Preenchimento do desktop:** resolvido pelo rodapé da Onda 3, sem as duas
  colunas que a fonte sugeria. Medido: `body` 1280x800 com o rodapé em
  `top=724`.
- **Sombra do `Card`:** o item supunha sombra escrita à mão para alinhar aos
  tokens. Não havia sombra nenhuma — o comentário do componente prometia uma
  desde sempre e a classe não existia. Agora usa `shadow-sm`, que já apontava
  para `--shadow-1` em `tailwind.config.ts:73`.
- **Botão "mostrar senha":** `CampoDeSenha`, nos três formulários. O acessório
  virou capacidade do `FormField` em vez de código repetido.
- **Página "Como funciona":** pública, ligada no rodapé antes da política.
- **Cabeçalhos de segurança:** seis, conferidos na resposta HTTP. A CSP ficou
  restrita ao que se impõe sem nonce (`frame-ancestors`, `base-uri`,
  `form-action`); `script-src` exigiria `middleware.ts`, que o projeto não tem
  de propósito.

### O que a Onda 4 deixou em aberto

Não existe canal público para uma paróquia PEDIR para usar a ferramenta. A
página "Como funciona" termina em "criar conta", que serve a quem já pertence a
uma paróquia atendida — o pároco que se interessar pela apresentação não tem
para onde escrever. Não inventei um e-mail de contato; é decisão de quem
mantém a plataforma.

---

## O que exige medição, não leitura

Estes itens aparecem nas fontes como se fossem verificáveis lendo o código. Não
são, e por isso não receberam prioridade — precisam de execução em aparelho ou
ferramenta:

- **Contraste AA** — MEDIDO em 29/08. Virou `npm run contraste`, que lê o
  próprio `globals.css` e confere 294 pares nas 14 paletas (7 tempos x claro e
  escuro). Primeira leitura: 101 reprovações. Depois de três correções, 25.

  As três: as cores de estado no escuro, que nunca foram sobrescritas — erro
  ficava a 2,43:1, quase invisível; o roxo do escuro, clareado para os links
  passarem; e o preenchimento do botão, que no escuro passou a usar
  `--color-primary-light`.

  A segunda e a terceira são a mesma decisão, e isso só apareceu ao executar:
  `--color-primary` servia de texto sobre fundo escuro E de fundo com texto
  branco, e os dois limites são incompatíveis (luminância acima de 0,245 e
  abaixo de 0,183). Consertar o link derrubou o botão de 4,60 para 3,27 antes
  de eu perceber que eram o mesmo token.

  **Três das quatro decisões foram feitas em 29/08**, e sobraram 4 pares:

  - borda dos campos: de `#d3cabb` para `#968c7c`, 1,60 -> 3,26. Vale para
    campo de formulário e botão de contorno, nas 14 paletas;
  - dourado do Natal e da Páscoa em link e botão, escurecido. **O gradiente
    do topo NÃO mudou** — a atmosfera dourada da tela é a mesma;
  - assinatura dourada, de `#e3ce95` para `#f0e0b4`, que resolve o Tempo
    Comum (3,94 -> 4,66).

  **Os 4 pares restantes só melhoram mexendo no gradiente litúrgico**, e
  ficam por decidir: texto branco e assinatura dourada sobre o topo dourado
  do Natal e da Páscoa. Nem branco puro resolve — dá 3,43 sobre aquele
  dourado. É escurecer o gradiente ou aceitar.

  `hover` e `disabled` continuam sem medição — o script não os cobre. Ao
  escurecer o dourado eu ajustei o `-hover` do Natal e da Páscoa à mão, que
  antes clareava para `#c9a44c` e deixava o texto branco em 2,36 ao passar o
  mouse.
- **Contraste sobre imagem enviada pela paróquia** — não é medível por script:
  depende da foto.
- **Leitor de tela** — VoiceOver no iPhone, TalkBack no Android.
- **Lighthouse** — RODADO em 29/08 contra `/login`, em modo de produção:
  desempenho 90, **acessibilidade 96**, boas práticas 100, SEO 90.
  Deslocamento de layout (CLS) **0**. Três reprovações, e só uma é real:

  - `color-contrast` — é o **botão do Facebook**, branco sobre o azul oficial
    `#1877f2`, 4,23:1. O script `npm run contraste` não pega isso: ele mede os
    nossos tokens, e a cor é da Meta. Corrigir contraria a marca deles.
  - `meta-description` — **falso alarme**. O Next transmite metadados depois
    do `</head>` para navegador comum, mas bloqueia e devolve dentro do
    `<head>` para robô que não executa JavaScript. Conferido com os agentes do
    Facebook e do WhatsApp: recebem certo. O Googlebot recebe transmitido de
    propósito, porque executa JavaScript e espera.
  - `bf-cache` — o `cache-control: no-store` do Next em página dinâmica. É o
    preço de a página ler sessão.

  A medição achou o que não estava na lista de ninguém: **não existia nenhuma
  etiqueta Open Graph**. Num app que se espalha por link no grupo do WhatsApp,
  a prévia saía sem imagem e sem nome do site. Corrigido no layout raiz.
- **Navegação por teclado** — CONFERIDA em 29/08 na tela de entrada. Ordem de
  tabulação igual à ordem visual (atalho para o conteúdo, Google, Facebook,
  senha, criar conta, rodapé) e indicador visível em todas as paradas. Os
  botões OAuth usam anel em `box-shadow`, não `outline` — conferir só o
  `outline` faz parecer que não têm foco visível.
- **Imagem de prévia própria (1200x630)** — não feita. A prévia usa hoje o
  ícone quadrado de 512. Um cartão desenhado exigiria decisão de arte.
- **Salto de altura do card** — MEDIDO em 29/08, e o achado foi outro. O salto
  existe (306px) mas é inofensivo: o botão acionado não se move um pixel,
  porque o formulário abre abaixo dele. O problema real era a página não
  rolar: em 375x667 o botão "Entrar" ficava fora da tela, e em 360x640 o campo
  de e-mail também. Tocar no botão parecia não fazer nada. Corrigido pelo
  gancho `useRolarAoAbrir` (commit `7d033e5`).
- **Landscape no celular** — MEDIDO em 29/08, junto com o item acima. Em
  640x360 o formulário aparece inteiro depois da rolagem. **Recorte com
  entalhe continua sem medição**: exige aparelho, não emulação.
- **Service worker atrasando o primeiro desenho.**

---

## O que as fontes não pediram, e eu manteria na lista

Itens da auditoria que não aparecem em nenhuma das duas fontes de melhoria, mas
que julgo mais relevantes que boa parte da Onda 3:

1. **Recuperação de senha** (1.1) — nenhuma das fontes cita, e é o que trava o
   piloto.
2. **Fronteiras de erro** — nenhuma das fontes cita, e o problema já tinha
   atingido usuários em produção duas vezes. Resolvido em 27/08.
3. **Log de auditoria** (2.2) — só a fonte master cita, sem prioridade.

---

## Ordem sugerida de execução

1. Recuperação de senha pelo painel (1.1)
2. Rate limiting (1.2)
3. Foco visível (1.3)
4. "Criar conta" visível + microcopy (3.1, 3.2) — mesma tela, mesmo commit
5. Título por página (2.3) + `aria-expanded` (2.4) + skip-link (3.3)
   e alinhar guarda x painel (2.5), que é de uma linha
6. Migration no deploy (2.1)
7. Log de auditoria (2.2)
8. E2E (2.5)

Os itens 4 e 5 são pequenos e se agrupam bem. O 1 e o 2 são os únicos que
mudam o que a ferramenta é capaz de fazer com segurança.
