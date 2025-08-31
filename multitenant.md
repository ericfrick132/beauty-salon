
● Recap rápido para configurar wildcard multi-tenant:

  1. En DigitalOcean App Platform:
  - Settings → Domains → Add Domain
  - Agregar: *.tudominio.com
  - Elegir: "You manage your domain"
  - Copiar el CNAME alias que te da

  2. En Cloudflare DNS:
  A: tudominio.com -> IP_REAL_SERVIDOR (Proxied)
  CNAME: * -> tu-app.ondigitalocean.app (DNS only)

  3. Verificación TXT:
  - DigitalOcean te dará 2 TXT records
  - Agregarlos en Cloudflare:
  TXT: _acme-challenge.tudominio.com -> valor1
  TXT: _acme-challenge.tudominio.com -> valor2

  4. Resultado:
  - tudominio.com → funciona
  - cualquier.tudominio.com → funciona automáticamente
  - No necesitas CloudflareService ni crear DNS por cada tenant

  Tiempo total: 5-10 minutos + propagación DNS.