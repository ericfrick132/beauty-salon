// Registro liviano de las landings por vertical. Lo importan componentes cliente
// (BusinessTypes, Footer) sin arrastrar todo el copy de verticals.ts al bundle.
export type VerticalLink = { slug: string; path: string; label: string; businessTypeLabel: string };

export const verticalLinks: VerticalLink[] = [
  { slug: 'sistema-de-turnos-para-peluquerias', path: '/sistema-de-turnos-para-peluquerias', label: 'Peluquerías', businessTypeLabel: 'Peluquerías' },
  { slug: 'sistema-de-turnos-para-barberias', path: '/sistema-de-turnos-para-barberias', label: 'Barberías', businessTypeLabel: 'Barberías' },
  { slug: 'sistema-de-turnos-para-centros-de-estetica', path: '/sistema-de-turnos-para-centros-de-estetica', label: 'Centros de estética', businessTypeLabel: 'Estética' },
  { slug: 'sistema-de-turnos-para-consultorios', path: '/sistema-de-turnos-para-consultorios', label: 'Consultorios', businessTypeLabel: 'Consultorios' },
];

/** Etiqueta de BusinessTypes → path de la landing vertical (si existe). */
export const verticalPathByBusinessType: Record<string, string> = Object.fromEntries(
  verticalLinks.map((v) => [v.businessTypeLabel, v.path]),
);

export const blogLinks = [
  { path: '/blog/mejor-sistema-de-turnos-online-argentina', label: 'Mejor sistema de turnos online en Argentina' },
];
