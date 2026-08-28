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

### 1.1 Recuperação de senha pelo painel
**Origem:** auditoria. **Status:** confirmado pendente.

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

### 2.5 Testes de ponta a ponta
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

### 3.6 Página offline e estratégia de cache
**Origem:** auditoria e master, Fase 24. **Status:** o service worker menciona
offline uma única vez e não há rota para ela. Sem rede, o aplicativo não abre.

### 3.7 Uma imagem sem `alt`
**Origem:** auditoria. **Status:** `ProximosEncontros.tsx:60`.

---

## Onda 4 — polimento

- Preenchimento visual do desktop na área pública (a fonte sugere duas colunas;
  o rodapé do item 3.5 pode bastar, e custa menos).
- Sombra do `Card` alinhada aos tokens `--shadow-2` / `--shadow-3`.
- Botão "mostrar senha" no campo de senha.
- Página estática "Como funciona".
- Cabeçalhos de segurança (CSP, `X-Frame-Options`) além do que a Vercel já dá.

---

## O que exige medição, não leitura

Estes itens aparecem nas fontes como se fossem verificáveis lendo o código. Não
são, e por isso não receberam prioridade — precisam de execução em aparelho ou
ferramenta:

- **Contraste AA em todos os estados** — hover, desabilitado, modo escuro e cada
  um dos **sete** tempos litúrgicos. São muitas combinações; precisa de
  ferramenta, não de olho.
- **Leitor de tela** — VoiceOver no iPhone, TalkBack no Android.
- **Lighthouse** — desempenho, boas práticas, acessibilidade.
- **Landscape no celular** e recorte da tela com entalhe.
- **Salto de altura do card** quando o formulário de senha abre.
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
6. Migration no deploy (2.1)
7. Log de auditoria (2.2)
8. E2E (2.5)

Os itens 4 e 5 são pequenos e se agrupam bem. O 1 e o 2 são os únicos que
mudam o que a ferramenta é capaz de fazer com segurança.
