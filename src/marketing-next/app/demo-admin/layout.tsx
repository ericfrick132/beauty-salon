import type { Metadata } from 'next';
import { pageAlternates } from '@/app/(lib)/seo';

// La page es un client component y no puede exportar metadata; el layout aporta título y canonical.
export const metadata: Metadata = {
  title: 'Demo del panel de TurnosPro | Agenda, señas y WhatsApp',
  description:
    'Probá el panel de TurnosPro sin registrarte: agenda de turnos, bot que confirma por WhatsApp, señas con Mercado Pago y reportes, con datos de ejemplo.',
  alternates: pageAlternates('/demo-admin'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
