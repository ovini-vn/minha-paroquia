/**
 * Um segundo de quase-silêncio, em WAV.
 *
 * Serve ao BOTÃO DO VOLANTE: o carro (ou o fone Bluetooth) só oferece os
 * controles de faixa — passar, voltar, pausar — quando o aparelho está
 * tocando alguma coisa. Então o app toca isto em repetição enquanto a
 * pessoa reza, e o "próxima faixa" do volante passa a oração.
 *
 * Silêncio absoluto não serve: alguns navegadores e alguns carros ignoram
 * uma faixa muda. É uma onda de 60 Hz com amplitude perto de zero —
 * inaudível no carro, mas contada como som tocando.
 */
export function wavQuaseEmSilencio(taxa = 8000, segundos = 1): Blob {
  const amostras = Math.max(1, Math.round(taxa * segundos));
  const dados = new DataView(new ArrayBuffer(44 + amostras * 2));

  const texto = (posicao: number, valor: string) => {
    for (let i = 0; i < valor.length; i++) dados.setUint8(posicao + i, valor.charCodeAt(i));
  };

  texto(0, "RIFF");
  dados.setUint32(4, 36 + amostras * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  dados.setUint32(16, 16, true); // tamanho do bloco de formato
  dados.setUint16(20, 1, true); // PCM
  dados.setUint16(22, 1, true); // mono
  dados.setUint32(24, taxa, true);
  dados.setUint32(28, taxa * 2, true); // bytes por segundo
  dados.setUint16(32, 2, true); // bytes por amostra
  dados.setUint16(34, 16, true); // bits por amostra
  texto(36, "data");
  dados.setUint32(40, amostras * 2, true);

  for (let i = 0; i < amostras; i++) {
    dados.setInt16(44 + i * 2, Math.round(Math.sin((i / taxa) * 2 * Math.PI * 60) * 8), true);
  }

  return new Blob([dados.buffer], { type: "audio/wav" });
}
