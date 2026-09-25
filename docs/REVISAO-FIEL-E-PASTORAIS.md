# Revisão — o fiel e as pastorais

**Data:** 25 de setembro de 2026
**Pergunta desta revisão:** o aplicativo faz sentido na vida do fiel, e ajuda a
paróquia a organizar as pastorais com mais assertividade?

O `PLANO-10-10.md` (28/08) mediu outra coisa — a qualidade técnica e a tela de
entrada — e está quase todo cumprido. Esta revisão olha o produto: as duas
pessoas para quem ele existe. Cada nota abaixo tem evidência no código de hoje;
onde algo falta, a busca foi feita e não achou nada.

---

## Notas

### Para o fiel — média 8,5

| # | Critério | Nota | O que sustenta a nota | O que falta para 10 |
|---|---|:---:|---|---|
| 1 | **Chegada e pertencimento** | 8,5 | Cadastro sem aprovação, escolha da paróquia, boas-vindas em 5 passos começando pela letra, interesse em pastoral no último passo, trilha de descoberta | Um link ou QR **da paróquia** que já leve a ela (hoje o QR abre o app genérico e a pessoa procura numa lista); convites individuais estão desligados |
| 2 | **Vida de oração e fé** | 8,8 | Terço, Rosário, Misericórdia e novenas guiados; terço pela voz e pelo botão do volante; Bíblia inteira; Evangelho do dia; Palavra do Padre com áudio e vídeo; Caminhada privada | Meditações das novenas sem revisão de um padre; Catecismo escondido até a autorização da LEV; leitura em voz das leituras para quem lê mal |
| 3 | **Informação da comunidade** | 8,5 | Agenda com cores, avisos com validade, notificação no app e no celular, resumo semanal para quem não serve em nada, Contato com a secretaria aberta ou fechada | Busca (missa, pastoral, aviso, oração); endereço próprio em vez de `vercel.app` |
| 4 | **Participação e serviço** | 7,5 | "Posso ajudar", oportunidades com interesse, escalas litúrgicas com lembrete, grupos com cronograma e lembrete, Servir de volta ao Início | **Um lugar só com os compromissos da pessoa** (escala, encontro, mutirão, atendimento estão espalhados em três telas); "Minha pastoral" mostra uma só; não dá para dizer "vou" ou "não posso" a um encontro |
| 5 | **Acessibilidade e inclusão** | 9,0 | Três tamanhos de letra, fontes para baixa visão e dislexia, contraste auditado nas 14 paletas, oração pela voz, "Ajudar a entrar" no balcão | Leitura em voz; os 4 pares de contraste do dourado no Natal e na Páscoa |

### Para a paróquia — média 7,4

| # | Critério | Nota | O que sustenta a nota | O que falta para 10 |
|---|---|:---:|---|---|
| 6 | **Organização das pastorais e grupos** | 6,8 | Membros com papel, coordenação sem precisar do painel, cronograma colado de uma vez, quem prega, lembrete de véspera, interessados → acolher, lista de membros protegida | **A coordenação não fala com o grupo pelo app** — continua no WhatsApp; **sem chamada nos encontros**, então ninguém percebe quem está se afastando; sem tarefas do encontro (acolhida, lanche, música); membro só entra pelo nome completo exato (homônimos travam — aconteceu em 21/09) |
| 7 | **Catequese e sacramentos** | 8,2 | Itinerários, turmas, frequência, ritos, missa da turma, catequizando sem conta, responsáveis, sacramentos validados pela secretaria | Preparação de batismo e casamento (documentos e encontros); conteúdo dos itinerários ainda por digitar pelos catequistas; Catecismo |
| 8 | **Liturgia e celebrações** | 7,8 | Horários que se repetem, celebrações avulsas, escalas por função com confirmação, disponibilidade, lembretes | **Intenções de missa** — o fluxo mais diário do balcão não existe (sem valor e sem Pix, pela regra da casa) e sem o rol para o ambão |
| 9 | **Secretaria e prestação de contas** | 7,5 | Avisos, eventos, expediente, atendimento com sacerdote, membros e papéis, auditoria, moderação dos pedidos de oração | **Nenhum relatório sai do app** (conselho, CAEP, cúria); o painel não mostra a participação por pastoral |
| 10 | **Implantação de uma paróquia nova** | 6,0 | Nova paróquia pela plataforma, painel de qualquer paróquia sem trocar de vínculo, configuração em minutos (a Rocio foi feita assim) | **Não há como criar o primeiro acesso do pároco pela tela** — só por script com o banco de produção; logo só por URL; nenhuma lista do que falta configurar |
| 11 | **Confiança: privacidade, segurança, qualidade** | 8,3 | Isolamento por paróquia no próprio banco em todas as tabelas, ~760 testes, limite de tentativas no login e no cadastro, política de privacidade fiel ao banco, sigilo da confissão estrutural | **Sem CI** — os testes só rodam na máquina; o fiel não consegue excluir a própria conta (LGPD art. 18); README da primeira fatia; troca de credenciais pendente |

