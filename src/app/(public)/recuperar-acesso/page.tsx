import { Card } from "@/components/ui/Card";
import { RequestResetForm } from "./RequestResetForm";

export default function RecoverAccessPage() {
  return (
    <Card className="p-6 shadow">
      <h1 className="mb-2 font-serif text-2xl font-semibold text-foreground">Recuperar acesso</h1>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>
      <RequestResetForm />
    </Card>
  );
}
