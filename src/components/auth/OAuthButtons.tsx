/**
 * Botões de login social nas marcas oficiais.
 *
 * Google e Meta publicam diretrizes de marca para estes botões, e segui-las
 * não é capricho: quem chega numa tela de senha precisa reconhecer na hora
 * que aquele botão leva ao Google de verdade, e não a uma imitação. Botão
 * genérico, com a cor do nosso app, é exatamente o que uma tela falsa
 * faria.
 *
 * Por isso as marcas vêm desenhadas com as cores e proporções oficiais, e o
 * texto usa uma das frases aprovadas por cada um.
 */

/** O "G" de quatro cores, nas proporções e cores oficiais do Google. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] shrink-0" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** O "f" do Facebook, branco sobre o azul da marca. */
function LogoFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] shrink-0" aria-hidden focusable="false">
      <path
        fill="#FFFFFF"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}

export function OAuthButtons({ inviteCode }: { inviteCode?: string | null }) {
  const suffix = inviteCode ? `?convite=${encodeURIComponent(inviteCode)}` : "";

  const base =
    "flex h-12 w-full items-center justify-center gap-3 rounded-xl text-[15px] font-medium transition-opacity hover:opacity-90";

  return (
    <div className="flex flex-col gap-2.5">
      {/*
        Fundo branco com borda cinza no tema claro e fundo quase preto no
        escuro: são as duas variantes que o Google publica. O "G" mantém as
        quatro cores nos dois, porque é assim que ele é reconhecido.
      */}
      <a
        href={`/api/auth/google${suffix}`}
        className={`${base} border border-[#747775] bg-white text-[#1f1f1f] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3]`}
      >
        <LogoGoogle />
        Fazer login com o Google
      </a>

      {/* #1877F2 é o azul de marca do Facebook — o mesmo em qualquer tema. */}
      <a
        href={`/api/auth/facebook${suffix}`}
        className={`${base} bg-[#1877F2] text-white`}
      >
        <LogoFacebook />
        Continuar com o Facebook
      </a>
    </div>
  );
}
