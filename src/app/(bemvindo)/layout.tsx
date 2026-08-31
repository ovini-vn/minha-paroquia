import { atributoDoTempo } from "@/lib/liturgical-season";
import { getSessionContext } from "@/server/auth/session";

/**
 * Sem cabeçalho, sem abas, sem rodapé.
 *
 * As boas-vindas são o único lugar do app onde a navegação atrapalha: a
 * pessoa acabou de chegar e não sabe o que as abas significam — oferecer
 * saída antes de explicar entrada é o que faz alguém sumir na primeira
 * tela.
 */
export default async function BemVindoLayout({ children }: { children: React.ReactNode }) {
  /*
   * O tempo litúrgico aqui era aplicado SEMPRE — o mesmo desencontro do
   * painel, ao contrário. Nas boas-vindas a pessoa ESCOLHE a aparência, e a
   * tela precisa mostrar o que ela acabou de escolher: pintando de tempo
   * litúrgico quem pediu a cor da marca, o botão não confirmava nada.
   */
  const session = await getSessionContext();

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background"
      data-season={atributoDoTempo(session?.themePreference)}
    >
      {children}
    </div>
  );
}
