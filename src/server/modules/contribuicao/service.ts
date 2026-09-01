import { withTenantContext } from "@/server/db/tenant-context";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import { montarBrCode } from "@/lib/pix/brcode";
import { gerarIdentificadorPix } from "@/lib/pix/identificador";
import { hojeEmBrasilia } from "@/lib/brasilia";
import { chaveParaPagamento } from "@/lib/pix";
import type {
  CriarFinalidadeInput,
  EditarFinalidadeInput,
  GerarPixInput,
  LancarContribuicaoInput,
} from "./schema";

/** Dias até um Pix gerado deixar de ser oferecido como "em aberto". */
const DIAS_ATE_EXPIRAR = 7;

export function listarFinalidades(parishId: string, incluirInativas = false) {
  return withTenantContext(parishId, (tx) =>
    tx.contribuicaoFinalidade.findMany({
      where: { parishId, ...(incluirInativas ? {} : { ativa: true }) },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  );
}

export function criarFinalidade(input: CriarFinalidadeInput & { parishId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    /*
     * Uma finalidade de dízimo por paróquia.
     *
     * É ela que conversa com a Pastoral do Dízimo: uma contribuição
     * confirmada nela marca a participação do período. Duas fariam o mesmo
     * mês ser marcado por caminhos diferentes, e ninguém saberia qual.
     */
    if (input.ehDizimo) {
      const jaTem = await tx.contribuicaoFinalidade.findFirst({
        where: { parishId: input.parishId, ehDizimo: true },
        select: { nome: true },
      });
      if (jaTem) {
        throw new ValidationError(
          `"${jaTem.nome}" já é a finalidade do dízimo. Só pode haver uma.`,
        );
      }
    }

    const ultima = await tx.contribuicaoFinalidade.findFirst({
      where: { parishId: input.parishId },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    return tx.contribuicaoFinalidade.create({
      data: {
        parishId: input.parishId,
        nome: input.nome,
        descricao: input.descricao || null,
        icone: input.icone,
        ehDizimo: input.ehDizimo,
        ordem: (ultima?.ordem ?? 0) + 1,
      },
    });
  });
}

export function editarFinalidade(input: EditarFinalidadeInput & { parishId: string }) {
  return withTenantContext(input.parishId, async (tx) => {
    const atual = await tx.contribuicaoFinalidade.findFirst({
      where: { id: input.finalidadeId, parishId: input.parishId },
      select: { id: true, ehDizimo: true },
    });
    if (!atual) throw new NotFoundError("Finalidade");

    if (input.ehDizimo && !atual.ehDizimo) {
      const outra = await tx.contribuicaoFinalidade.findFirst({
        where: { parishId: input.parishId, ehDizimo: true },
        select: { nome: true },
      });
      if (outra) {
        throw new ValidationError(`"${outra.nome}" já é a finalidade do dízimo. Só pode haver uma.`);
      }
    }

    return tx.contribuicaoFinalidade.update({
      where: { id: atual.id },
      data: {
        nome: input.nome,
        descricao: input.descricao || null,
        icone: input.icone,
        ehDizimo: input.ehDizimo,
        ativa: input.ativa,
      },
    });
  });
}

/**
 * Copia para as finalidades do Pix o que a paróquia já escreveu em "Sua
 * oferta ajuda".
 *
 * Existe porque a paróquia curou aquela lista antes deste módulo existir, e
 * pedir que ela digite tudo de novo é desperdiçar o trabalho dela. Copia em
 * vez de compartilhar a tabela: os dois textos servem a coisas diferentes —
 * um conta uma história, o outro é para onde o dinheiro vai — e vão divergir
 * com o tempo.
 *
 * Não faz nada se já houver finalidade cadastrada: isto é o primeiro passo,
 * não uma sincronização.
 */
export function copiarFinalidadesDaDoacao(parishId: string) {
  return withTenantContext(parishId, async (tx) => {
    const jaTem = await tx.contribuicaoFinalidade.count({ where: { parishId } });
    if (jaTem > 0) return { copiadas: 0 };

    const cards = await tx.donationPurpose.findMany({
      where: { parishId, active: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, title: true, description: true, icon: true },
    });
    if (cards.length === 0) return { copiadas: 0 };

    /*
     * Cria uma a uma, e não em lote, para LIGAR cada cartão à finalidade que
     * saiu dele.
     *
     * `createMany` seria mais rápido e não devolve os ids criados — a
     * paróquia teria de refazer à mão um pareamento que este momento já
     * conhece. São cinco linhas numa operação que roda uma vez na vida da
     * paróquia; a rapidez aqui não vale o trabalho manual depois.
     */
    let ordem = 0;
    for (const card of cards) {
      ordem += 1;
      const finalidade = await tx.contribuicaoFinalidade.create({
        data: {
          parishId,
          nome: card.title.slice(0, 80),
          descricao: card.description.slice(0, 400),
          icone: card.icon,
          ordem,
        },
        select: { id: true },
      });
      await tx.donationPurpose.update({
        where: { id: card.id },
        data: { finalidadeId: finalidade.id },
      });
    }
    return { copiadas: cards.length };
  });
}

/**
 * Gera o Pix de contribuição: código, identificador e o BR Code pronto.
 *
 * O BR Code é montado aqui e GUARDADO. Se a paróquia trocar a chave depois,
 * o código que a pessoa copiou continua sendo o que ela copiou — remontar na
 * hora de exibir faria um código diferente do que ela levou para o banco.
 */
export function gerarPixDeContribuicao(
  input: GerarPixInput & { parishId: string; userId: string | null },
) {
  return withTenantContext(input.parishId, async (tx) => {
    /*
     * Sem finalidade é oferta espontânea, e é um caminho válido — não um
     * erro. Só se verifica o que foi escolhido; a ausência não precisa
     * existir em lugar nenhum.
     */
    const finalidade = input.finalidadeId
      ? await tx.contribuicaoFinalidade.findFirst({
          where: { id: input.finalidadeId, parishId: input.parishId, ativa: true },
          select: { id: true, nome: true },
        })
      : null;
    if (input.finalidadeId && !finalidade) throw new NotFoundError("Finalidade");

    const [settings, parish] = await Promise.all([
      tx.donationSettings.findUnique({
        where: { parishId: input.parishId },
        select: { pixKey: true, pixKeyType: true },
      }),
      tx.parish.findUnique({
        where: { id: input.parishId },
        select: { name: true, city: true },
      }),
    ]);

    if (!settings?.pixKey) {
      throw new ValidationError(
        "A paróquia ainda não cadastrou a chave PIX. Fale com a secretaria.",
      );
    }

    const identificador = gerarIdentificadorPix();
    const brcode = montarBrCode({
      // A chave vai na forma canônica do TIPO que a paróquia declarou: um
      // CNPJ pontuado dentro do payload é um código que o banco recusa.
      chave: chaveParaPagamento(settings.pixKey, settings.pixKeyType),
      nome: parish?.name ?? "Paroquia",
      cidade: parish?.city ?? "Brasil",
      centavos: input.valor,
      identificador,
    });

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + DIAS_ATE_EXPIRAR);

    return tx.pixDeContribuicao.create({
      data: {
        parishId: input.parishId,
        userId: input.userId,
        finalidadeId: finalidade?.id ?? null,
        centavos: input.valor,
        identificador,
        brcode,
        expiraEm,
      },
      include: { finalidade: { select: { nome: true } } },
    });
  });
}

export function obterPix(parishId: string, pixId: string, userId: string | null) {
  return withTenantContext(parishId, async (tx) => {
    const pix = await tx.pixDeContribuicao.findFirst({
      where: { id: pixId, parishId },
      include: { finalidade: { select: { nome: true } } },
    });
    if (!pix) throw new NotFoundError("Pix de contribuição");
    /*
     * O código de uma pessoa não é de outra. Um Pix sem dono (o da mesa da
     * festa) é de quem tiver o endereço — é para isso que ele existe.
     */
    if (pix.userId && pix.userId !== userId) throw new NotFoundError("Pix de contribuição");
    return pix;
  });
}

/** Descarta um código que a pessoa gerou e não vai usar. */
export function descartarPix(parishId: string, pixId: string, userId: string) {
  return withTenantContext(parishId, async (tx) => {
    const pix = await tx.pixDeContribuicao.findFirst({
      where: { id: pixId, parishId, userId },
      select: { id: true, estado: true },
    });
    if (!pix) throw new NotFoundError("Pix de contribuição");
    if (pix.estado === "recebida") {
      throw new ValidationError("Esta contribuição já foi recebida — não há o que descartar.");
    }
    return tx.pixDeContribuicao.update({
      where: { id: pix.id },
      data: { estado: "descartada" },
    });
  });
}

/** Os códigos que a pessoa gerou e ainda não usou. */
export function listarPixEmAberto(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pixDeContribuicao.findMany({
      where: { parishId, userId, estado: "aguardando" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { finalidade: { select: { nome: true } } },
    }),
  );
}

/** O histórico da pessoa: o que a paróquia registrou como recebido dela. */
export function listarMinhasContribuicoes(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.contribuicao.findMany({
      where: { parishId, userId, cancelada: false },
      orderBy: { recebidaEm: "desc" },
      take: 60,
      include: { finalidade: { select: { nome: true } } },
    }),
  );
}

/**
 * Lança à mão o que chegou fora do Pix identificado.
 *
 * Quando a finalidade é a do dízimo, marca também a participação do período
 * na Pastoral do Dízimo — que continua sendo um registro SEM valor. São duas
 * perguntas diferentes: "é dizimista" e "quanto entrou".
 */
export function lancarContribuicao(
  input: LancarContribuicaoInput & { parishId: string; registradaPor: string },
) {
  return withTenantContext(input.parishId, async (tx) => {
    const finalidade = input.finalidadeId
      ? await tx.contribuicaoFinalidade.findFirst({
          where: { id: input.finalidadeId, parishId: input.parishId },
          select: { id: true, ehDizimo: true },
        })
      : null;
    if (input.finalidadeId && !finalidade) throw new NotFoundError("Finalidade");

    const contribuicao = await tx.contribuicao.create({
      data: {
        parishId: input.parishId,
        userId: input.userId ?? null,
        finalidadeId: finalidade?.id ?? null,
        centavos: input.valor!,
        recebidaEm: input.recebidaEm,
        forma: input.forma,
        registradaPor: input.registradaPor,
        observacao: input.observacao || null,
      },
    });

    if (finalidade?.ehDizimo && input.userId) {
      await marcarParticipacaoNoDizimo(tx, {
        parishId: input.parishId,
        userId: input.userId,
        quando: input.recebidaEm,
        registradaPor: input.registradaPor,
      });
    }

    return contribuicao;
  });
}

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];

