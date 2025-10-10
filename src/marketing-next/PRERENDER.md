Si no migrás a Next.js, podés usar un servicio de prerender (Prerender.io/Rendertron) detrás de Nginx/Cloudflare para servir HTML a bots.

Ejemplo Nginx (bots → prerender, usuarios → SPA):

map $http_user_agent $is_bot {
  default 0;
  ~*(Googlebot|Bingbot|DuckDuckBot|facebookexternalhit|Twitterbot|Yandex) 1;
}

server {
  location / {
    if ($is_bot) {
      proxy_set_header X-Prerender-Token TU_TOKEN;
      proxy_pass https://service.prerender.io/$host$request_uri;
      break;
    }
    try_files $uri /index.html;
  }
}

