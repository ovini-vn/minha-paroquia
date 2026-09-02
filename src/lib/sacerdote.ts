/**
 * Como o sacerdote se chama, tenha ele conta ou não.
 *
 * Existe porque `priest.user.fullName` deixou de ser sempre verdade: um
 * padre que não usa o aplicativo tem perfil sem conta, e o nome dele vive
 * em `nome`. Eram catorze telas lendo a conta direto — cada uma teria de
 * lembrar do caso sozinha, e a que esquecesse mostraria uma linha em
 * branco em vez do nome do pároco.
 *
 * O NOME DIGITADO GANHA quando existe. É a mesma regra de `resolverParoco`
 * e pela mesma razão: quem digitou acabou de afirmar aquilo de propósito,
 * enquanto o nome da conta pode ser o de quem opera a ferramenta.
 */
export type SacerdoteIdentificavel = {
  nome: string | null;
  user: { fullName: string } | null;
};

export function nomeDoSacerdote(p: SacerdoteIdentificavel): string {
  return p.nome?.trim() || p.user?.fullName || "Sacerdote";
}

/**
 * Só quem tem conta administra a própria agenda e assina a Palavra.
 *
 * Um perfil sem conta não tem como entrar no app: não há de quem exigir
 * senha. Quem cuida da agenda dele é a secretaria, pelo painel.
 */
export function usaOAplicativo(p: { userId: string | null }): boolean {
  return p.userId !== null;
}
