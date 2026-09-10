export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  urgente: "Urgente",
  pessoal: "Pessoal",
  pastoral: "Pastoral",
  espiritual: "Espiritual",
  descoberta: "Dicas do aplicativo",
};

/**
 * O que cada categoria significa, na tela onde a pessoa decide desligar.
 *
 * Sem isto, "Dicas do aplicativo" ao lado de "Pastoral" e "Urgente" obriga
 * a adivinhar o que se perde ao desmarcar — e na dúvida a pessoa desliga
 * tudo ou não desliga nada.
 */
export const NOTIFICATION_CATEGORY_HINTS: Record<string, string> = {
  urgente: "Mudança de horário de missa, cancelamento, o que não pode esperar.",
  pessoal: "O que é só seu: atendimento confirmado, escala, sua família.",
  pastoral: "A vida da comunidade — avisos da secretaria e o resumo da semana.",
  espiritual: "A Palavra do Padre e o que alimenta a sua oração.",
  descoberta: "Uma dica por vez sobre o que o aplicativo faz. Param sozinhas quando você usa.",
};
