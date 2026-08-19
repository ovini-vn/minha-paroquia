# Arquitetura da Plataforma de Vida Paroquial

Documento de arquitetura técnica, derivado do PRD v1.0. Serve como base de decisão
antes de qualquer implementação. Nenhum código foi escrito ainda — este documento
precisa de aprovação antes da Fatia 1 começar.

---

## 0. Ambiguidades do PRD e decisões propostas para o MVP

O PRD é sólido em produto, mas deixa lacunas técnicas propositais ("a implementação
pode alterar nomes", "a metodologia exata deverá ser definida"). Abaixo, cada lacuna
com uma decisão recomendada — sinalizadas para sua aprovação, não decididas
unilateralmente.

| # | Ambiguidade | Decisão proposta para o MVP | Reversível depois? |
|---|---|---|---|
| 1 | Seção 5 permite múltiplos vínculos ativos, mas o fluxo (seção 4) é de convite único | MVP: **um vínculo ativo por vez** (`parish_memberships.status = active`, unique por usuário). Histórico de vínculos anteriores fica registrado. Multi-vínculo simultâneo vira P2 | Sim — schema já suporta N vínculos, só a regra de negócio muda |
| 2 | Dependentes (filhos) "podem ter perfis vinculados" — mas crianças não devem ter login próprio | MVP: dependente é um **perfil sem credenciais** (linha em `family_members` sem `user_id` obrigatório). Ao atingir maioridade/quando apropriado, o responsável pode "promover" o perfil para uma conta própria, preservando o histórico (catequese, sacramentos) | Sim |
| 3 | Reflexão pós-missa é privada, mas a paróquia recebe "indicadores agregados anônimos" | Precisa de um **job de agregação** (não é só uma query on-the-fly) que calcula % e temas frequentes sem expor `user_id`. Entra no MVP como job simples (cron diário), não IA de tópicos ainda — "temas" fica manual/tags no P1, extração automática de tema fica P3 | — |
| 4 | "NPS da Homilia" pressupõe uma instância identificável de homilia/celebração para atrelar a nota | Precisa da entidade `celebrations` (uma missa específica, com data/hora/sacerdote) já no P1, mesmo que o módulo de nota em si seja P2 | — |
| 5 | Sacramentos: fiel cadastra, paróquia "pode validar" | Campo `status: self_reported \| validated`, com `validated_by` e `validated_at`. Sem validação, o registro é só memória pessoal do fiel, nunca é fonte oficial | — |
| 6 | Dízimo é P2/P3, mas indicadores (seção 34) implicam algum tracking de participação já no P1 ("Minha Participação" na Home, seção 29) | MVP: `participation_records` genérico registra **presença de participação** (ex.: "contribuiu em agosto") **sem valores monetários**. Valores, recorrência e pagamento entram só no P2 quando houver gateway definido | — |
| 7 | "Delegar permissões" (pároco delega a outros) sugere RBAC customizável por recurso | MVP: **papéis fixos** por vínculo (`role` enum em `parish_memberships`), sem editor de permissões granular. Delegação fina (ex.: "esse coordenador pode editar catequese mas não liturgia") vira P2 com uma tabela `permission_overrides` | Sim — desenhamos o guard de autorização já pensando numa segunda camada de overrides |
| 8 | Diocese (P3) não deve limitar o schema hoje | `parishes` já carrega `diocese_id` nullable desde o P1, mesmo sem tela nenhuma de diocese. Custa nada agora, evita migração dolorosa depois | — |
| 9 | Notificações "push" pressupõem app nativo, mas o MVP é PWA web | MVP usa **Web Push** (PWA) + notificação in-app + fallback e-mail. WhatsApp/SMS ficam P3 confirmados no PRD | — |
| 10 | Confissão: "categoria" no agendamento não conflita com a regra de não armazenar conteúdo — confirmando entendimento | Categoria é um enum fechado (`confissao \| direcao_espiritual \| conversa \| familiar \| sacramento \| outro`), sem campo de texto livre nessa etapa. Nenhuma tabela tem coluna de "descrição do pecado/problema" | — |

Se alguma dessas decisões não for o que você tinha em mente, me avise antes de eu seguir para a implementação — é mais barato mudar aqui do que depois do schema pronto.

---

## A. Arquitetura geral

```text
                        ┌─────────────────────────┐
                        │   Web App (PWA, React)  │
                        │  app do Fiel + Painel    │
                        │  da Paróquia (mesma SPA, │
                        │  rotas por role)         │
                        └───────────┬─────────────┘
                                    │ HTTPS / REST (JSON)
                                    ▼
                        ┌─────────────────────────┐
                        │      API Backend         │
                        │  (Node.js + TypeScript)  │
                        │  - Auth                  │
                        │  - Guards de autorização │
                        │  - Middleware de tenant  │
                        │    (parish_id)           │
                        └───┬───────────┬──────────┘
                            │           │
                 ┌──────────┘           └───────────┐
                 ▼                                   ▼
     ┌───────────────────────┐          ┌────────────────────────┐
     │   PostgreSQL           │          │  Fila (Redis + BullMQ) │
     │  - RLS por parish_id   │          │  - notificações        │
     │  - dados relacionais   │          │  - agregação de        │
     │                        │          │    reflexões (cron)    │
     └───────────────────────┘          │  - lembretes de agenda │
                                          └────────────────────────┘
                 ▲
                 │
     ┌───────────────────────┐
     │  Storage de mídia      │
     │  (S3-compatible: R2)   │
     │  fotos, áudio, vídeo   │
     │  da Palavra do Padre   │
     └───────────────────────┘
```

Um único backend modular (não microsserviços) — o domínio ainda é pequeno o
suficiente, e microsserviços aumentariam custo operacional sem benefício real no
MVP. Módulos internos bem separados (auth, membership, community, servir,
caminhada, admin) para permitir extração futura se necessário.

**Multi-tenant desde o dia 1**: toda tabela com dado paroquial carrega `parish_id`.
Não existe modo "single-tenant" a ser migrado depois.

---

## B. Modelo de dados (MVP P1, com ganchos para P2/P3)

Convenções: `id` = UUID; toda tabela tenant-scoped tem `parish_id`, `created_at`,
`updated_at`; exclusões são lógicas (`deleted_at`) onde fizer sentido para auditoria.

### Identidade e vínculo

```text
users
  id, email, phone, password_hash, full_name, photo_url,
  created_at, updated_at
  -- NÃO tem parish_id: um usuário pode, no futuro, ter vínculos com >1 paróquia

parishes
  id, name, slug, diocese_id (nullable, P3), address, timezone,
  logo_url, created_at

invites
  id, parish_id, code (unique), type (link|qrcode|individual),
  created_by (user_id do pároco/secretaria), max_uses (nullable),
  used_count, expires_at, created_at

parish_memberships
  id, user_id, parish_id, role (fiel|responsavel_familiar|catequista|
    sacerdote|paroco|secretaria|coordenador_pastoral|coordenador_liturgia),
  status (active|inactive|transferred), invite_id (nullable),
  joined_at, left_at (nullable)
  -- unique(user_id) WHERE status = 'active'  → 1 vínculo ativo no MVP

platform_admins
  id, user_id, created_at
  -- fora do escopo de parish_id, gerencia a plataforma toda
```

### Família

```text
families
  id, parish_id, name (ex.: "Família Silva")

family_members
  id, family_id, user_id (nullable — dependente sem login),
  relationship (conjuge|filho|pai|mae|dependente),
  full_name, birth_date, promoted_to_user_at (nullable)
```

### Comunidade, sacerdotes, agenda

```text
priest_profiles
  id, user_id, parish_id, title (paroco|vigario|colaborador),
  bio, photo_url, display_order

priest_availability
  id, priest_profile_id, weekday, start_time, end_time,
  type (atendimento|confissao)

appointments
  id, parish_id, priest_profile_id, fiel_user_id,
  category (confissao|direcao_espiritual|conversa|familiar|sacramento|outro),
  scheduled_at, status (solicitado|confirmado|cancelado|concluido)
  -- SEM campo de descrição livre / conteúdo

celebrations
  id, parish_id, type (missa|confissao|adoracao|batizado|casamento|outro),
  starts_at, ends_at, location, priest_profile_id (nullable),
  is_recurring, recurrence_rule (nullable)

events
  id, parish_id, title, description, starts_at, ends_at, location,
  pastoral_id (nullable), created_by

posts   -- "Palavra do Padre" e avisos
  id, parish_id, author_priest_id, type (palavra|aviso),
  media_type (texto|audio|video), content_text, media_url,
  visibility (publico|segmentado), published_at
```

### Servir

```text
pastorals
  id, parish_id, name, description, coordinator_user_id

pastoral_members
  id, pastoral_id, user_id, joined_at

volunteer_profiles
  id, user_id, parish_id, has_time (bool), has_talent (bool),
  wants_to_serve (bool), talents (text[]), availability_note,
  free_text (nullable)

service_opportunities
  id, parish_id, pastoral_id (nullable), title, description,
  needed_roles (text[]), starts_at (nullable), status (aberta|encerrada),
  created_by

service_interests
  id, opportunity_id, user_id, status (manifestado|em_contato|acolhido|declinado),
  created_at
```

### Liturgia (estrutura entra no P1, telas completas no P2 — ver seção K)

```text
liturgical_roles
  id, parish_id, name (leitor|salmista|ministro|acolhida|musica|outro)

liturgical_availability
  id, user_id, liturgical_role_id, weekday_pref, notes

liturgical_schedules
  id, celebration_id, liturgical_role_id, user_id, confirmed (bool)
```

### Caminhada

```text
mass_participations
  id, user_id, celebration_id, registered_at

reflections
  id, user_id, celebration_id (nullable), content_text,
  visibility (privada), created_at
  -- nunca exposta individualmente à paróquia; só via view agregada

reflection_aggregates   -- materializado pelo job de agregação
  id, parish_id, celebration_id, period, response_rate,
  top_tags (text[]), computed_at

sacraments
  id, user_id, type (batismo|primeira_eucaristia|crisma|matrimonio|outro),
  date, location, priest_profile_id (nullable), note,
  status (self_reported|validated), validated_by (nullable), validated_at (nullable)

confession_log
  id, user_id, date_only
  -- SOMENTE a data. Nenhum outro campo.

formations
  id, parish_id, title, starts_at, ends_at
formation_attendances
  id, formation_id, user_id
```

### Catequese

```text
catechism_groups
  id, parish_id, name, year

catechumens
  id, catechism_group_id, family_member_id, responsible_user_id

catechist_assignments
  id, catechism_group_id, catechist_user_id

catechism_sessions
  id, catechism_group_id, date

catechism_attendance
  id, catechism_session_id, catechumen_id, present (bool)

rites
  id, catechumen_id, type, date, status
```

### Participação (dízimo sem valores no P1) e pedidos de oração

```text
participation_records
  id, user_id, parish_id, dimension (dizimo|liturgia|servico|catequese),
  period (ex.: "2026-08"), participated (bool)

prayer_requests
  id, parish_id, requester_user_id, content_text,
  visibility (padre|comunidade), is_anonymous (bool), created_at
```

### Notificações e auditoria

```text
notifications
  id, user_id, parish_id, category (urgente|pessoal|pastoral|espiritual),
  title, body, read_at, created_at

notification_preferences
  id, user_id, category, channel (in_app|push|email), enabled (bool)

audit_logs
  id, parish_id, actor_user_id, action, entity_type, entity_id,
  metadata (jsonb), created_at
  -- nunca registra conteúdo de confissão/atendimento
```

---

## C. Sistema de permissões

Duas camadas, ambas no backend (nunca confiar no frontend, conforme seção 35 do PRD):

1. **Contexto de tenant** — todo request autenticado carrega a `active parish_membership`
   do usuário (ou, para `platform_admins`, um contexto explícito de qual paróquia está
   administrando). Um middleware injeta `parish_id` no contexto da requisição; toda
   query de repositório é obrigada a recebê-lo — não existe query "sem tenant" para
   tabelas tenant-scoped (isso é reforçado por tipos no código, não por convenção).

2. **RBAC por papel** — cada `role` em `parish_memberships` mapeia para um conjunto
   fixo de permissões (guard declarativo por endpoint, ex.:
   `@RequireRole('paroco', 'secretaria')`). Nada de matriz de permissão editável no
   MVP — isso é P2 (`permission_overrides`, ambiguidade #7 acima).

3. **Defesa em profundidade com Postgres RLS** — além do filtro na camada de
   aplicação, ativamos Row-Level Security nas tabelas tenant-scoped, com policy
   baseada numa variável de sessão (`SET app.current_parish_id`) setada no início de
   cada transação. Se um bug na aplicação esquecer o filtro, o banco ainda bloqueia
   o acesso cross-tenant. Isso é o que garante, na prática, a regra "um usuário não
   pode acessar dados alterando IDs manualmente" (seção 35).

4. **Classificação de dado sensível** (seção 6) é resolvida por *não existir campo*
   para o dado mais sensível (confissão) e por checagem de role explícita para o
   resto (ex.: catequista nunca tem endpoint que retorne `participation_records`
   dimension=`dizimo`).

---

## D. Fluxos principais

### D.1 — Convite → vínculo

```text
Pároco/secretaria cria invite (link/QR/código)
        │
Fiel acessa app.com/convite/{code}
        │
Backend valida: invite ativo? não excedeu max_uses? não expirou?
        │
Fiel cria conta (ou faz login se já tem conta na plataforma)
        │
Backend cria parish_membership (status=active, role=fiel)
   → se já havia vínculo ativo com outra paróquia, este é marcado
     'transferred' (decisão #1) e o novo vira o único ativo
        │
Redirect para Home personalizada da nova comunidade
```

### D.2 — Atendimento pastoral

```text
Fiel escolhe sacerdote → escolhe horário livre (priest_availability
  menos appointments já ocupados) → escolhe categoria (enum fechado)
  → confirma → appointment criado (status=solicitado)
        │
Sacerdote confirma/recusa → notificação ao fiel
```

### D.3 — Eu Posso Ajudar → Servir

```text
Fiel preenche volunteer_profile (tempo/talento/quero servir)
        │
Paróquia/pastoral cria service_opportunity
        │
Sistema mostra oportunidades compatíveis (match simples por tags,
  NÃO é match automático — é apenas filtro/ordenação, seção 21)
        │
Fiel manifesta interesse → service_interest (status=manifestado)
        │
Responsável da pastoral entra em contato manualmente → atualiza status
```

### D.4 — Reflexão pós-missa e agregação

```text
Fiel registra mass_participation numa celebration
        │
App sugere: "O que você aprendeu hoje?" → reflection (privada)
        │
Job noturno (BullMQ cron) agrega por celebration/period:
  response_rate, top_tags → grava em reflection_aggregates
        │
Painel da paróquia lê SOMENTE reflection_aggregates, nunca reflections
```

---

## E. Stack recomendada

| Camada | Escolha | Justificativa |
|---|---|---|
| Linguagem | TypeScript ponta a ponta | Um único time, um único modelo mental; tipos compartilhados entre API e frontend reduzem bug de contrato |
| Backend | Node.js + NestJS | Estrutura modular com DI e guards nativos casa bem com a exigência de autorização no backend em toda tabela tenant-scoped; evita reinventar middleware de auth/RBAC que um Express cru exigiria |
| ORM | Prisma | Migrations versionadas, schema como fonte única de verdade, boa DX; dá para acoplar RLS via `SET` de variável de sessão em middleware do Prisma |
| Banco | PostgreSQL | Suporta RLS nativamente (crítico para isolamento multi-paróquia), relacional forte para família/sacramentos/vínculos, JSONB para metadata de auditoria |
| Fila/cache | Redis + BullMQ | Notificações, jobs de agregação de reflexão, lembretes de agenda — tudo assíncrono desde o P1 |
| Storage de mídia | S3-compatible (Cloudflare R2) | Custo menor que S3 puro, mesma API; fotos/áudio/vídeo da Palavra do Padre |
| Frontend | Next.js (React) + PWA | Responsivo web hoje, PWA instalável, mesma base de componentes reaproveitável depois num wrapper mobile (Capacitor) ou React Native, sem reescrever a lógica de domínio |
| Estilo | Tailwind CSS + biblioteca de componentes própria (não um design system corporativo pronto) | Seção 43 pede identidade "igreja + comunidade", não aparência de ERP — melhor não herdar a estética de um kit de admin dashboard |
| API | REST (`/api/v1/...`), JSON | Superfície pequena de recursos por enquanto; REST é mais simples de proteger endpoint-a-endpoint com guards de role do que resolver autorização por campo em GraphQL |
| Auth | JWT (access curto + refresh), Argon2 para senha, opção de magic link por e-mail | Público inclui fiéis menos tech-savvy; magic link reduz fricção de cadastro via convite |
| Hospedagem | Backend + Postgres + Redis num único provedor gerenciado (Railway ou Fly.io); frontend na Vercel | Time pequeno, sem necessidade de Kubernetes no MVP; migração para infra maior é possível depois sem reescrever nada |
| Observabilidade | Sentry (erros) + logs estruturados | Auditoria de negócio já é `audit_logs`; isso aqui é operacional |

---

## F. Estrutura de pastas (monorepo)

```text
app-paroquial/
├── apps/
│   ├── api/                     # NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── invites/
│   │   │   │   ├── membership/
│   │   │   │   ├── families/
│   │   │   │   ├── community/       # sacerdotes, agenda, celebrations, posts
│   │   │   │   ├── pastoral-care/   # appointments
│   │   │   │   ├── servir/          # volunteer, opportunities, interests
│   │   │   │   ├── liturgia/
│   │   │   │   ├── caminhada/       # participations, reflections, sacraments
│   │   │   │   ├── catequese/
│   │   │   │   ├── notifications/
│   │   │   │   ├── admin/           # painel da paróquia
│   │   │   │   └── platform-admin/
│   │   │   ├── common/
│   │   │   │   ├── guards/          # RoleGuard, TenantGuard
│   │   │   │   ├── decorators/
│   │   │   │   └── middleware/
│   │   │   └── jobs/                 # BullMQ processors
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── web/                      # Next.js
│       ├── app/
│       │   ├── (fiel)/                # rotas do app do fiel
│       │   │   ├── inicio/
│       │   │   ├── comunidade/
│       │   │   ├── servir/
│       │   │   ├── caminhada/
│       │   │   └── perfil/
│       │   ├── (admin)/               # painel da paróquia
│       │   ├── convite/[code]/
│       │   └── (auth)/
│       ├── components/
│       │   ├── ui/                    # botão, card, etc — base
│       │   └── domain/                # PriestCard, EventCard, etc
│       └── lib/
├── packages/
│   ├── shared-types/              # DTOs/enums compartilhados API↔web
│   └── config/                    # eslint, tsconfig base
└── docs/
    └── ARQUITETURA.md             # este arquivo
```

---

## G. API (endpoints principais do P1, REST sob `/api/v1`)

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/magic-link

GET    /invites/:code               # valida convite (público)
POST   /invites                     # cria (pároco/secretaria)
POST   /invites/:code/accept        # aceita vínculo

GET    /me
GET    /me/memberships
GET    /me/home                     # agregando "próximo compromisso" etc.

GET    /parishes/:id
GET    /parishes/:id/priests
GET    /parishes/:id/pastorals
GET    /parishes/:id/celebrations
GET    /parishes/:id/events
GET    /parishes/:id/posts          # Palavra do Padre / avisos

GET    /priests/:id
GET    /priests/:id/availability
POST   /appointments
PATCH  /appointments/:id            # confirmar/cancelar

POST   /volunteer-profile
GET    /service-opportunities
POST   /service-opportunities/:id/interest
PATCH  /service-interests/:id       # atualizar status (coordenador)

POST   /mass-participations
POST   /reflections
GET    /reflection-aggregates       # somente admin/pároco

POST   /sacraments
PATCH  /sacraments/:id/validate     # somente secretaria/pároco
POST   /confession-log

GET    /notifications
PATCH  /notifications/:id/read
PUT    /notification-preferences

# Painel da paróquia
GET    /admin/dashboard
GET    /admin/members
GET    /admin/families
POST   /admin/pastorals
POST   /admin/events
```

Cada endpoint tenant-scoped resolve `parish_id` do vínculo ativo do usuário
autenticado (ou de um path param validado contra esse vínculo) — nunca de um body
não verificado.

---

## H. Telas necessárias (P1)

**App do Fiel**
1. Onboarding via convite (`/convite/:code`)
2. Cadastro / login / magic link
3. Home
4. Minha Comunidade (hub) → Agenda, Celebrações, Sacerdotes, Pastorais, Avisos
5. Perfil do sacerdote (bio, Palavra, agenda, botão de atendimento)
6. Agendamento de atendimento pastoral
7. Palavra do Padre (feed + player de áudio/vídeo)
8. Servir (hub) → Eu Posso Ajudar (formulário) → lista de oportunidades → detalhe
9. Minha Caminhada (hub) → registrar participação em missa, reflexão, sacramentos,
   confissão (só data), formações
10. Notificações (lista + preferências)
11. Meu perfil / minha família

**Painel da Paróquia**
1. Dashboard ("Hoje" + indicadores)
2. Gestão de convites
3. Gestão de membros/famílias
4. Gestão de sacerdotes e disponibilidade
5. Gestão de agenda/celebrações/eventos
6. Publicação de Palavra do Padre / avisos
7. Gestão de pastorais e oportunidades de serviço
8. Interessados em servir (funil manual, seção 21)
9. Validação de sacramentos

---

## I. Componentes reutilizáveis (frontend)

```text
ui/          Button, Card, Badge, Avatar, Tabs, Modal, EmptyState,
             FormField, DateTimePicker, AudioPlayer, MediaUploader

domain/      PriestCard, CelebrationListItem, EventCard, PostCard
             (texto/áudio/vídeo), OpportunityCard, ReflectionPrompt,
             SacramentTimelineItem, NotificationItem, RoleBadge,
             ParishHeader, NextCommitmentBanner
```

A regra de UX da seção 42/43 (acolhedor, sem gamificação, sem aparência de ERP)
deve virar guideline de design tokens desde o primeiro componente — cor, tipografia
e microcopy revisados antes de virar padrão replicado em 40 telas.

---

## J. Riscos técnicos e de produto

| Risco | Tipo | Mitigação |
|---|---|---|
| Vazamento cross-tenant por bug de query | Técnico, alto impacto | RLS no Postgres como segunda camada (seção C.3), testes automatizados de isolamento por tenant desde a Fatia 2 |
| Reflexões privadas vazando individualmente para a paróquia | Produto/privacidade | Painel admin nunca tem endpoint que leia `reflections` diretamente — só `reflection_aggregates`, reforçado por guard de role no backend |
| Convite vazando/sendo reusado indevidamente | Segurança | `max_uses`, `expires_at`, rate limit no endpoint público de validação de convite |
| "Match automático" sendo implementado sem querer por conveniência técnica (ex.: auto-atribuir voluntário à vaga) | Produto | `service_interests` nunca muda `service_opportunities.status` sozinho; sempre exige ação humana do coordenador |
| Dízimo evoluindo para linguagem de cobrança nas notificações (P2) | Produto | Copy de notificação de participação revisada contra a lista de termos proibidos da seção 30 antes do ship |
| PWA com push notification tendo suporte inconsistente em iOS Safari | Técnico | Fallback sempre em e-mail + in-app; não depender de push como único canal para nada crítico |
| Agregação de reflexões com N pequeno expondo indivíduo por dedução (ex.: só 1 pessoa participou) | Privacidade | `reflection_aggregates` só populado quando `count >= limiar mínimo` (ex. 5); abaixo disso, mostra "dados insuficientes" |
| Crescimento para multi-vínculo (P2) exigir migração de dado | Técnico | Schema já suporta N `parish_memberships` por user; só a constraint de unicidade muda — migração é barata |

---

## K. MVP P1 / P2 / P3 — leitura técnica

**P1 (already detalhado nas seções B–H acima)** cobre: convite, vínculo, Home,
Comunidade, Sacerdotes, Palavra do Padre, agenda, atendimento pastoral (sem
conteúdo), Servir, Caminhada básica (participação, reflexão privada, sacramentos
auto-declarados, log de confissão), notificações, painel administrativo básico.

**P2** adiciona: catequese completa (fluxo de presença/ritos), liturgia completa
(escalas), família com múltiplos vínculos simultâneos, validação oficial de
sacramentos em massa, dízimo com valores/pagamento (exige decisão de gateway —
Stripe/PagSeguro/Asaas a avaliar quando chegarmos lá), pedidos de oração,
indicadores pastorais agregados, `permission_overrides` para delegação fina.

**P3**: diocese (multi-paróquia hierárquico), integrações financeiras avançadas,
WhatsApp, IA (recomendação de serviço, análise de homilia), app mobile nativo
(reaproveitando `packages/shared-types` e a lógica de domínio do Next.js via
React Native ou Capacitor).

---

## L. Plano de implementação em fatias testáveis

Cada fatia é vertical (schema → API → tela) e termina em algo demonstrável, não em
uma camada isolada.

1. **Fundação** — monorepo, NestJS + Prisma + Postgres local, Next.js base, CI
   rodando lint/test, guard de tenant e RLS já configurados (mesmo sem tabelas de
   negócio ainda) — provar o isolamento antes de construir em cima dele.
2. **Autenticação** — cadastro/login/refresh, sem convite ainda (usuário de teste
   criado manualmente numa paróquia seed).
3. **Multi-paróquia + convite** — `parishes`, `invites`, `parish_memberships`;
   fluxo completo `/convite/:code` → cadastro → vínculo.
4. **Home mínima** — `/me/home` retornando saudação + nome da paróquia (sem
   compromissos ainda).
5. **Comunidade: sacerdotes e agenda** — `priest_profiles`, `celebrations`,
   `events`; tela de Comunidade e perfil do sacerdote.
6. **Palavra do Padre** — `posts` com upload de mídia; feed no app do fiel;
   publicação no painel.
7. **Atendimento pastoral** — `priest_availability`, `appointments`; agendamento
   fim a fim.
8. **Servir** — `volunteer_profiles`, `service_opportunities`,
   `service_interests`; fluxo "Eu Posso Ajudar" → manifestação de interesse.
9. **Caminhada básica** — `mass_participations`, `reflections` (privadas),
   `sacraments` (auto-declarados), `confession_log`.
10. **Agregação de reflexões + job assíncrono** — primeira integração com
    BullMQ/Redis; painel admin lendo `reflection_aggregates`.
11. **Notificações** — categorias, preferências, web push + e-mail.
12. **Painel administrativo P1 completo** — dashboard, gestão de membros/famílias,
    convites, validação de sacramentos.

Cada fatia inclui testes de isolamento multi-tenant (garantir que usuário da
Paróquia A nunca lê dado da Paróquia B) antes de ser considerada "pronta".

---

*Aguardando aprovação antes de iniciar a Fatia 1.*
