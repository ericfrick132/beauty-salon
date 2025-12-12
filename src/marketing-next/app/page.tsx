import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Turnos Pro | Reservas con seña, MercadoPago y WhatsApp',
  description: '80% menos cancelaciones: señas con MercadoPago, confirmación automática y recordatorios por WhatsApp.',
};

export default function Page() {
  return (
    <main style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
      <iframe
        src="/landing/index.html"
        title="Turnos Pro Landing"
        style={{ border: 'none', width: '100%', minHeight: '100vh' }}
      />
    </main>
  );
}

