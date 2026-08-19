# Firebase/Firestore vs. PostgreSQL — comparação para a Comunidade

Documento de análise, não de decisão. A stack atual (Next.js + Prisma +
PostgreSQL com RLS) continua como está — este documento existe pra você
decidir com informação, não pra justificar o que já foi construído.

---

## 1. Por que essa pergunta importa mais do que "qual banco é melhor"

Firestore e Postgres não são a mesma ferramenta com sintaxes diferentes —
são dois modelos de dados fundamentalmente diferentes:

- **Postgres é relacional**: dados normalizados em tabelas, relacionados por
  chave estrangeira, consultados por JOIN, com integridade garantida pelo
  próprio banco (chave única, FK, cascade).
- **Firestore é orientado a documentos**: coleções de documentos
  independentes, sem JOIN nativo, sem FK, sem constraint de unicidade além
  do ID do documento. Relacionamentos e consistência entre documentos são
  responsabilidade da sua aplicação (ou de Cloud Functions fazendo o papel
  de "trigger" manual).

A pergunta certa não é "qual ferramenta é mais moderna", é: **o domínio da
Comunidade é mais parecido com um livro-razão relacional (fiéis, vínculos,
sacramentos, escalas, dízimo — tudo se referenciando) ou com uma coleção de
documentos majoritariamente independentes?** A resposta molda tudo abaixo.

---

## 2. Comparação por dimensão

### Multi-paróquia / isolamento

| | Postgres (atual) | Firestore |
|---|---|---|
| Modelo | Um banco, `parish_id` em toda tabela, isolamento por **Row-Level Security** — política SQL avaliada pelo próprio Postgres em toda query | Um banco, `parishId` em todo documento, isolamento por **Security Rules** — política avaliada pelo Firestore em toda leitura/escrita vinda do **cliente** |
| Defesa em profundidade | Sim — filtro na aplicação **e** RLS no banco. Comprovamos isso na prática: esquecemos de setar o contexto de tenant em alguns testes e o Postgres bloqueou mesmo assim | Só existe se o cliente (navegador/app) falar direto com o Firestore. Se você usa um backend com **Admin SDK** (o padrão em apps Next.js/Node, equivalente ao que fizemos com Prisma), o Admin SDK **ignora Security Rules por completo** — vira sua única linha de defesa é a disciplina do código do backend, sem camada independente |
| Achado real desta implementação | A role padrão do Neon tinha `BYPASSRLS` — corrigimos criando uma role restrita (`app_user`). Foi uma pegadinha real, mas resolvida uma vez, permanentemente | O equivalente seria descobrir tarde demais que todo o backend usa Admin SDK e as Security Rules nunca foram realmente testadas em produção — um erro de arquitetura comum em projetos Firebase que crescem de "só cliente" para "cliente + backend" |
| Testabilidade | Testes de integração contra Postgres real (é o que temos: 36 testes, incluindo isolamento cross-tenant) | Firebase Emulator Suite permite testes de rules equivalentes — boa ferramenta, mas testa uma linguagem de regras separada, não SQL revisável por qualquer dev com experiência relacional |

**Veredito desta dimensão**: os dois têm um caminho sólido para isolamento
multi-tenant. Postgres com RLS + role restrita é mais robusto *por padrão*
quando existe um backend central (nosso caso). Firestore só entrega o mesmo
nível de segurança se a arquitetura for "cliente fala direto com o banco"
— uma escolha de arquitetura bem diferente da que já temos.

### Relacionamentos entre entidades

Este é o ponto que mais pesa pra este produto especificamente. Já temos,
rodando, coisas como:

- Um usuário só pode ter **um vínculo ativo por vez** — garantido por um
  índice único parcial no Postgres, de graça. Em Firestore isso exige uma
  transação manual toda vez que alguém aceita um convite, escrita à mão,
  com risco de corrida se esquecer.
- `ServiceInterest` é único por `(oportunidade, usuário)` — de novo, uma
  constraint do banco. Em Firestore, ou vira o ID do documento (funciona,
  mas não generaliza pra outras constraints) ou é mais uma transação manual.
- Excluir uma paróquia **cascade-deleta** vínculos, celebrações, posts,
  disponibilidades — um `onDelete: Cascade` do Postgres. Não existe cascade
  nativo no Firestore; seria Cloud Functions ouvindo delete de paróquia e
  apagando manualmente cada coleção relacionada.
- O gerador de horários de atendimento pastoral faz, essencialmente,
  detecção de conflito de intervalo de tempo — natural em SQL, incômodo em
  Firestore (sem query nativa de overlap; exigiria desnormalização por
  "slot" ou filtragem no cliente).

**Veredito**: Postgres ganha aqui, e não por pouco. O domínio da Comunidade
é genuinamente relacional — pessoas, vínculos, papéis, agendas,
validações — não é um catálogo de documentos soltos.

### Catequese e Liturgia (ainda não construídas)

Ambas são, pelo PRD, estruturas de junção pesada: turma → catequista →
catequizando → presença por encontro → rito; e papel litúrgico →
disponibilidade → escala → celebração, com a mesma lógica de "não escalar
duas pessoas no mesmo horário/função" que já resolvemos para atendimento
pastoral. São exatamente o tipo de problema que tabelas relacionais com
JOIN resolvem de forma direta, e que em Firestore normalmente vira
desnormalização (duplicar dado em vários documentos) com Cloud Functions
mantendo as cópias sincronizadas — mais código, mais lugares pra
dessincronizar.

### Sacramentos

