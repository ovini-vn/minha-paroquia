# Minha Paróquia

Plataforma multi-paróquia católica — o elo digital entre o fiel, o sacerdote e
sua comunidade. Ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e
[docs/FUNDACAO.md](docs/FUNDACAO.md) para o racional completo do produto e
das decisões técnicas desta primeira fatia.

Esta etapa entrega a fundação: cadastro/login, multi-paróquia com isolamento
por Row-Level Security, fluxo de convite, papéis/permissões básicos, e os
dashboards iniciais do fiel e da paróquia. Catequese, liturgia, dízimo,
confissão, sacramentos completos e qualquer integração externa ficam para
etapas futuras — ver docs/FUNDACAO.md para o que é intencionalmente "Em
construção" nesta versão.

## Stack

- **Next.js 15** (App Router) full-stack — TypeScript ponta a ponta, Server
  Actions como camada de API.
- **PostgreSQL** com **Row-Level Security** por `parish_id` (defesa em
  profundidade além do filtro na aplicação).
- **Prisma** como ORM/migrations.
- **Tailwind CSS** para estilo.
- **Zod** para validação.
- **Argon2** (`@node-rs/argon2`) para hash de senha; sessão por token opaco
  em cookie httpOnly (não JWT — ver `src/server/auth/session.ts`).
- **Vitest** para testes.

Ver [docs/FUNDACAO.md](docs/FUNDACAO.md) seção "Fase 2" para a justificativa
de cada escolha.

## Requisitos

- Node.js 20+
- Um banco PostgreSQL — recomendado um projeto gratuito no
  [Neon](https://neon.tech) ou [Supabase](https://supabase.com) (não há
  Docker configurado neste ambiente; ver decisão registrada em
  docs/FUNDACAO.md)

## Instalação

```bash
npm install
```

## Configuração

```bash
cp .env.example .env
```

`.env` precisa de **duas** connection strings — ver `.env.example`:

- `DIRECT_URL`: a role "dona" que o Neon/Supabase te dá ao criar o projeto
  (ex.: `neondb_owner`). Só usada por `prisma migrate`, que precisa de DDL.
- `DATABASE_URL`: uma role de aplicação restrita (`app_user`), que o Prisma
  Client usa em runtime (app e testes). **Isso não é opcional** — a role
  padrão que o Neon/Supabase cria normalmente tem o atributo `BYPASSRLS`
  (ignora toda política de Row-Level Security, mesmo com
  `FORCE ROW LEVEL SECURITY` na tabela). Rodar a aplicação com a role dona
  faria o isolamento multi-paróquia parecer funcionar em todo teste manual e
  falhar silenciosamente em produção. Ver `prisma/schema.prisma` (comentário
  no `datasource`) e `docs/FUNDACAO.md`.

Usamos `.env` (não `.env.local`) de propósito: é o único arquivo que tanto o
Next.js quanto o Prisma CLI leem automaticamente. **Nunca** commite `.env`
(já está no `.gitignore`).

### Login social (Google/Facebook) — opcional

Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` ou `FACEBOOK_CLIENT_ID`/
`FACEBOOK_CLIENT_SECRET`, os botões "Entrar com Google/Facebook" simplesmente
redirecionam de volta pro login com um aviso — o resto do app funciona
normalmente.

- **Google**: [Google Cloud Console](https://console.cloud.google.com/) →
  criar projeto → "APIs e Serviços" → "Credenciais" → "Criar credenciais" →
  "ID do cliente OAuth" (tipo "Aplicativo da Web"). Em "URIs de redirecionamento
  autorizados", adicione `http://localhost:3000/api/auth/google/callback` em
  dev e `https://<seu-domínio>/api/auth/google/callback` em produção.
- **Facebook**: [Facebook for Developers](https://developers.facebook.com/) →
  criar app → produto "Facebook Login" → "Configurações" → em "URIs de
  redirecionamento do OAuth válidos", adicione as mesmas URLs (trocando
  `google` por `facebook`).

