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
};

export default nextConfig;