Neutro — já construído de forma simples (registro pessoal + validação
futura pela secretaria). Nenhuma das duas tecnologias muda muito aqui,
mas a validação por parte da secretaria e o eventual cruzamento
"sacramentos por família" continuam sendo consulta relacional natural.

### Dízimo (ainda não construído)

Domínio financeiro: precisa de forte consistência, trilha de auditoria, e
provavelmente relatórios agregados ("total de dízimo do mês por família",
"taxa de participação"). Isso é SQL clássico (`GROUP BY`, agregações,
joins com família/paróquia). Firestore ganhou queries de agregação
(count/sum/avg) nos últimos anos, mas ainda não faz `GROUP BY`
multi-coleção sem desnormalização manual — historicamente é a área onde
projetos Firebase mais sofrem quando o produto cresce.

### Notificações

Aqui o Firebase é genuinamente forte: o **FCM (Firebase Cloud Messaging)**
é gratuito, maduro, cross-platform (iOS/Android/Web), e — importante — **não
exige usar Firestore**. Dá pra usar FCM com Postgres como banco principal
sem conflito nenhum; é a arquitetura mais comum até em times que não usam
nenhum outro produto Firebase. Ou seja: **isto não é um motivo pra trocar
de banco** — é um motivo pra, na hora de construir notificações, considerar
FCM como o serviço de entrega, independente de onde os dados moram.

### Futura expansão para app mobile

Ponto forte real do Firebase: SDKs nativos maduros (iOS/Android/Flutter/
React Native) com sincronização offline-first e listeners em tempo real
"de fábrica" — é o motivo pelo qual o Firebase existe. Se o app mobile
precisar funcionar bem offline (ex.: fiel numa área rural sem sinal
constante), isso é caro de replicar em cima de Postgres (exigiria algo como
PowerSync/ElectricSQL por cima, complexidade adicional).

Por outro lado: a arquitetura atual já foi desenhada pensando nisso — o
roadmap original (`docs/ARQUITETURA.md`, fatia P3) já prevê extrair uma API
separada do monólito Next.js quando existir consumidor mobile. Um app
React Native/Flutter chamando essa API é o caminho padrão pra apps que
**não** precisam ser offline-first — só "funcionar numa conexão razoável",
que é a maioria dos apps paroquiais.

**Pergunta em aberto pra você**: o app mobile futuro *precisa* funcionar
offline de verdade, ou só precisa existir como app nativo/PWA instalável
com conexão normal? Essa resposta muda bastante o peso desse ponto.

### Custo

Modelos de cobrança diferentes, não necessariamente um mais barato que o
outro — depende do padrão de uso:

- **Postgres (Neon)**: cobrança por computação/armazenamento, previsível,
  cresce com o tamanho do banco e tempo de CPU.
- **Firestore**: cobrança por operação (leitura/escrita/delete de
  documento). Barato em apps com poucas leituras, mas pode surpreender em
  telas com listas grandes ou listeners em tempo real usados sem cuidado —
  é uma reclamação recorrente de projetos Firebase que crescem sem revisar
  padrões de leitura.

Não vou citar números — mudam com frequência e o que importa é o
*formato* da cobrança, que muda o tipo de cuidado de engenharia exigido
mais adiante.

### Familiaridade da equipe

Você mencionou ter mais familiaridade com Firebase — isso é um fator real
e legítimo, não um detalhe. Velocidade de desenvolvimento e facilidade de
manutenção importam tanto quanto a arquitetura "certa" no papel. Isso eu
não consigo pesar por você — só registrar que existe.

---

## 3. Opção híbrida (nem tudo é tudo-ou-nada)

Dá pra usar pedaços do Firebase sem trocar o banco principal:

- **FCM** para notificações push, com Postgres continuando como fonte da
  verdade dos dados (mencionado acima).
- **Firebase Auth** no lugar da autenticação própria que construímos —
  possível, mas hoje já temos sessão + hash de senha funcionando e
  testado; trocar agora seria refazer trabalho sem ganho claro.
- **Firebase Data Connect** (produto novo do Firebase: GraphQL sobre um
  Postgres gerenciado) — interessante como curiosidade, mas é recente
  demais e nicho demais pra recomendar numa base de produção agora.

---

## 4. Custo de migrar agora vs. mais tarde

Sendo direto sobre o que já existe: schema completo com RLS, 12
migrations aplicadas, 36 testes de integração rodando contra Postgres
real, e 6 módulos de produto funcionando (fundação, comunidade, palavra do
padre, atendimento pastoral, servir, minha caminhada). Migrar pra
Firestore agora significaria reescrever a camada de dados inteira e
redesenhar isolamento multi-tenant do zero — não é um ajuste, é recomeçar
essa parte.

Isso **não** deveria ser o argumento decisivo (sunk cost não é motivo
técnico), mas é informação real pra você pesar: quanto mais esperar pra
decidir, maior o custo de trocar depois.

---

## 5. Recomendação

**Manter PostgreSQL/Prisma como banco principal.** O domínio da Comunidade
— vínculos, papéis, agendas com conflito, sacramentos, e especialmente
catequese/liturgia/dízimo ainda por vir — é estruturalmente relacional, e
isolamento multi-tenant com RLS já está provado funcionando com defesa em
profundidade. Isso pesa mais que a vantagem do Firestore em sincronização
mobile offline, que só importa se o app mobile precisar ser offline-first
de verdade — o que ainda não foi definido como requisito.

Onde eu **usaria** Firebase mesmo mantendo Postgres: **FCM para
notificações push**, quando chegar essa fatia — não exige trocar de banco
e resolve exatamente o problema que resolve bem.

Isso é uma recomendação, não uma decisão tomada — segue tudo como está até
você decidir.
