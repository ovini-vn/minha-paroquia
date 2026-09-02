export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const AVAILABILITY_TYPE_LABELS: Record<string, string> = {
  atendimento: "Atendimento",
  confissao: "Confissão",
};

export const APPOINTMENT_CATEGORY_LABELS: Record<string, string> = {
  confissao: "Confissão",
  direcao_espiritual: "Direção espiritual",
  conversa: "Conversa",
  questao_familiar: "Questão familiar",
  sacramento: "Sacramento",
  outro: "Outro",
};

/**
 * A que tipo de janela cada motivo pertence.
 *
 * Existe para o formulário de agendar e a lista de sacerdotes concordarem
 * sobre o que é confissão e o que é atendimento. Sem este mapa, cada tela
 * decidiria por conta própria em qual balde cai "questão familiar", e um
 * padre marcado como "só confissões" continuaria recebendo pedidos de
 * conversa numa delas.
 *
 * Tudo o que não é confissão é atendimento — inclusive `sacramento` e
 * `outro`, que são conversa marcada com o padre como qualquer outra.
 */
export const TIPO_DO_MOTIVO: Record<string, "atendimento" | "confissao"> = {
  confissao: "confissao",
  direcao_espiritual: "atendimento",
  conversa: "atendimento",
  questao_familiar: "atendimento",
  sacramento: "atendimento",
  outro: "atendimento",
};

/** Como se diz, em uma linha, o que este sacerdote atende pelo app. */
export function oQueAtende(p: {
  ofereceAtendimento: boolean;
  ofereceConfissao: boolean;
}): string | null {
  if (p.ofereceAtendimento && p.ofereceConfissao) return null;
  if (p.ofereceConfissao) return "Só confissões";
  if (p.ofereceAtendimento) return "Não confessa pelo app";
  return "Não atende pelo app";
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
};
