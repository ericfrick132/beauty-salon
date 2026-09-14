import type { Metadata } from 'next';
import { pageAlternates } from '@/app/(lib)/seo';

// La page es un client component y no puede exportar metadata; el layout aporta título y canonical.
export const metadata: Metadata = {
  title: 'Demo del panel de TurnosPro | Agenda, señas y bot de WhatsApp',
  description:
    'Probá el panel de TurnosPro por dentro, sin registrarte: agenda de turnos, bot que confirma por WhatsApp, agente IA, señas con MercadoPago, clientes y reportes con datos de ejemplo.',
  alternates: pageAlternates('/demo-admin'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
