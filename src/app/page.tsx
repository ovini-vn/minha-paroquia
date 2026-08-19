import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";

export default async function RootPage() {
  const session = await getSessionContext();
  redirect(session ? "/inicio" : "/login");
}