/**
 * Marca o mês na Pastoral do Dízimo, sem valor nenhum.
 *
 * `upsert` porque a mesma pessoa pode contribuir duas vezes no mesmo mês, e
 * a participação é um sim/não — não um contador.
 */
export async function marcarParticipacaoNoDizimo(
  tx: Tx,
  dados: { parishId: string; userId: string; quando: Date; registradaPor: string },
) {
  const periodo = dados.quando.toISOString().slice(0, 7);
  await tx.titheParticipation.upsert({
    where: { userId_period: { userId: dados.userId, period: periodo } },
    update: {},
    create: {
      parishId: dados.parishId,
      userId: dados.userId,
      period: periodo,
      registeredBy: dados.registradaPor,
    },
  });
}

/**
 * Marca como expirado o que passou do prazo.
 *
 * Expirar não é dívida nem calote: é só parar de oferecer na tela um código
 * que a pessoa gerou há duas semanas e esqueceu. O código continua válido no
 * banco dela — o Pix estático não caduca —, e se o dinheiro cair a
 * conciliação encontra o identificador do mesmo jeito.
 */
export function expirarPixAntigos(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pixDeContribuicao.updateMany({
      where: { parishId, estado: "aguardando", expiraEm: { lt: new Date(hojeEmBrasilia()) } },
      data: { estado: "expirada" },
    }),
  );
}

