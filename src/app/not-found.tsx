import { TelaDeErro } from "@/components/domain/TelaDeErro";

/**
 * Endereço que não existe.
 *
 * Separado do erro de servidor de propósito: não houve falha nenhuma, a
 * pessoa só chegou a um lugar que não existe — por link antigo, endereço
 * digitado à mão ou aviso que apontava para algo já apagado. O texto não
 * pede desculpa por um problema que não houve, e não oferece "tentar de
 * novo", que aqui não levaria a lugar nenhum.
 */
export default function NaoEncontrado() {
  return (
    <TelaDeErro
      variante="ausente"
      titulo="Esta página não existe"
      descricao="O endereço pode ter mudado, ou o que estava aqui foi removido. O caminho de volta está logo abaixo."
      voltarPara="/inicio"
      rotuloDoVoltar="Voltar ao início"
    />
  );
}
