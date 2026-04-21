/**
 * Placeholder testimonials for the /login and /register split-screen layout.
 *
 * Real quotes from customers should replace these when available. The
 * avatarSeed refers to pravatar.cc (https://i.pravatar.cc/88?img={seed}),
 * which returns realistic portraits for seeds 1–70.
 */

export interface AuthTestimonial {
  handle: string;
  avatarSeed: number;
  quote: string;
}

export const authTestimonials: AuthTestimonial[] = [
  {
    handle: '@estudio.luli',
    avatarSeed: 3,
    quote:
      'Antes perdía 3 turnos por semana porque no confirmaban. Ahora el recordatorio automático los trae.',
  },
  {
    handle: '@barberia.elnorte',
    avatarSeed: 7,
    quote:
      'Cargo los turnos de 3 barberos desde el celular y el cliente reserva solo. Mi señora no atiende más el WhatsApp del local.',
  },
  {
    handle: '@spa.candela',
    avatarSeed: 19,
    quote:
      'Cobro la seña del 30% al momento de reservar y los no-shows bajaron a la mitad. Eso ya paga la app x5.',
  },
];

export const authHeadline = 'Más reservas, menos no-shows.';
export const authSubtitle = 'Lo que dicen estudios que ya lo usan.';

// Unsplash photo for the left panel background (spa/salon scene).
// A dark overlay (rgba(23, 20, 16, 0.55)) is applied on top for contrast.
export const authBackgroundUrl =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&h=2000&q=80&auto=format&fit=crop';
