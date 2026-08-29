import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita que o Next.js detecte C:\Users\Vini_ como raiz do workspace por
  // causa de um package-lock.json não relacionado nesse diretório pai.
  outputFileTracingRoot: path.resolve(import.meta.dirname),

  experimental: {
    serverActions: {
      /**
       * O padrão do Next.js é 1 MB, e a plataforma recusa a requisição
       * ANTES de ela chegar no nosso código — com um 413 que virava tela
       * branca de "Application error", sem passar por nenhuma validação
       * nossa. Foto de celular passa de 1 MB com facilidade.
       *
       * Quem manda no limite de verdade é `uploadImagem`, que recusa acima
       * de 5 MB com uma mensagem legível. A folga aqui é para o resto do
       * formulário (texto, campos) caber junto no mesmo envio.
       */
      bodySizeLimit: "6mb",
    },
  },

  /**
   * Cabeçalhos de segurança.
   *
   * A Vercel já entrega HTTPS e HSTS no domínio dela; o resto é nosso, e
   * passa a valer também no dia em que houver domínio próprio.
   *
   * Sobre a CSP, e por que ela aqui é curta: `script-src` de verdade exige
   * nonce por requisição, e nonce exige `middleware.ts`, que este projeto
   * não tem de propósito — as guardas moram nos layouts e nas actions.
   * Escrever `script-src 'unsafe-inline' 'unsafe-eval'` só para ter a linha
   * seria teatro: não bloqueia nada e passa a impressão de proteção.
   *
   * O que está aqui é o que a CSP consegue impor SEM nonce, e cada diretiva
   * fecha um ataque concreto:
   *
   * - `frame-ancestors 'none'` — ninguém embute o app num iframe para
   *   capturar clique. `X-Frame-Options` repete a mesma regra para
   *   navegador antigo, que não entende a diretiva.
   * - `base-uri 'self'` — uma <base> injetada não redireciona todo caminho
   *   relativo da página para outro servidor.
   * - `form-action 'self'` — formulário nenhum envia para fora. Todos os
   *   nossos vão para Server Action na mesma origem.
   *
   * `img-src` ficou de fora conscientemente: a secretaria cola link de
   * imagem de qualquer host, e a lista só poderia ser `*`.
   */
  async headers() {
    return [
      {
        source: "/:caminho*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          // Impede o navegador de "adivinhar" que um upload da secretaria é
          // outra coisa — imagem enviada não vira script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sai o domínio na navegação para fora, nunca o caminho: o
          // endereço de uma tela pode conter identificador de paróquia.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nada aqui usa câmera, microfone ou localização. Negar tudo
          // significa que um script de terceiro também não consegue pedir.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
