/**
 * Um segundo de som grave e baixo, em WAV.
 *
 * Serve ao BOTÃO DO VOLANTE: o carro (ou o fone Bluetooth) só entrega os
 * controles de faixa — passar, voltar, pausar — à página que está TOCANDO
 * SOM. Então o app toca isto em repetição enquanto a pessoa reza, e o
 * "próxima faixa" do volante passa a oração.
 *
 * A primeira versão era quase silêncio absoluto (amplitude 8 de 32767, com
 * volume 0,05: uns 100 dB abaixo do máximo). No teste do usuário, no fone e
 * no computador, o botão não passou a oração: para o navegador, aquilo era
 * silêncio, e quem fica com os botões é outro aplicativo. Agora a amplitude
 * é 1% do máximo, alto o bastante para contar como som tocando.
 *
 * 55 Hz porque é grave: alto-falante de celular quase não reproduz essa
 * faixa, e no carro e no fone, nesse volume, fica abaixo do ruído do
 * ambiente.
 *
 * TRINTA SEGUNDOS, e não um em repetição: no computador o botão passou a
 * funcionar com um segundo, mas em dois fones no celular não. O Android só
 * monta a ficha de mídia — e com ela os botões do fone — quando o que está
 * tocando dura MAIS DE CINCO SEGUNDOS; cada volta do laço de um segundo é
 * curta demais para ele. O laço continua, só que de trinta em trinta.
 */
export function wavQuaseEmSilencio(taxa = 8000, segundos = 30): Blob {
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
    // 1% do máximo (328 de 32767), com as bordas em rampa para o laço não
    // estalar a cada volta.
    const rampa = Math.min(1, Math.min(i, amostras - 1 - i) / 200);
    dados.setInt16(44 + i * 2, Math.round(Math.sin((i / taxa) * 2 * Math.PI * 55) * 328 * rampa), true);
  }

  return new Blob([dados.buffer], { type: "audio/wav" });
}
