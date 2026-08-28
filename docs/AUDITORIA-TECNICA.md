# Auditoria técnica — Minha Paróquia

**Data:** 27 de agosto de 2026
**Escopo:** Fase 0 do plano de elevação — leitura e diagnóstico, sem alteração de código.

Tudo aqui foi verificado contra o código, não contra a documentação. Onde houve
divergência entre o que se supunha e o que se mediu, prevalece o medido, e a
divergência está registrada.

---

## 1. Arquitetura encontrada

Aplicação **Next.js 15 (App Router)** full-stack, TypeScript de ponta a ponta,
com **Server Actions** no lugar de uma camada de API REST. Apenas três rotas de
API existem, e são para o que Server Action não resolve: OAuth, push e cron.

A separação é por **route group**, e cada grupo tem seu próprio layout e sua
própria guarda:

| Grupo | Telas | Papel |
|---|---|---|
| `(fiel)` | 39 | O aplicativo de quem participa da comunidade |
| `(admin)` | 20 | Painel de gestão da paróquia |
| `(diocese)` | 6 | Visão diocesana, acima da paróquia |
| `(public)` | 6 | Login, cadastro, recuperação de acesso |
| `(bemvindo)` | 2 | Primeiro acesso e escolha de paróquia |

O servidor é organizado em **30 módulos de domínio** (`src/server/modules/*`),
cada um com `service.ts` e, quando há entrada de dados, `schema.ts` com Zod. As
Server Actions (`src/server/actions/*`, 30 arquivos) são casca fina: validam,
chamam o módulo e revalidam o cache.

**35 componentes** em `src/components`, divididos entre `ui/` (primitivos) e
`domain/` (peças que conhecem o negócio).

---

## 2. Tecnologias

**Produção:** next, react, @prisma/client, zod, @node-rs/argon2, web-push,
@vercel/blob, lucide-react, nanoid.

**Desenvolvimento:** typescript, prisma, tailwindcss, vitest, playwright, eslint,
tsx.

A lista é curta de propósito e não há dependência supérflua evidente. Não há
biblioteca de componentes de terceiros: o design system é próprio, sobre
Tailwind com tokens em CSS custom properties.

**Playwright** está instalado, mas hoje serve apenas à geração da apresentação
comercial (`docs/apresentacao`). Não há teste de navegador.

---

## 3. Banco de dados

- **54 modelos** Prisma, **56 migrations** aplicadas.
- PostgreSQL no Neon, com dois ambientes: `ep-falling-glitter` (produção) e
  `ep-silent-salad` (desenvolvimento).
- Duas conexões por ambiente: `DATABASE_URL` com a role restrita `app_user`
  (usada pela aplicação) e `DIRECT_URL` com `neondb_owner` (migrations).

Migrations **não** rodam no deploy — `build` é apenas `next build`. A aplicação
em produção depende de um passo manual, e esse passo já foi esquecido ao menos
uma vez.

---

## 4. Multi-tenancy e RLS

Esta é a área mais sólida do projeto, e o resultado merece ser dito com número:

- **38 tabelas** têm `parish_id`.
- **38 de 38** têm Row-Level Security habilitado **e** política criada.
- Nenhuma tabela de paróquia ficou de fora.

Além dessas, quatro tabelas têm RLS por **usuário** em vez de por paróquia —
`web_push_subscriptions`, `diocese_memberships`, `province_memberships`,
`national_memberships` —, o que é o isolamento correto para o que elas guardam.

O acesso passa por três funções de contexto (`src/server/db/tenant-context.ts`):
`withTenantContext` (define `app.current_parish_id`), `withPlatformContext`
(usa a válvula `app.bypass_rls`, para jobs globais) e `withOwnMembershipLookup`
(lê as próprias linhas antes de haver contexto de paróquia).

A defesa é em profundidade: o filtro por `parishId` existe na aplicação **e** o
banco recusa o que passar. Há teste de integração dedicado ao isolamento
(`tests/integration/tenant-isolation.test.ts`).

