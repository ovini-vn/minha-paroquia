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

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
};
