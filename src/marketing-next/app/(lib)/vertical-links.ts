// Registro liviano de las landings por vertical. Lo importan componentes cliente
// (BusinessTypes, Footer) sin arrastrar todo el copy de verticals.ts al bundle.
export type VerticalLink = { slug: string; path: string; label: string; businessTypeLabel: string };

export const verticalLinks: VerticalLink[] = [
  { slug: 'sistema-de-turnos-para-peluquerias', path: '/sistema-de-turnos-para-peluquerias', label: 'Peluquerías', businessTypeLabel: 'Peluquerías' },
  { slug: 'sistema-de-turnos-para-barberias', path: '/sistema-de-turnos-para-barberias', label: 'Barberías', businessTypeLabel: 'Barberías' },
  { slug: 'sistema-de-turnos-para-centros-de-estetica', path: '/sistema-de-turnos-para-centros-de-estetica', label: 'Centros de estética', businessTypeLabel: 'Estética' },
  { slug: 'sistema-de-turnos-para-consultorios', path: '/sistema-de-turnos-para-consultorios', label: 'Consultorios', businessTypeLabel: 'Consultorios' },
];

// Landings de funcionalidad (no son rubros): van al Footer pero no a BusinessTypes ni a RelatedVerticals.
export const featureLinks = [
  { path: '/reservas-online', label: 'Recordatorio de turnos por WhatsApp' },
  { path: '/sistema-de-turnos-con-sena', label: 'Turnos con seña por Mercado Pago' },
  { path: '/sistema-de-turnos-online-gratis', label: 'Sistema de turnos online gratis' },
];

/** Etiqueta de BusinessTypes → path de la landing vertical (si existe). */
export const verticalPathByBusinessType: Record<string, string> = Object.fromEntries(
  verticalLinks.map((v) => [v.businessTypeLabel, v.path]),
);

// /blog lo sirve el backend (blog central), no el export: se linkea con <a> común, no con next/link.
export const blogLinks = [
  { path: '/blog/mejor-sistema-de-turnos-online-argentina/', label: 'Mejor sistema de turnos online en Argentina' },
];
