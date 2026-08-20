import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Typography";
import { MassParticipationForm } from "./MassParticipationForm";

export default function NewMassParticipationPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Registrar missa"
        description="Guarde a data e, se quiser, o que essa celebração deixou em você. Só você lê o que escreve."
      />
      <Card>
        <MassParticipationForm />
      </Card>
    </div>
  );
}