/**
 * O que a secretaria vê: códigos gerados que ainda não foram confirmados.
 *
 * É a lista de "olhe no aplicativo do banco e diga se caiu". Existe porque a
 * conciliação por extrato ainda não existe — e vai continuar existindo
 * depois dela, porque nem todo banco devolve o identificador e sempre
 * sobrará o que conferir com o olho.
 */
export function listarPixAguardando(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pixDeContribuicao.findMany({
      where: { parishId, estado: { in: ["aguardando", "expirada"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        finalidade: { select: { nome: true } },
        user: { select: { fullName: true } },
      },
    }),
  );
}

/**
 * A secretaria diz: este código caiu na conta.
 *
 * É conciliação manual sem arquivo nenhum — a pessoa olha o extrato no
 * aplicativo do banco e confirma. O identificador dispensa adivinhação: ela
 * não precisa decidir de quem é nem para quê, porque o código já sabe.
 *
 * O valor só é pedido quando o Pix foi gerado sem valor: aí quem sabe
 * quanto entrou é o extrato, não o app.
 */
export function confirmarRecebimentoDoPix(input: {
  parishId: string;
  pixId: string;
  /** Em centavos. Obrigatório só quando o código não trazia valor. */
  centavos: number | null;
  recebidaEm: Date;
  confirmadaPor: string;
}) {
  return withTenantContext(input.parishId, async (tx) => {
    const pix = await tx.pixDeContribuicao.findFirst({
      where: { id: input.pixId, parishId: input.parishId },
      select: {
        id: true,
        userId: true,
        centavos: true,
        estado: true,
        finalidadeId: true,
        finalidade: { select: { ehDizimo: true } },
        contribuicao: { select: { id: true } },
      },
    });
    if (!pix) throw new NotFoundError("Pix de contribuição");

    /*
     * Uma vez só. A restrição única em `pix_id` já barraria no banco, mas o
     * erro de lá fala de constraint; aqui fala com quem está na tela.
     */
    if (pix.contribuicao) {
      throw new ValidationError("Esta contribuição já foi confirmada.");
    }
    if (pix.estado === "descartada") {
      throw new ValidationError("Este código foi descartado por quem o gerou.");
    }

    const centavos = pix.centavos ?? input.centavos;
    if (!centavos || centavos <= 0) {
      throw new ValidationError("Informe quanto entrou — este código foi gerado sem valor.");
    }

    const contribuicao = await tx.contribuicao.create({
      data: {
        parishId: input.parishId,
        userId: pix.userId,
        finalidadeId: pix.finalidadeId,
        centavos,
        recebidaEm: input.recebidaEm,
        forma: "pix_identificado",
        pixId: pix.id,
        registradaPor: input.confirmadaPor,
      },
    });

    await tx.pixDeContribuicao.update({
      where: { id: pix.id },
      data: { estado: "recebida" },
    });

    if (pix.finalidade?.ehDizimo && pix.userId) {
      await marcarParticipacaoNoDizimo(tx, {
        parishId: input.parishId,
        userId: pix.userId,
        quando: input.recebidaEm,
        registradaPor: input.confirmadaPor,
      });
    }

    return contribuicao;
  });
}

/**
 * Desfaz uma confirmação — sem apagar nada.
 *
 * Marca a contribuição como cancelada e devolve o código ao estado de
 * espera. O registro fica: houve, e foi desfeito. Apagar a linha esconderia
 * o próprio engano, que é justamente o que a tesouraria precisa enxergar.
 *
 * A participação no dízimo NÃO é desfeita: ela diz que a pessoa participou
 * daquele mês, e um lançamento corrigido não apaga o gesto. Se a
 * participação estiver errada, a Pastoral do Dízimo a desmarca na tela dela.
 */
export function cancelarContribuicao(parishId: string, contribuicaoId: string) {
  return withTenantContext(parishId, async (tx) => {
    const c = await tx.contribuicao.findFirst({
      where: { id: contribuicaoId, parishId },
      select: { id: true, pixId: true, cancelada: true },
    });
    if (!c) throw new NotFoundError("Contribuição");
    if (c.cancelada) return c;

    await tx.contribuicao.update({ where: { id: c.id }, data: { cancelada: true } });
    if (c.pixId) {
      await tx.pixDeContribuicao.update({
        where: { id: c.pixId },
        data: { estado: "aguardando" },
      });
    }
    return c;
  });
}

/**
 * O que entrou, para a tesouraria conferir e para o relatório.
 *
 * `finalidade: "sem"` é a oferta espontânea — a ausência de finalidade É o
 * recorte, e não a falta dele. Sem esse caso, o único jeito de ver as
 * espontâneas seria não filtrar nada.
 */
export function listarContribuicoes(
  parishId: string,
  filtro: { de?: Date; ate?: Date; finalidade?: string } = {},
) {
  return withTenantContext(parishId, (tx) =>
    tx.contribuicao.findMany({
      where: {
        parishId,
        cancelada: false,
        ...(filtro.finalidade === "sem"
          ? { finalidadeId: null }
          : filtro.finalidade
            ? { finalidadeId: filtro.finalidade }
            : {}),
        ...(filtro.de || filtro.ate
          ? { recebidaEm: { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) } }
          : {}),
      },
      orderBy: { recebidaEm: "desc" },
      take: 300,
      include: {
        finalidade: { select: { nome: true } },
        user: { select: { fullName: true } },
      },
    }),
  );
}
