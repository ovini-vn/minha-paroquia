"use client";

import { useActionState } from "react";
import { salvarPreparacaoAction, type PreparacaoState } from "@/server/actions/preparacao-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

/**
 * O que a paróquia pede para um batismo ou um casamento.
 *
 * Três campos, na ordem em que a família pergunta no balcão: "o que eu
 * faço?", "o que eu trago?", "quando é o curso?". Sem campo de valor — a
 * taxa, onde houver, é conversa do balcão, não do app.
 */
export function PreparacaoForm({
  tipo,
  nome,
  orientacao,
  documentos,
  encontros,
}: {
  tipo: string;
  nome: string;
  orientacao: string;
  documentos: string[];
  encontros: string;
}) {
  const [estado, salvar, salvando] = useActionState(salvarPreparacaoAction, {} as PreparacaoState);
  const id = (campo: string) => `${tipo}-${campo}`;

  return (
    <form action={salvar} className="flex flex-col gap-3">
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("orientacao")} className="text-xs font-medium text-muted">
          Orientação para a família
        </label>
        <textarea
          id={id("orientacao")}
          name="orientacao"
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          defaultValue={orientacao}
          placeholder={
            tipo === "batismo"
              ? "Procure a secretaria com pelo menos dois meses de antecedência. Pais e padrinhos participam de um encontro de preparação..."
              : "Procure a secretaria com pelo menos seis meses de antecedência para marcar a data e o encontro de noivos..."
          }
          className={INPUT_CLASSES}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("documentos")} className="text-xs font-medium text-muted">
          Documentos — um por linha
        </label>
        <textarea
          id={id("documentos")}
          name="documentos"
          rows={5}
          defaultValue={documentos.join("\n")}
          placeholder={
            tipo === "batismo"
              ? "Certidão de nascimento da criança\nRG e CPF dos pais\nComprovante de crisma dos padrinhos"
              : "Certidão de batismo atualizada dos noivos\nRG e CPF\nCertificado do encontro de noivos"
          }
          className={INPUT_CLASSES}
        />
        <p className="text-[12px] text-muted">A família marca cada um no celular conforme vai juntando.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("encontros")} className="text-xs font-medium text-muted">
          Encontros de preparação (opcional)
        </label>
        <textarea
          id={id("encontros")}
          name="encontros"
          rows={2}
          maxLength={2000}
          defaultValue={encontros}
          placeholder="Segundo sábado do mês, às 15h, no salão paroquial"
          className={INPUT_CLASSES}
        />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={salvando}>
          {salvando ? "Salvando..." : `Salvar ${nome.toLowerCase()}`}
        </Button>
      </div>
      {estado.error && <p className="text-sm text-error">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-primary">{estado.ok}</p>}
    </form>
  );
}
