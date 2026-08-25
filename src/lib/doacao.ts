import { Church, Sparkles, GraduationCap, HeartHandshake, Hammer, Music, Users, Heart } from "lucide-react";

/**
 * Ícones que a paróquia pode escolher, por chave.
 *
 * Um catálogo fechado, e não o nome do componente vindo do banco: assim a
 * tela nunca renderiza o que alguém digitou, e um ícone que deixe de existir
 * na biblioteca vira o padrão em vez de quebrar a página.
 */
export const ICONES_DE_DOACAO = {
  igreja: { rotulo: "Igreja", componente: Church },
  evangelizacao: { rotulo: "Evangelização", componente: Sparkles },
  catequese: { rotulo: "Catequese", componente: GraduationCap },
  caridade: { rotulo: "Caridade", componente: HeartHandshake },
  obras: { rotulo: "Obras", componente: Hammer },
  musica: { rotulo: "Música e liturgia", componente: Music },
  comunidade: { rotulo: "Comunidade", componente: Users },
  coracao: { rotulo: "Gratidão", componente: Heart },
} as const;

export type ChaveDeIcone = keyof typeof ICONES_DE_DOACAO;

export function iconeDeDoacao(chave: string) {
  return (ICONES_DE_DOACAO[chave as ChaveDeIcone] ?? ICONES_DE_DOACAO.igreja).componente;
}

export const CATEGORIAS_DE_INICIATIVA = {
  obras: "Obras e manutenção",
  evangelizacao: "Evangelização",
  catequese: "Catequese",
  acao_social: "Ação social",
  pastoral: "Pastoral",
  formacao: "Formação",
  outros: "Outros",
} as const;

export type CategoriaDeIniciativa = keyof typeof CATEGORIAS_DE_INICIATIVA;

/**
 * Para onde o botão "Quero ser dizimista" leva.
 *
 * Dízimo não é doação: é compromisso contínuo, acompanhado pela Pastoral do
 * Dízimo. Por isso o botão convida a conversar com alguém — não abre um
 * pagamento.
 *
 * Devolve null quando a paróquia escolheu um destino mas não preencheu para
 * onde: botão que não leva a lugar nenhum é pior que botão nenhum.
 */
export function destinoDoDizimo(
  tipo: "whatsapp" | "link" | "interno" | null,
  valor: string | null,
  nomeDaParoquia: string,
): { href: string; externo: boolean } | null {
  const alvo = valor?.trim() || "";

  if (tipo === "interno") return { href: "/eu/dizimo", externo: false };

  if (tipo === "whatsapp") {
    const numeros = alvo.replace(/\D/g, "");
    if (numeros.length < 10) return null;
    const comPais = numeros.startsWith("55") ? numeros : `55${numeros}`;
    const mensagem = encodeURIComponent(
      `Olá! Vim pelo aplicativo Minha Paróquia e gostaria de me tornar dizimista da ${nomeDaParoquia}.`,
    );
    return { href: `https://wa.me/${comPais}?text=${mensagem}`, externo: true };
  }

  if (tipo === "link") {
    if (!/^https?:\/\/\S+$/.test(alvo)) return null;
    return { href: alvo, externo: true };
  }

  return null;
}