**Média geral: 7,9.** O aplicativo já é bom para o fiel rezar e se informar. É
mais fraco onde a paróquia precisa organizar gente — e é ali que mora o
objetivo do projeto: mais fiéis participando.

Ofertas e dízimo ficaram fora da nota: o QR do Pix e o gateway foram adiados
por decisão, e contar isso contra o app seria medir uma escolha como falha.

---

## Cronograma até o 10

Oito semanas de trabalho e duas de piloto. A ordem segue o que trava mais
coisas: a implantação primeiro (sem ela a Rocio não anda), depois as
pastorais (o maior buraco), depois a rotina da secretaria.

### Fase 0 — Destravar a implantação · 29/09 a 03/10

| Item | Critério | De → para |
|---|---|---|
| **Primeiro acesso pela tela:** a plataforma cria a conta do pároco ou da secretaria (nome, e-mail, papel) e gera o link de definir senha — o mesmo mecanismo do "Ajudar a entrar" | 10 | 6,0 → 8,0 |
| **Link e QR da paróquia** (`/p/<paróquia>`): quem se cadastra por ele já entra na paróquia certa, sem procurar na lista | 1, 10 | 8,5 → 9,5 |
| **"O que falta configurar"** no painel: horários, contato, história, pároco, logo, pastorais, primeiro aviso — cada um com o link para resolver | 10 | 8,0 → 9,0 |
| **Logo por arquivo**, como já é a foto da igreja e a do pároco | 10 | 9,0 → 9,5 |

### Fase 1 — Pastorais que se organizam · 06/10 a 17/10

| Item | Critério | De → para |
|---|---|---|
| **Recado do grupo:** a coordenação escreve para os membros, que recebem no app e no celular; o histórico fica na página do grupo | 6 | 6,8 → 8,0 |
| **Chamada nos encontros** (presente ou ausente) e o alerta de **quem está se afastando** — três faltas seguidas avisam a coordenação | 6 | 8,0 → 9,0 |
| **Tarefas do encontro:** acolhida, lanche, música, oração inicial — cada uma com responsável e lembrete | 6 | 9,0 → 9,5 |
| **Entrar no grupo sem o nome exato:** link de convite do grupo, ou busca por e-mail | 6 | 9,5 → 10 |
| **Interesse parado:** se ninguém responde em 7 dias, a coordenação recebe um lembrete | 4, 6 | — |

### Fase 2 — O fiel enxerga a própria participação · 20/10 a 24/10

| Item | Critério | De → para |
|---|---|---|
| **Meus compromissos:** escalas, encontros, mutirões e atendimentos numa lista só, e o próximo deles no Início | 4 | 7,5 → 9,0 |
| **Minhas pastorais**, todas, e não só a primeira | 4 | 9,0 → 9,5 |
| **"Vou" ou "não posso"** nos encontros e eventos — a coordenação sabe quantos vêm | 4, 6 | 9,5 → 10 |

### Fase 3 — A secretaria do dia a dia · 27/10 a 07/11

