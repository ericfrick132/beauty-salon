import type { Metadata } from 'next';
import { pageAlternates } from '@/app/(lib)/seo';

// La page es un client component y no puede exportar metadata; el layout aporta título y canonical.
export const metadata: Metadata = {
  title: 'Demo de reservas online de TurnosPro | Así reservan tus clientes',
  description:
    'Mirá lo que ven tus clientes: eligen servicio, profesional y horario, pagan la seña con MercadoPago y confirman el turno por WhatsApp. Demo interactiva, sin registrarte.',
  alternates: pageAlternates('/demo-app'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