**Duas tabelas são globais de propósito** e não têm RLS: `bible_verses` (a
Escritura é a mesma em toda paróquia) e o catálogo de papéis e permissões.

---

## 5. Autenticação

- Senha com **Argon2id** (`@node-rs/argon2`), parâmetros OWASP 2024
  (`memoryCost 19456, timeCost 2, parallelism 1`), centralizados em
  `src/server/auth/password.ts`.
- Sessão por **token opaco** guardado como hash na tabela `sessions`, entregue
  em cookie `httpOnly` — **não** é JWT, e a decisão está documentada no próprio
  módulo. Permite revogação real.
- **OAuth Google e Facebook** funcionando em produção, com `redirect_uri` preso
  ao `APP_URL`.
- Token de redefinição de senha existe no schema (`PasswordResetToken`) e há
  `createPasswordResetToken(email)` no código.

**Lacuna conhecida:** não existe tela no painel para a secretaria gerar o link
de redefinição. Quem esquece a senha hoje depende de e-mail, que por sua vez
depende de domínio verificado — que ainda não há. Na prática, **não há
recuperação de senha em produção**.

---

## 6. Autorização

- RBAC por papel, com catálogo de permissões em `src/server/auth/rbac.ts`.
- Dez papéis, incluindo a separação entre `PAROCO` (cargo eclesial) e
  `ADMINISTRADOR_PAROQUIAL` (quem administra o sistema).
- Override por pessoa (`PermissionOverride`) para as exceções.
- **As 30 Server Actions verificam sessão ou permissão.** Nenhuma passou sem
  guarda na varredura.

---

## 7. PWA

- `src/app/manifest.ts` gera o manifesto dinamicamente.
- `public/sw.js` é o service worker, com Web Push (VAPID).
- Ícones gerados por script (`npm run icons:gerar`).

**Lacunas:** não há **página offline** — o service worker menciona offline uma
única vez e não há rota para ela. Não há estratégia de cache declarada para as
telas, o que significa que sem rede o aplicativo não abre.

---

## 8. Estados de interface

**Este é o achado mais relevante da Fase 0.**

O projeto não tem **nenhuma** fronteira de UI do Next:

| Arquivo | Quantidade |
|---|---|
| `error.tsx` | 0 |
| `global-error.tsx` | 0 |
| `loading.tsx` | 0 |
| `not-found.tsx` | 0 |

Consequência direta e já observada em produção: quando algo falha no servidor,
o usuário recebe a tela crua do Next — *"Application error: a server-side
exception has occurred"*. Aconteceu duas vezes na semana de 26/08: uma por
tabela ausente (`P2021`), outra por `TURNOS` exportado de um arquivo
`"use server"`.

Estados vazios, por outro lado, são bem cuidados: existe um componente
`EmptyState` usado de forma consistente, com texto que explica o que fazer.

---

## 9. Acessibilidade

- **196** ocorrências de atributos `aria-*` — o cuidado existe e é frequente.
- **1** `<img>` sem `alt`, em `src/components/domain/ProximosEncontros.tsx:60`.
- Há escala de fonte P/M/G aplicada por `zoom` sobre o aplicativo inteiro
  (não só o texto), com regras de layout próprias para o tamanho G.
- Tema claro/escuro por `[data-color-scheme]`, independente do sistema
  operacional.

*Nota de método:* uma primeira contagem por `grep` acusou 13 imagens sem `alt`.
A verificação correta, considerando JSX de várias linhas, encontrou **uma**. O
número alto era artefato da ferramenta.

**Não verificado nesta fase:** contraste real das cores, navegação completa por
teclado, e comportamento com leitor de tela. Exigem execução, não leitura.

---

## 10. Testes

- **56 arquivos**, **445 testes**, todos passando.
- Unitários para a lógica pura (datas, fuso de Brasília, liturgia, aniversários,
  texto rico, YouTube, imagem, cânon bíblico).
- Integração contra banco real, incluindo isolamento entre paróquias,
  permissões, agregação com limiar de privacidade e o leitor da Bíblia.