| Item | Critério | De → para |
|---|---|---|
| **Intenções de missa**, no balcão e no app: por celebração, por tipo (sufrágio, 7º dia, ação de graças, saúde) — **sem valor e sem Pix** — e o rol pronto para imprimir e ler no ambão | 8 | 7,8 → 9,5 |
| **Relatórios** em planilha e em A4 para imprimir: participação por pastoral, sacramentos do ano, frequência da catequese, contribuições por finalidade | 9 | 7,5 → 9,0 |
| **Painel do conselho:** participação e crescimento por pastoral, pastorais sem coordenação ou sem encontro marcado | 9 | 9,0 → 10 |
| **Busca** no app do fiel | 3 | 8,5 → 9,5 |

### Fase 4 — Fé e formação completas · 10/11 a 14/11

| Item | Critério | De → para |
|---|---|---|
| **Leitura em voz** das leituras do dia e dos avisos | 2, 5 | → 9,5 |
| **Contraste** do dourado no Natal e na Páscoa | 5 | → 10 |
| **Preparação de batismo e casamento:** documentos e encontros de preparação, sem valores | 7 | 8,2 → 9,5 |
| *Humano:* revisão das meditações das novenas por um padre | 2 | → 10 |
| *Humano:* autorização da LEV para o Catecismo | 2, 7 | → 10 |

### Fase 5 — Confiança e operação · 17/11 a 21/11

| Item | Critério | De → para |
|---|---|---|
| **CI no GitHub:** tipos, lint, testes e jornadas de navegador em cada envio, com banco de teste próprio | 11 | 8,3 → 9,0 |
| **Excluir a própria conta**, com anonimização do que a paróquia precisa guardar | 11 | 9,0 → 9,5 |
| **README** atual, troca das credenciais, endereço próprio | 3, 11 | 9,5 → 10 |

### Fase 6 — Piloto · 24/11 a 05/12

Fátima e Rocio usando de verdade. O que medir, porque é o que responde à
pergunta desta revisão:

- quantos se cadastram e quantos terminam as boas-vindas;
- quantos interesses em pastoral são respondidos, e em quanto tempo;
- presença nos encontros dos grupos, semana a semana;
- quantos fiéis têm ao menos um compromisso.

---

## O que depende de gente, e não de código

| Item | Com quem |
|---|---|
| Autorização do Catecismo | Libreria Editrice Vaticana |
| Revisão das meditações das novenas | Um padre |
| Calendário, logo e fotos da Rocio | Secretaria da Rocio |
| Conteúdo dos itinerários | Catequistas |
| Endereço próprio | Compra do domínio |

---

## Andamento — 25/09/2026

As fases 0 a 6 foram escritas no ramo `teste`, uma por commit, com testes
de cada parte. O que ficou pronto, e onde ver:

| Fase | No app |
|---|---|
| 0 | Plataforma → paróquia → Implantar (primeiro acesso por link); Dados da paróquia → link e QR de entrada; lista do que falta no painel; logo enviada do celular |
| 1 | Página do grupo: recados, chamada (com alerta de quem se afasta), tarefas do encontro, convite por link; lembrete de interessados parados |
| 2 | Eu → Meus compromissos; "vou / não posso" nos encontros e nos eventos da agenda; Servir mostra todas as pastorais da pessoa |
| 3 | Eu → Intenção de missa; painel → Intenções de missa (conferir, balcão, rol para imprimir); Relatórios (tela, A4, planilha); Painel do conselho; lupa de busca no topo do app |
| 4 | "Ouvir as leituras" e "Ouvir o aviso"; contraste do Natal e da Páscoa corrigido; Caminhada → Preparar batismo / casamento; painel → Batismo e casamento |
| 5 | Verificação no GitHub (`.github/workflows/ci.yml`); Eu → Editar perfil → Excluir minha conta; README atual |
| 6 | Painel → Adesão da comunidade (cadastros, boas-vindas, interesses respondidos e tempo, presença, compromisso) |

Continuam dependendo de gente: a tabela acima, os segredos do banco de
teste no GitHub (`DATABASE_URL_TESTE`, `DIRECT_URL_TESTE`), a troca das
credenciais e o domínio. As notas só sobem de verdade com o piloto: a
Fase 6 agora mede, mas quem responde é o uso em Fátima e na Rocio.
