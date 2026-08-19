# Fundação técnica — "Comunidade"

Proposta para a primeira fatia de implementação (itens A–L do escopo combinado).
Nenhum código foi escrito ainda — este documento aguarda aprovação.

---

## FASE 1 — Inspeção do ambiente

`C:\Users\Vini_\Documents\App Paroquial` contém apenas `docs/ARQUITETURA.md`
(análise de arquitetura da etapa anterior). Não há `package.json`, `.git`, banco,
código ou configuração. Não há nada a preservar ou migrar — projeto genuinamente
novo. A proposta abaixo **refina** a arquitetura de `ARQUITETURA.md` para esta
fatia específica; onde ela diverge da versão anterior (principalmente na
organização de pastas), explico o porquê.

---

## FASE 2 — Stack proposta

Mesma base de `ARQUITETURA.md` (TypeScript ponta a ponta, PostgreSQL, Prisma),
com uma decisão nova que precisa da sua aprovação: **um único app Next.js
full-stack**, em vez de API separada (NestJS) + frontend. Ver Decisão 1 abaixo —
isso muda a estrutura de pastas da proposta anterior.

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 14+ (App Router), TypeScript | Full-stack num só deploy: Server Actions/Route Handlers cobrem a API, React cobre a UI |
| Banco | PostgreSQL | Suporta RLS nativamente — necessário para a Decisão 2 |
| ORM | Prisma | Migrations versionadas; schema único fonte de verdade |
| Auth | Implementação própria: Argon2 (senha) + JWT em cookie httpOnly + tabela de sessões (permite logout remoto/revogação) | NextAuth existe, mas o fluxo de convite → vínculo → "comunidade ativa na sessão" é específico o suficiente para não valer a pena encaixar num provider genérico |
| Estilo | Tailwind CSS | Rápido de manter consistente com a identidade "acolhedora" (seção 43 do PRD) sem herdar estética de dashboard corporativo |
| Validação | Zod | Mesmo schema valida formulário no client e payload no server |
| Testes | Vitest + Testing Library (unitário/integração), sem e2e ainda | Fluxos críticos desta fase são testáveis a nível de serviço/API, e2e (Playwright) entra quando houver mais telas |
| Local DB | Docker Compose (Postgres) — ver Decisão 3 | `docker compose up` como único pré-requisito de infra |

---

## FASE 3 — Modelo de dados

Escopo mínimo para esta fatia — sem `families`/`family_members` (ver Decisão 4)
e sem qualquer tabela de conteúdo (posts, eventos, etc.), que pertencem à
próxima fatia.

```text
users
  id, email (unique), password_hash, full_name, photo_url,
  is_platform_admin, created_at, updated_at

parishes
  id, name, slug (unique), created_at, updated_at

parish_memberships
  id, user_id, parish_id, role_id, status (active|inactive),
  invitation_id (nullable), joined_at, left_at (nullable)
  -- unique(user_id) WHERE status = 'active'  → 1 comunidade ativa no MVP

roles
  id, code (FIEL|RESPONSAVEL_FAMILIAR|CATEQUISTA|SACERDOTE|PAROCO|
    SECRETARIA|COORDENADOR_PASTORAL|COORDENADOR_LITURGIA), name, is_parish_scoped
  -- ADMIN_PLATFORM NÃO entra aqui — ver nota abaixo

permissions
  id, code (ex.: "invitations.create", "members.view", "dashboard.parish.view")

role_permissions
  id, role_id, permission_id
  -- seed a partir de código (RBAC.md/constants), não editável por UI ainda

invitations
  id, parish_id, code (unique, alta entropia), type (link|qrcode|individual),
  status (pending|used|expired|revoked), max_uses (nullable), used_count,
  created_by (user_id), expires_at (nullable), used_by (user_id, nullable),
  used_at (nullable), created_at

sessions
  id, user_id, token_hash, expires_at, created_at, revoked_at (nullable)
  -- permite logout remoto e invalidação (ex.: troca de senha)

password_reset_tokens
  id, user_id, token_hash, expires_at, used_at (nullable), created_at
```

### Relacionamentos

