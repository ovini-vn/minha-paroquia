import { LinkButton } from "@/components/ui/Button";

export function OAuthButtons({ inviteCode }: { inviteCode?: string | null }) {
  const suffix = inviteCode ? `?convite=${inviteCode}` : "";

  return (
    <div className="flex flex-col gap-2">
      <LinkButton href={`/api/auth/google${suffix}`} variant="secondary" className="w-full">
        Entrar com Google
      </LinkButton>
      <LinkButton href={`/api/auth/facebook${suffix}`} variant="secondary" className="w-full">
        Entrar com Facebook
      </LinkButton>
    </div>
  );
}
