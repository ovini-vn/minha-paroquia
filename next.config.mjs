import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita que o Next.js detecte C:\Users\Vini_ como raiz do workspace por
  // causa de um package-lock.json não relacionado nesse diretório pai.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default nextConfig;
