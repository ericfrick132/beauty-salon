import type { Metadata } from 'next';
import { pageAlternates } from '@/app/(lib)/seo';
import PromoClient from './PromoClient';

// La promo vigente cambia con el calendario (la carga sales-hub por /api/hub/promos): la página es un
// shell estático y el contenido se trae en el cliente de /api/promos/active. No se indexa.
export const metadata: Metadata = {
  title: 'Promo TurnosPro — descuento en tu suscripción',
  description: 'La promo vigente de TurnosPro: tu código de descuento para los primeros meses de tu suscripción.',
  alternates: pageAlternates('/promo'),
  robots: { index: false, follow: true },
};

export default function PromoPage() {
  return <PromoClient />;
}
