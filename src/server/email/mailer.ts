import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Sem `RESEND_API_KEY`/`EMAIL_FROM` configurados (dev local), só loga no
 * console — mesmo comportamento que o app já tinha antes de ter um provedor
 * de e-mail. Em produção essas variáveis são obrigatórias.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[dev] E-mail não enviado (provedor não configurado) — para ${to}: "${subject}"`);
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail via Resend (status ${response.status}).`);
  }
}
