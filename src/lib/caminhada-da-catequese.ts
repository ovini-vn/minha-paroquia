/**
 * A caminhada de um catequizando: o que já passou, onde ele está e o que vem.
 *
 * Existe porque a ficha só mostrava o passado — presenças, missas e ritos já
 * recebidos. A família perguntava "onde estamos e quais são os próximos
 * passos", e a resposta não estava em lugar nenhum: nada tinha sido previsto.
 *
 * O itinerário mudou isso. Com os encontros previstos declarados pela
 * paróquia, "o próximo passo" deixa de ser um campo a preencher e passa a
 * ser uma conta — o primeiro tema que a turma ainda não deu.
 *
 * Lógica pura, sem banco: é o que permite fixar as regras em teste, e as
 * regras aqui são justamente as que um erro deixaria invisível.
 */

export type TemaPrevisto = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
};

export type EncontroDado = {
  id: string;
  date: Date;
  itinerarioTemaId: string | null;
};

export type EstadoDoPasso = "concluido" | "atual" | "previsto";

export type PassoDaCaminhada = {
  temaId: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  estado: EstadoDoPasso;
  /** Quando a turma deu este tema. Nulo se ainda não deu. */
  data: Date | null;
  /**
   * Se o catequizando esteve no encontro daquele tema.
   *
   * Nulo quando o tema ainda não foi dado, e também quando foi dado mas a
   * chamada não foi lançada — são coisas diferentes, e transformar "não
   * sabemos" em "faltou" seria acusar a criança de uma falha do registro.
   */
  presente: boolean | null;
};

export type Caminhada = {
  passos: PassoDaCaminhada[];
  /** Temas já dados pela turma. */
  concluidos: number;
  /** Temas previstos no itinerário. */
  previstos: number;
  /** O próximo tema — o que a família quer saber. Nulo se acabou. */
  proximo: PassoDaCaminhada | null;
};

/**
 * Monta a caminhada a partir do itinerário e do que a turma já deu.
 *
 * `agora` entra como parâmetro, e não é lido de dentro: encontro marcado
 * para a semana que vem NÃO conta como dado, e um relógio implícito faria o
 * teste dessa regra depender do dia em que ele roda.
 */
export function montarCaminhada(
  temas: TemaPrevisto[],
  encontros: EncontroDado[],
  presencaPorEncontro: Map<string, boolean>,
  agora: Date,
): Caminhada {
  const realizados = encontros.filter((e) => e.date <= agora && e.itinerarioTemaId);

  /*
   * Um tema pode ter sido dado em mais de um encontro — repetir uma aula é
   * comum. Vale o MAIS RECENTE: é o que a família viu por último, e é dele
   * que a presença interessa.
   */
  const encontroDoTema = new Map<string, EncontroDado>();
  for (const encontro of realizados) {
    const atual = encontroDoTema.get(encontro.itinerarioTemaId!);
    if (!atual || encontro.date > atual.date) {
      encontroDoTema.set(encontro.itinerarioTemaId!, encontro);
    }
  }

  const emOrdem = [...temas].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));

  let jaMarcouOAtual = false;
  const passos: PassoDaCaminhada[] = emOrdem.map((tema) => {
    const encontro = encontroDoTema.get(tema.id);

    if (encontro) {
      return {
        temaId: tema.id,
        ordem: tema.ordem,
        titulo: tema.titulo,
        descricao: tema.descricao,
        estado: "concluido" as const,
        data: encontro.date,
        presente: presencaPorEncontro.has(encontro.id)
          ? presencaPorEncontro.get(encontro.id)!
          : null,
      };
    }

    /*
     * O PRIMEIRO tema não dado é "o atual", e só ele.
     *
     * Não é o último concluído: a família pergunta o que VEM, e apontar para
     * trás não responde. Se a turma pulou um tema no meio, o pulado é o
     * atual — e isso é correto, porque ele é mesmo o próximo a acontecer.
     */
    const estado: EstadoDoPasso = jaMarcouOAtual ? "previsto" : "atual";
    jaMarcouOAtual = true;

    return {
      temaId: tema.id,
      ordem: tema.ordem,
      titulo: tema.titulo,
      descricao: tema.descricao,
      estado,
      data: null,
      presente: null,
    };
  });

  return {
    passos,
    concluidos: passos.filter((p) => p.estado === "concluido").length,
    previstos: passos.length,
    proximo: passos.find((p) => p.estado === "atual") ?? null,
  };
}

export type RitoDaCaminhada = {
  id: string;
  name: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
};

/**
 * O próximo rito marcado e ainda não recebido.
 *
 * Rito sem data agendada não entra: ele existe no plano, mas não é um
 * "próximo passo" enquanto ninguém marcou o dia — e anunciar como próximo
 * algo sem data é o jeito de a família perguntar "quando?" e ninguém saber.
 */
export function proximoRito(ritos: RitoDaCaminhada[], agora: Date): RitoDaCaminhada | null {
  const candidatos = ritos
    .filter((r) => !r.completedAt && r.scheduledAt && r.scheduledAt >= agora)
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
  return candidatos[0] ?? null;
}
