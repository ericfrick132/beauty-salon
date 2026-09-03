// Artículos del export estático, servidos bajo /guias. /blog NO va acá: el ingress de DO lo enruta al backend (blog central de sales-hub).
export type BlogArticle = {
  slug: string;
  path: string;
  title: string;
  h1: string;
  description: string;
  excerpt: string;
  datePublished: string;
  dateModified: string;
};

export const blogArticles: BlogArticle[] = [
  {
    slug: 'mejor-sistema-de-turnos-online-argentina',
    path: '/guias/mejor-sistema-de-turnos-online-argentina',
    title: 'Mejor sistema de turnos online en Argentina (2026)',
    h1: '¿Cuál es el mejor sistema de turnos online en Argentina en 2026?',
    description:
      'Qué tiene que tener un sistema de turnos online en Argentina: criterios, precios y comparativa de Gendu, ReservaSimple, Turnify, Turnito y TurnosPro.',
    excerpt:
      'Criterios para elegir, qué tiene que tener sí o sí, comparativa honesta de las opciones más conocidas y cuánto cuesta cada una.',
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
];
