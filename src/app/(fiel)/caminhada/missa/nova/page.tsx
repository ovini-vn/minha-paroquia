import { Card } from "@/components/ui/Card";
import { MassParticipationForm } from "./MassParticipationForm";

export default function NewMassParticipationPage() {
  return (
    <Card>
      <h1 className="mb-4 font-serif text-xl text-ink-900">Minha Missa</h1>
      <MassParticipationForm />
    </Card>
  );
}
