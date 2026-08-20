// Faixa Unicode "Combining Diacritical Marks" (0x0300-0x036f), construída por
// código para evitar problemas de encoding de caracteres combinantes no
// arquivo-fonte.
const COMBINING_MARKS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

/** "Paróquia N. S. de Fátima" -> "paroquia-n-s-de-fatima" */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "") // remove acentos (á -> a, ç -> c, ...)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
