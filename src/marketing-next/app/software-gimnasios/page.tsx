import type { Metadata } from 'next';
import Image from 'next/image';
import { Container, Box, Typography, Button, Grid, Chip, Card, CardContent } from '@mui/material';
import Header from '@/app/(components)/Header';
import Footer from '@/app/(components)/Footer';
import { brand } from '@/app/(lib)/brand';
import { organizationSchema, softwareAppSchema, faqSchema } from '@/app/(lib)/schema';

export const revalidate = 60 * 60 * 24; // ISR cada 24h

export const metadata: Metadata = {
  title: `Software para Gimnasios y CrossFit | ${brand.brand_name}`,
  description: 'Gestioná membresías, turnos y cobros en un solo lugar. Demo gratis.',
  alternates: {
    canonical: `${brand.brand_domain}${brand.marketing_path}`,
  },
  openGraph: {
    title: 'Software para Gimnasios y CrossFit',
    description: 'Gestioná membresías, turnos y cobros. Demo gratis.',
    url: `${brand.brand_domain}${brand.marketing_path}`,
    type: 'website',
    images: [brand.og_image],
    locale: brand.lang,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Software para Gimnasios y CrossFit',
    description: 'Gestioná membresías, turnos y cobros. Demo gratis.',
    images: [brand.og_image],
  },
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const faqs = [
  { q: '¿Puedo cobrar membresías con tarjeta?', a: 'Sí, integraciones con Stripe/MercadoPago.' },
  { q: '¿Hay prueba gratis?', a: 'Ofrecemos demo guiada sin costo.' },
];

export default function Page() {
  const jsonLd = [organizationSchema(), softwareAppSchema(), faqSchema(faqs)];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[2]) }} />

      <Header />

      <main>
        <Box component="section" aria-labelledby="hero-title" sx={{ py: { xs: 6, md: 10 }, borderBottom: '1px solid #f0f0f0' }}>
          <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { md: '1.2fr 1fr' }, gap: 4, alignItems: 'center' }}>
            <Box>
              <Typography id="hero-title" component="h1" variant="h2" sx={{ fontWeight: 800, mb: 2 }}>
                Software para Gimnasios y CrossFit
              </Typography>
              <Typography component="p" variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
                Reservas, cobros y fidelización en una sola plataforma.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button href="#pricing" variant="contained" size="large" color="primary">Probar gratis</Button>
                <Button href="/login" variant="outlined" size="large">Login Admin</Button>
              </Box>
              <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {brand.secondary_keywords.map((k) => (
                  <Chip key={k} label={k} size="small" />
                ))}
              </Box>
            </Box>
            <Box sx={{ justifySelf: 'center' }}>
              <Image
                src="/og-cover.jpg"
                alt="Panel de gestión de gimnasio con reservas y pagos"
                width={840}
                height={472}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ width: '100%', height: 'auto', borderRadius: 12 }}
              />
            </Box>
          </Container>
        </Box>

        <Box id="features" component="section" aria-labelledby="features-title" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Typography id="features-title" component="h2" variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
              Características
            </Typography>
            <Grid container spacing={3}>
              {[
                { t: 'Gestión de socios', d: 'Altas, bajas, vencimientos y comunicación.' },
                { t: 'Reservas de turnos', d: 'Clases, boxes y turnos con cupos.' },
                { t: 'Pagos y facturación', d: 'Integraciones con Stripe / MercadoPago.' },
                { t: 'Control de acceso', d: 'Accesos por membresía y asistencia.' },
                { t: 'Reportes y KPIs', d: 'Ingresos, retención y asistencia.' },
                { t: 'CrossFit y Boxes', d: 'WODs, reservas por horario, listas.' },
              ].map((f) => (
                <Grid key={f.t} item xs={12} sm={6} md={4}>
                  <Card component="article" aria-label={f.t}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.t}</Typography>
                      <Typography variant="body2" color="text.secondary">{f.d}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box id="pricing" component="section" aria-labelledby="pricing-title" sx={{ py: { xs: 6, md: 10 }, bgcolor: '#fafafa' }}>
          <Container maxWidth="lg">
            <Typography id="pricing-title" component="h2" variant="h3" sx={{ fontWeight: 800, mb: 3 }}>Precios</Typography>
            <Grid container spacing={3}>
              {[{ name: 'Starter', price: 'Gratis 14 días' }, { name: 'Pro', price: 'ARS 9.900/mes' }].map((p) => (
                <Grid key={p.name} item xs={12} md={6}>
                  <Card component="article" aria-label={`Plan ${p.name}`}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{p.price}</Typography>
                      <Button href="#cta" variant="contained">Empezar</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box id="testimonials" component="section" aria-labelledby="testimonials-title" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Typography id="testimonials-title" component="h2" variant="h3" sx={{ fontWeight: 800, mb: 3 }}>Testimonios</Typography>
            <Grid container spacing={3}>
              {[
                { n: 'Box Titan', t: 'Duplicamos reservas y bajamos la mora.' },
                { n: 'Gimnasio Centro', t: 'Los cobros automáticos nos ordenaron.' },
              ].map((c) => (
                <Grid key={c.n} item xs={12} md={6}>
                  <Card component="figure" aria-label={`Testimonio de ${c.n}`}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.n}</Typography>
                      <Typography variant="body2" color="text.secondary">“{c.t}”</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box id="faqs" component="section" aria-labelledby="faqs-title" sx={{ py: { xs: 6, md: 10 }, bgcolor: '#fafafa' }}>
          <Container maxWidth="lg">
            <Typography id="faqs-title" component="h2" variant="h3" sx={{ fontWeight: 800, mb: 3 }}>Preguntas frecuentes</Typography>
            <dl>
              {faqs.map((f) => (
                <div key={f.q} style={{ marginBottom: 12 }}>
                  <Typography component="dt" variant="subtitle1" sx={{ fontWeight: 700 }}>{f.q}</Typography>
                  <Typography component="dd" variant="body2" color="text.secondary">{f.a}</Typography>
                </div>
              ))}
            </dl>
          </Container>
        </Box>

        <Box id="cta" component="section" aria-labelledby="cta-title" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
            <Typography id="cta-title" component="h2" variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Probá {brand.brand_name} gratis
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Empezá en minutos. Sin tarjeta requerida.
            </Typography>
            <Button href="#pricing" variant="contained" size="large">Crear cuenta</Button>
          </Container>
        </Box>
      </main>

      <Footer />
    </>
  );
}

