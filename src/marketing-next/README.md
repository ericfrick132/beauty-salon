# Marketing Next (SSR/SSG + MUI)

Este proyecto entrega una landing indexable con SSR/SSG, metadatos completos y JSON-LD.

Rutas clave
- `/` redirige a `{{marketing_path}}` (software-gimnasios)
- `/software-gimnasios` página principal SEO
- `/sitemap.xml`, `/robots.txt`

Variables de marca
- Configuradas en `app/(lib)/brand.ts`

Requisitos de assets
- Colocar `public/og-cover.jpg` (1200x630) y `public/logo.png`.

Desarrollo
- `npm install`
- `npm run dev` (escucha en 3020 por defecto)

Build/Prod
- `npm run build` y `npm start`

Notas
- MUI SSR con Emotion via `ThemeRegistry`.
- JSON-LD renderizado en el server con `<script type="application/ld+json">`.
- ISR (revalidate) 24h en la landing.

Prerender (fallback SPA)
- Ver PRERENDER.md si preferís prerender de bots en Nginx/Cloudflare.