```text
users 1───N parish_memberships N───1 parishes
parish_memberships N───1 roles
roles N───N permissions  (via role_permissions)
parishes 1───N invitations
invitations 1───1 parish_memberships (opcional, quando o vínculo nasceu de convite)
users 1───N sessions
users 1───N password_reset_tokens
```

`ADMIN_PLATFORM` **não é um role de `parish_memberships`** — é um atributo do
usuário (`users.is_platform_admin`), porque não está vinculado a nenhuma
paróquia. Um platform admin não pertence a uma comunidade só por ser admin da
plataforma.

**Por que `roles`/`permissions` como tabelas reais em vez de enum fixo:**
você pediu explicitamente essas duas tabelas e uma arquitetura extensível sem
refatoração. Uma tabela seedada (não editável por UI ainda) dá exatamente isso —
adicionar uma permissão nova mais tarde é uma linha de seed, não uma migração
estrutural. O custo é um join a mais em cada checagem de autorização, irrelevante
nesta escala.

---

## FASE 4 — Estrutura de pastas

Assumindo a Decisão 1 (monólito Next.js). Isso substitui o layout de monorepo
proposto em `ARQUITETURA.md` seção F — mais simples para esta fase, sem perder a
separação de camadas que a seção 11 do seu pedido exige.

```text
comunidade/
├── docker-compose.yml            # Postgres local
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx
│   │   │   ├── recuperar-acesso/page.tsx
│   │   │   └── convite/[code]/page.tsx
│   │   ├── (fiel)/
│   │   │   ├── layout.tsx            # navegação principal (tab bar)
│   │   │   ├── inicio/page.tsx
│   │   │   ├── caminhada/page.tsx    # "Em construção"
│   │   │   ├── comunidade/page.tsx   # "Em construção"
│   │   │   ├── servir/page.tsx       # "Em construção"
│   │   │   └── eu/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── painel/page.tsx       # dashboard da paróquia
│   │   ├── api/
│   │   │   └── auth/[...]/route.ts   # rotas finas, delegam a src/server
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                       # Button, Card, TabBar, EmptyState...
│   │   └── layout/                   # ParishHeader, NavBar
│   ├── server/
│   │   ├── auth/                     # hashing, sessão, cookies, guards
│   │   ├── modules/
│   │   │   ├── users/
│   │   │   ├── parishes/
│   │   │   ├── memberships/
│   │   │   ├── invitations/
│   │   │   └── permissions/
│   │   │       (cada módulo: service.ts, repository.ts, schema.ts)
│   │   ├── db/
│   │   │   ├── prisma.ts             # client singleton
│   │   │   └── tenant-context.ts     # withTenantContext() — ver Decisão 2
│   │   └── shared/                   # AppError, result types
│   ├── lib/                          # zod schemas client-safe, utils
│   └── types/
├── tests/
│   ├── integration/                  # fluxos críticos da seção 13
│   └── unit/
├── .env.example
├── README.md
└── package.json
```

Regra de dependência: componentes em `app/` e `components/` nunca importam
Prisma diretamente nem contêm regra de negócio — só chamam funções de
`src/server/modules/*/service.ts` (via Server Action ou Route Handler fino).

---

## Fluxo de autenticação

```text
Cadastro: email+senha → Argon2 hash → users
Login: valida hash → cria session (token assinado, cookie httpOnly, secure,
  sameSite=lax) → sessions (hash do token para permitir revogação)
Logout: revoga a session correspondente
Recuperar acesso: gera password_reset_token → em dev, o link é logado no
  console/terminal (sem provedor de e-mail configurado ainda — ver Decisão 5)
Sessão carrega: user_id + parish_membership ativo (id da paróquia + role)
  → toda rota logada sabe automaticamente qual é "a comunidade ativa"
```

---

## Fluxo de convite

```text
Pároco/secretaria (autorizado) cria invitation → code gerado (nanoid, alta
  entropia, ~21 chars) → parish_id, type, expires_at opcional
        │
Fiel acessa /convite/{code} (rota pública)
        │
Backend valida: status=pending? não expirou? max_uses não excedido?
  → se inválido, mensagem clara ("Este convite não é mais válido")
  → se válido, mostra "Você foi convidado para a Paróquia X"
        │
Fiel cria conta OU faz login (se já tem conta)
        │
Aceita convite → cria parish_membership (role=FIEL, status=active,
  invitation_id=X) → invitation.status=used, used_by, used_at
  → se já havia vínculo ativo, ele passa a status=inactive
        │
Redirect para /inicio
```