**Lacuna:** **zero testes de ponta a ponta**. Playwright está instalado mas não é
usado para testar a aplicação. Nenhum fluxo do usuário (cadastro → escolha de
paróquia → uso) é exercitado de fim a fim.

---

## 11. Observabilidade e defesas operacionais

| Item | Situação |
|---|---|
| Rate limiting | **Não existe.** Nenhuma ocorrência no código. |
| Log de auditoria | **Não existe.** Não há modelo `AuditLog`. |
| `middleware.ts` | **Não existe.** As guardas moram nos layouts e nas actions. |
| Idempotência de jobs | **Existe.** `notification_dispatches` impede envio repetido. |
| Cron protegido | **Existe.** `CRON_SECRET`, e a rota recusa tudo se não estiver configurado. |

A ausência de rate limiting é o risco mais concreto da lista: o login aceita
tentativas sem limite, e o Argon2 é caro por construção — o que transforma o
próprio mecanismo de segurança em vetor de esgotamento de recurso.

---

## 12. Pontos já corretos, que não devem ser mexidos

1. **RLS completo**, com política em todas as 38 tabelas de paróquia.
2. **Todas as Server Actions guardadas.**
3. **Sigilo sacramental estrutural**: o registro de confissão guarda apenas a
   data. Não existe campo de texto no banco onde algo dito em confissão possa
   ser escrito — a proteção não depende de política, depende da estrutura.
4. **Separação explícita** entre missas/confissões (privadas do fiel) e
   sacramentos (visíveis à paróquia), dita ao usuário na própria tela.
5. **Idempotência do robô diário**, com carimbo gravado na mesma transação que
   cria o aviso.
6. **Política de privacidade pública e específica**, que lista os campos um a
   um e trata dado religioso (LGPD art. 5º II) e crianças (art. 14).
7. **Agregação com limiar mínimo** (5 registros) para não permitir dedução de
   indivíduo em comunidade pequena.
8. **Comentários que explicam o porquê**, não o quê — inclusive registrando
   decisões descartadas.

---

## 13. Riscos, por prioridade

### P0 — atingem todo mundo, ou já aconteceram

1. **Sem fronteira de erro.** Qualquer exceção de servidor vira "Application
   error" para o fiel. Já ocorreu duas vezes.
2. **Sem recuperação de senha usável.** Num piloto com gente mais velha, isso
   acontece na primeira semana e não há saída.
3. **Sem rate limiting no login.** Argon2 caro + tentativas ilimitadas.

### P1 — degradam confiança ou operação

4. **Migration manual antes do deploy.** O passo já foi esquecido, e o efeito é
   tela quebrada em produção.
5. **Sem log de auditoria.** Não há como responder "quem mudou o papel desta
   pessoa" — relevante para uma ferramenta com dado sensível.
6. **Sem testes E2E.** Nenhum fluxo completo é verificado automaticamente.

### P2 — qualidade e alcance

7. **Sem página offline** nem estratégia de cache: sem rede, o app não abre.
8. **Uma imagem sem `alt`.**
9. **Acessibilidade não medida** — contraste, teclado e leitor de tela.

---

## 14. Divergências entre documentação e código

Nenhum link quebrado em `README.md` nem em `docs/*.md`.

Uma ressalva de contexto: o `README.md` descreve o estado da **primeira fatia**
do projeto e diz que "catequese, liturgia, dízimo, confissão, sacramentos
completos" ficam para etapas futuras. Todos esses módulos **já existem** no
código. O texto envelheceu e induz a erro quem chegar agora.

---

## 15. O que a Fase 0 não cobriu

Por definição, esta fase leu o código sem executá-lo. Ficam para as fases
seguintes, e exigem execução:

- contraste de cores medido e navegação por teclado;
- comportamento real sob rede ruim e offline;
- desempenho (tamanho de bundle, tempo até interação);
- verificação de que as políticas de RLS **de fato** recusam acesso cruzado em
  produção, e não apenas em teste.
