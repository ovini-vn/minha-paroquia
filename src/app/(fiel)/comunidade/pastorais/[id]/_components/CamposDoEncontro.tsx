"use client";

import { useState } from "react";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { CHAVES_DE_ICONE } from "@/lib/grupos/cronograma";
import { ICONES_DE_ENCONTRO } from "@/lib/grupos/icones";

export type ValoresDoEncontro = {
  data: string | null;
  dataFim: string | null;
  mesPrevisto: string | null;
  tema: string;
  complemento: string | null;
  pregador: string | null;
  destaque: boolean;
  icone: string | null;
};

const rotulo = "text-sm font-medium text-muted";

/**
 * Os campos de um encontro, os mesmos para incluir e para corrigir.
 *
 * "Data a definir" troca os campos de data pelo mês previsto, em vez de
 * deixar os dois à vista: com as duas coisas na tela, alguém preenche as
 * duas e fica sem saber qual valeu.
 *
 * Quem prega vem logo depois do tema, e não no fim: é o campo que a
 * coordenação volta para preencher toda semana, e o motivo de esta tela
 * existir além do cartaz.
 */
export function CamposDoEncontro({ id, valores }: { id: string; valores?: ValoresDoEncontro }) {
  const [semData, setSemData] = useState(valores ? valores.data === null : false);
  const [destaque, setDestaque] = useState(valores?.destaque ?? false);
  const [icone, setIcone] = useState(valores?.icone ?? "estrela");
  const Icone = ICONES_DE_ENCONTRO[icone as keyof typeof ICONES_DE_ENCONTRO]?.componente;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`tema-${id}`} className={rotulo}>
          Tema
        </label>
        <input
          id={`tema-${id}`}
          name="tema"
          required
          maxLength={200}
          defaultValue={valores?.tema ?? ""}
          placeholder="Quem sou eu de verdade?"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`pregador-${id}`} className={rotulo}>
          Quem prega
        </label>
        <input
          id={`pregador-${id}`}
          name="pregador"
          maxLength={120}
          defaultValue={valores?.pregador ?? ""}
          placeholder="Nome de quem vai pregar"
          className={INPUT_CLASSES}
        />
      </div>

      <label className="flex items-center gap-2.5 text-[14px] text-foreground">
        <input
          type="checkbox"
          name="semData"
          checked={semData}
          onChange={(e) => setSemData(e.target.checked)}
        />
        Data a definir
      </label>

      {semData ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`mes-${id}`} className={rotulo}>
            Por volta de que mês (só para a ordem da lista)
          </label>
          <input
            id={`mes-${id}`}
            name="mesPrevisto"
            type="month"
            defaultValue={valores?.mesPrevisto ?? ""}
            className={INPUT_CLASSES}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`data-${id}`} className={rotulo}>
              Dia
            </label>
            <input
              id={`data-${id}`}
              name="data"
              type="date"
              required
              defaultValue={valores?.data ?? ""}
              className={INPUT_CLASSES}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`fim-${id}`} className={rotulo}>
              Até (se durar mais de um dia)
            </label>
            <input
              id={`fim-${id}`}
              name="dataFim"
              type="date"
              defaultValue={valores?.dataFim ?? ""}
              className={INPUT_CLASSES}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`complemento-${id}`} className={rotulo}>
          Complemento (opcional)
        </label>
        <input
          id={`complemento-${id}`}
          name="complemento"
          maxLength={120}
          defaultValue={valores?.complemento ?? ""}
          placeholder="Seminário · junto com a juventude · casa de encontro"
          className={INPUT_CLASSES}
        />
      </div>

      <label className="flex items-start gap-2.5 text-[14px] text-foreground">
        <input
          type="checkbox"
          name="destaque"
          className="mt-1"
          checked={destaque}
          onChange={(e) => setDestaque(e.target.checked)}
        />
        <span>
          Encontro em destaque
          <span className="mt-0.5 block text-[13px] text-muted">
            Seminário, retiro, confraternização — o que foge da formação de sempre.
          </span>
        </span>
      </label>

      {destaque && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`icone-${id}`} className={rotulo}>
            Ícone
          </label>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white dark:bg-primary-light">
              {Icone && <Icone className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden />}
            </span>
            <select
              id={`icone-${id}`}
              name="icone"
              value={icone}
              onChange={(e) => setIcone(e.target.value)}
              className={INPUT_CLASSES}
            >
              {CHAVES_DE_ICONE.map((chave) => (
                <option key={chave} value={chave}>
                  {ICONES_DE_ENCONTRO[chave].rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