O código do convite **não é hash**: é um token de alta entropia (não uma senha),
precisa poder ser reexibido no painel administrativo para reimpressão de QR
Code, e sua exposição no pior caso permite "entrar numa paróquia" — não acessar
dado de terceiros. Proteção real vem de `expires_at`, `max_uses` e rate limit no
endpoint de validação.

---

## Sistema de permissões

```text
Request autenticado
  → sessão resolve user + parish_membership ativo (parish_id, role)
  → guard de rota: @requireRole(...) ou @requirePermission("code")
  → toda query tenant-scoped passa por withTenantContext(parish_id, fn)
```

Nesta fase, os únicos checks reais em uso: quem pode criar convite (PAROCO,
SECRETARIA), quem vê o painel administrativo (PAROCO, SECRETARIA,
ADMIN_PLATFORM), e o fato de qualquer fiel autenticado ver sua própria Home. O
resto do catálogo de permissões fica seedado no banco, pronto para os módulos
futuros usarem sem migração nova.

---

## Plano de implementação (fatias testáveis desta etapa)

1. Scaffold: `create-next-app`, TypeScript, Tailwind, ESLint/Prettier, Vitest,
   `git init`, `.env.example`, README esqueleto.
2. Docker Compose + Prisma init + schema completo desta fase + primeira
   migration + `withTenantContext` (SET LOCAL + RLS policies).
3. Seed: paróquia demo, roles/permissions padrão, 1 platform admin, 1 pároco
   demo.
4. Auth: cadastro, login, logout, hashing, cookie de sessão, recuperar acesso
   (link em console).
5. Convite: criação (admin), validação pública, aceite → vínculo.
6. RBAC básico: guards de rota, helper de contexto de sessão.
7. Layout base: navegação principal do fiel (tab bar), header da paróquia,
   telas placeholder "Em construção" para Caminhada/Comunidade/Servir.
8. Dashboard do fiel: nome, paróquia, avisos (vazio/estado controlado), botão
   "Eu Posso Ajudar" (leva a placeholder), acesso a Comunidade/Caminhada.
9. Dashboard da paróquia: contagem de fiéis, sacerdotes (0 por enquanto),
   convites emitidos/utilizados.
10. Testes dos 9 fluxos críticos listados por você, com foco no teste de
    isolamento cross-tenant (usuário da Paróquia A não lê nada da Paróquia B
    mesmo manipulando IDs).
11. README final + `.env.example` revisado.

---

## Decisões que precisam da sua aprovação

Numeradas para facilitar sua resposta. Recomendação marcada em cada uma.

1. **Monólito Next.js vs. API separada (NestJS + frontend)** — recomendo
   monólito para esta fase (menos peças móveis, mesma separação de camadas via
   `src/server/`), com extração para API separada documentada para quando
   houver app mobile nativo consumindo um contrato estável (P3).
2. **RLS no Postgres (defesa em profundidade) vs. isolamento só na aplicação**
   — recomendo manter RLS mesmo com o custo de complexidade extra, porque o
   teste de isolamento cross-tenant é requisito explícito seu e RLS é o que
   garante isso mesmo se um filtro for esquecido no código.
3. **Postgres via Docker Compose vs. instalado localmente/nuvem gerenciada
   (Neon/Supabase) mesmo em dev** — recomendo Docker Compose por reprodutibilidade
   e por não exigir instalar Postgres no Windows, mas preciso saber se você já
   tem Docker Desktop disponível.
4. **`families`/`family_members` fora desta fatia** — nenhuma tela desta etapa
   precisa disso; entra na fatia de Comunidade/Catequese. Só sinalizando para
   não parecer omissão.
5. **Recuperação de senha sem provedor de e-mail ainda** — em dev, o link de
   reset é logado no console em vez de enviado por e-mail de verdade. Quando
   tivermos um provedor definido (Resend/Postmark/SES), troca-se só a
   implementação de `sendMail`, a interface já fica pronta agora.

Nada foi implementado ainda — aguardando suas respostas antes da Fatia 1.
