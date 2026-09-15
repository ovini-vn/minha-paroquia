import { redirect } from "next/navigation";

/**
 * "Minha oferta" virou parte de Ofertar.
 *
 * Eram duas telas com as mesmas finalidades: Ofertar, com os cartões que
 * explicam cada causa, e esta, com o formulário e o histórico. Agora tudo
 * mora em /doacao (ver o comentário de lá).
 *
 * O endereço continua respondendo, e não devolve 404: há notificações
 * gravadas, favoritos e o botão "Ver como o fiel vê" do painel apontando
 * para cá. Quem chega com `?para=` continua chegando com a finalidade
 * marcada, e já rolado até o formulário.
 *
 * /contribuir/[id] — o código gerado — continua onde está: é o destino do
 * formulário, e o endereço de cada código já foi entregue a quem o gerou.
 */
export default async function ContribuirPage({
  searchParams,
}: {
  searchParams: Promise<{ para?: string }>;
}) {
  const { para } = await searchParams;
  redirect(
    para ? `/doacao?para=${encodeURIComponent(para)}#gerar-codigo` : "/doacao#gerar-codigo",
  );
}
