/** Como descrever o parentesco; nulo no cadastro feito pela secretaria. */
export function describeRelationship(relationship: string | null): string {
  if (!relationship) return "Cadastrado pela secretaria";
  return RELATIONSHIP_LABELS[relationship] ?? relationship;
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  conjuge: "Cônjuge",
  filho: "Filho",
  filha: "Filha",
  pai: "Pai",
  mae: "Mãe",
  dependente: "Dependente",
  outro: "Outro",
};