### E-mail transacional (Resend) — obrigatório em produção

O e-mail de recuperação de senha é enviado via [Resend](https://resend.com).
Sem `RESEND_API_KEY`/`EMAIL_FROM` configurados, o app só loga o link no
console do servidor — funciona para dev, mas em produção significa que
ninguém consegue redefinir a senha.

1. Crie uma conta em resend.com e um domínio de envio verificado (ou use o
   domínio de teste deles para começar).
2. Gere uma API key em "API Keys" e coloque em `RESEND_API_KEY`.
3. `EMAIL_FROM` precisa ser um remetente do domínio verificado (ex.:
   `Minha Paróquia <naoresponda@seudominio.com>`).
4. `APP_URL` precisa apontar pro domínio real (ex.: `https://minhaparoquia.app`)
   — é usado para montar o link que vai dentro do e-mail.

## Banco de dados

### 1. Criar a role de aplicação (uma vez, por banco novo)

Conecte no seu banco com a role dona (`psql` ou o SQL editor do
Neon/Supabase) e rode, com uma senha forte gerada por você:

```sql
CREATE ROLE app_user WITH LOGIN PASSWORD 'sua-senha-forte-aqui'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
```

(troque `neondb_owner` pelo nome real da sua role dona, se for diferente).
O último comando garante que tabelas criadas por migrations futuras também
ficam acessíveis para `app_user` automaticamente. Monte a connection string
de `DATABASE_URL` trocando usuário/senha pelos de `app_user`, mantendo o
mesmo host/porta/banco da connection string da role dona.

### 2. Aplicar o schema e o RLS

```bash
# Aplica o schema base (users, parishes, roles, invitations...) — usa DIRECT_URL
npx prisma migrate dev --name init

# Cria uma migration vazia para as políticas de RLS
npx prisma migrate dev --name row_level_security --create-only
```

Abra o arquivo `prisma/migrations/<timestamp>_row_level_security/migration.sql`
recém-criado, cole nele o conteúdo de `prisma/rls-policies.sql`, e então
aplique:

```bash
npx prisma migrate dev
```

A partir daí, `npx prisma migrate dev` (nome novo a cada mudança de schema)
é o fluxo normal do dia a dia — sempre roda contra `DIRECT_URL`.

## Seed

```bash
npm run db:seed
```

Cria os papéis/permissões (fonte de verdade em `src/server/auth/rbac.ts`),
uma paróquia demo ("Paróquia Nossa Senhora de Fátima") e usuários de teste,
todos com a senha `ComunidadeDev123!` (só em desenvolvimento — nunca use essa
senha ou esse padrão em produção):

| Papel | E-mail |
|---|---|
| Admin da plataforma | vini.bode@gmail.com |
| Pároco | paroco.demo@comunidade.app |
| Fiel | fiel.demo@comunidade.app |
| Catequista | catequista.demo@comunidade.app |

## Executar localmente

```bash
npm run dev
```

Abre em `http://localhost:3000`. Para testar o fluxo de convite do zero, entre
como pároco (`paroco.demo@comunidade.app`), abra o **Painel da Paróquia**
(menu "Eu"), crie um convite, e acesse `http://localhost:3000/convite/<código>`
numa aba anônima.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | ESLint |
| `npm run test` | Testes (Vitest) — os testes de integração exigem `DATABASE_URL` configurado |
| `npm run db:generate` | Regenera o Prisma Client após mudar o schema |
| `npm run db:migrate` | Cria/aplica uma migration |
| `npm run db:deploy` | Aplica migrations pendentes (uso em produção/CI) |
| `npm run db:seed` | Popula papéis, permissões e dados demo (dev) |
| `npm run db:seed:prod` | Popula só papéis e permissões — sem dados demo (produção) |
| `npm run db:studio` | Abre o Prisma Studio (explorador de dados) |

## Testes

```bash
npm run test
```

Cobre os fluxos críticos desta fase: criação de paróquia, criação/validação/
expiração/reuso de convite, criação de usuário (senha nunca em texto puro),
vínculo usuário→paróquia, controle básico de permissões, e — o mais
importante — **isolamento cross-tenant** (`tests/integration/tenant-isolation.test.ts`):
prova que a política de RLS bloqueia leitura de dado de outra paróquia mesmo
manipulando o `WHERE` da query, não só que a aplicação "lembrou de filtrar".

Os testes em `tests/integration/` precisam de `DATABASE_URL` configurado e
das migrations (incluindo RLS) aplicadas. `tests/unit/` roda sem banco.

## Estrutura do projeto

```text
prisma/                    schema, migrations, seed, rls-policies.sql
src/
  app/
    (public)/               login, cadastro, recuperar-acesso, /convite/[code]
    (fiel)/                 início, caminhada, comunidade, servir, eu
    (admin)/painel/         dashboard da paróquia
  components/
    ui/                     Button, Card, FormField, EmptyState...
    layout/                 TabBar, ParishHeader
  server/
    auth/                   sessão, hash de senha, guards, RBAC
    modules/                users, parishes, memberships, invitations,
                             priests, celebrations, events
    db/                     Prisma client, contexto de tenant (RLS)
    actions/                Server Actions (auth, convites)
    shared/                 erros de aplicação
  lib/                      utilitários client-safe
tests/
  unit/                     sem dependência de banco
  integration/               fluxos ponta a ponta, exigem DATABASE_URL
docs/
  ARQUITETURA.md            visão de arquitetura completa (todas as fases do PRD)
  FUNDACAO.md                escopo e decisões desta fatia específica
```

## Deploy (produção)

Recomendado: [Vercel](https://vercel.com) (integração nativa com Next.js —
build, HTTPS e CDN automáticos). Passo a passo:

1. **Banco de produção**: crie um projeto/branch Neon **separado** do usado em
   dev — nunca reuse o banco de dev em produção (ele tem contas demo com
   senha conhecida, criadas pelo `db:seed`). Aplique a role `app_user` e o
   RLS nesse banco novo (mesmos passos da seção "Banco de dados" acima).
2. **Conecte o repositório** do GitHub a um novo projeto na Vercel — ela
   detecta Next.js automaticamente, sem configuração extra de build.
3. **Variáveis de ambiente** (Vercel → Settings → Environment Variables),
   todas em "Production":
   - `DATABASE_URL` e `DIRECT_URL` do banco de produção (passo 1)
   - `APP_URL` com o domínio final (ex.: `https://minhaparoquia.app`)
   - `RESEND_API_KEY` e `EMAIL_FROM` (seção "E-mail transacional" acima)
   - `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
     `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET` (opcional — se for
     habilitar login social em produção, lembre de cadastrar as URIs de
     redirecionamento `https://<domínio>/api/auth/<provider>/callback` no
     Google Cloud Console / Facebook for Developers)
   - `NODE_ENV` a Vercel já define como `production` sozinha — não precisa setar.
4. **Aplique as migrations no banco de produção antes do primeiro deploy**:
   rode `npm run db:deploy` localmente com `DIRECT_URL` apontando pro banco
   de produção (só para essa execução — não deixe essa variável configurada
   assim no seu `.env` de dev depois). Repita isso a cada deploy que inclua
   uma migration nova.
5. **Popule papéis e permissões** rodando `npm run db:seed:prod` (com
   `DATABASE_URL`/`DIRECT_URL` apontando pro banco de produção) — **nunca**
   rode `npm run db:seed` em produção, esse é só para dev e cria contas demo
   com senha pública.
6. Deploy. Depois de no ar, crie a primeira paróquia e o primeiro Pároco real
   pela própria aplicação (tela de cadastro), não via seed.

Regra de dependência: nada em `app/` ou `components/` importa Prisma
diretamente ou contém regra de negócio — só chama funções de
`server/modules/*/service.ts`.
