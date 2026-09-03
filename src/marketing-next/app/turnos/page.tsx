import type { Metadata } from 'next';

// /turnos es un duplicado exacto de la home: canonical a '/' y noindex,follow
// para que Google consolide señales en la home y no indexe esta copia.
export const metadata: Metadata = {
  title: 'Turnos Pro | Agenda con IA, señas con MercadoPago y WhatsApp',
  description: '80% menos cancelaciones: agente de IA que confirma turnos por WhatsApp, señas con MercadoPago y recordatorios automáticos.',
  alternates: { canonical: '/' },
  robots: { index: false, follow: true },
};

export { default } from '../page';
