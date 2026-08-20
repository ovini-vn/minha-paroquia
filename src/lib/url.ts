/**
 * Base URL da aplicação, usada para montar links absolutos em lugares sem
 * acesso à `request` (ex.: corpo de e-mail enviado a partir de uma Server
 * Action). Em produção precisa vir de `APP_URL`; em dev cai no localhost.
 */
export function appBaseUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}
