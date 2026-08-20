import { permanentRedirect } from "next/navigation";

/**
 * Pedidos de oração viraram uma seção de primeiro nível (aba Oração).
 * Este redirect existe porque links antigos podem estar em conversas,
 * e-mails e QR codes já impressos.
 */
export default function LegacyPrayerRequestsPage() {
  permanentRedirect("/oracao/pedidos");
}
