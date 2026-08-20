import "server-only";
import { sendEmail } from "./mailer";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Redefinir sua senha — Minha Paróquia",
    html: `
      <p>Você pediu para redefinir sua senha na Minha Paróquia.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>.</p>
      <p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
      <p>Este link expira em 1 hora.</p>
    `,
  });
}
