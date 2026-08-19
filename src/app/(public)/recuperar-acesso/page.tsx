import { Card } from "@/components/ui/Card";
import { RequestResetForm } from "./RequestResetForm";

export default function RecoverAccessPage() {
  return (
    <Card>
      <h1 className="mb-2 font-serif text-xl text-foreground">Recuperar acesso</h1>
      <p className="mb-4 text-sm text-muted">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>
      <RequestResetForm />
    </Card>
  );
}
