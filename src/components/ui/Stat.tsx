import { Card } from "./Card";

/** Número grande serifado + rótulo — usado nos painéis de gestão. */
export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-[15px]">
      <p className="font-serif text-3xl font-semibold leading-none text-primary">{value}</p>
      <p className="mt-1.5 text-[11.5px] leading-snug text-muted">{label}</p>
    </Card>
  );
}
