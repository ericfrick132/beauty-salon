import { brand } from '@/app/(lib)/brand';

// Bots que usan la web para entrenar modelos de IA: no rastrean nada. Los buscadores y los de búsqueda
// con IA (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) siguen entrando: de ahí salen
// las citas del llms.txt.
const AI_TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
  'cohere-ai',
  'cohere-training-data-crawler',
  'Diffbot',
  'Omgilibot',
  'ImagesiftBot',
  'AI2Bot',
  'PanguBot',
];

export default function robots() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    rules: isProd
      ? [
          {
            userAgent: '*',
            allow: '/',
            // Demos y paneles: no hace falta que los rastreen.
            disallow: ['/admin', '/dashboard', '/demo-admin', '/demo-app', '/login', '/api/'],
          },
          { userAgent: AI_TRAINING_BOTS, disallow: '/' },
        ]
      : [{ userAgent: '*', disallow: '/' }],
    // El blog central lo sirve el backend (/blog) con su propio sitemap.
    sitemap: [`${brand.brand_domain}/sitemap.xml`, `${brand.brand_domain}/blog/sitemap.xml`],
  };
}
