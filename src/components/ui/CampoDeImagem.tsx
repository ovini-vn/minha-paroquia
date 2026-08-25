"use client";

import { useState } from "react";
import { ACCEPT_DE_IMAGEM, problemaComImagem } from "@/lib/imagem";

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

/**
 * Escolher uma imagem: arquivo ou link, com o tamanho conferido na hora.
 *
 * Conferir aqui não é validação — o servidor refaz tudo. É para a pessoa
 * saber na hora, em vez de esperar o envio de uma foto de 4 MB para
 * descobrir que não ia dar.
 */
export function CampoDeImagem({
  nomeDoArquivo,
  nomeDoLink,
  rotulo,
  linkAtual = "",
  podeEnviarArquivo,
  motivoIndisponivel = "",
  ajuda,
}: {
  nomeDoArquivo: string;
  nomeDoLink: string;
  rotulo: string;
  linkAtual?: string;
  podeEnviarArquivo: boolean;
  motivoIndisponivel?: string;
  ajuda?: string;
}) {
  const [problema, setProblema] = useState<string | null>(null);

  function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) {
      setProblema(null);
      return;
    }
    const erro = problemaComImagem(arquivo);
    setProblema(erro);
    // Limpar o campo impede que o formulário tente enviar assim mesmo.
    if (erro) evento.target.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`img-${nomeDoArquivo}`} className="text-sm font-medium text-muted">
        {rotulo}
      </label>

      {podeEnviarArquivo ? (
        <input
          id={`img-${nomeDoArquivo}`}
          name={nomeDoArquivo}
          type="file"
          accept={ACCEPT_DE_IMAGEM}
          onChange={aoEscolher}
          className={`${campo} file:mr-3 file:rounded-md file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:text-sm file:text-primary`}
        />
      ) : (
        <p className="text-[12px] text-muted">
          O envio de arquivo não está disponível. Cole o link da imagem abaixo.
          {motivoIndisponivel ? ` (${motivoIndisponivel})` : ""}
        </p>
      )}

      {problema && <p className="text-sm text-red-600">{problema}</p>}

      <input
        name={nomeDoLink}
        type="url"
        defaultValue={linkAtual}
        placeholder="https://..."
        aria-label={`Link — ${rotulo}`}
        className={campo}
      />

      <p className="text-[12px] leading-relaxed text-muted">
        Até 5 MB. {ajuda}
      </p>
    </div>
  );
}
