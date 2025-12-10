import type { Metadata } from 'next';
import Image from 'next/image';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Header from '@/app/(components)/Header';
import Footer from '@/app/(components)/Footer';
import { brand } from '@/app/(lib)/brand';
import { organizationSchema, softwareAppSchema, faqSchema, videoSchema } from '@/app/(lib)/schema';

export const metadata: Metadata = {
  title: `Demo guiada de ${brand.brand_name} | Software para Gimnasios y CrossFit`,
  description: 'Convertí más visitas en demos. Reservas, cobros y control de acceso en un solo lugar.',
  alternates: {
    canonical: `${brand.brand_domain}${brand.marketing_path}`,
  },
  openGraph: {
    title: 'Demo guiada: software para gimnasios y boxes',
    description: 'Agenda una demo de 30 minutos y activá reservas, cobros y reportes.',
    url: `${brand.brand_domain}${brand.marketing_path}`,
    type: 'website',
    images: [brand.og_image],
    locale: brand.lang,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demo guiada: software para gimnasios y boxes',
    description: 'Reservas, cobros y control de acceso funcionando en 24h.',
    images: [brand.og_image],
  },
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const problems = [
  'Cobrás por WhatsApp o efectivo y se te pierden vencimientos.',
  'No tenés visibilidad real de asistencia ni mora.',
  'Los turnos se superponen y la agenda manual te consume horas.',
  'El staff usa mil apps distintas y nada queda registrado.',
];

const benefits = [
  { title: 'Demo + setup en 24h', detail: 'Configuramos planes, horarios y medios de cobro en vivo.' },
  { title: 'Cobros automáticos', detail: 'Débitos, QR y links de pago conectados al estado de membresía.' },
  { title: 'Control de acceso', detail: 'Cada pase valida membresía, sedes y horarios en tiempo real.' },
  { title: 'Reportes accionables', detail: 'Métricas de retención, ingresos y capacidad por box.' },
  { title: 'Experiencia atleta', detail: 'Turnero limpio, recordatorios y waitlist para no perder cupos.' },
];

const faqs = [
  { q: '¿Cómo es la demo?', a: '30 minutos por videollamada. Cargamos tus planes y dejamos una agenda publicada.' },
  { q: '¿Pueden migrar mis socios actuales?', a: 'Sí, importamos desde Excel/Sheets y limpiamos duplicados durante la demo.' },
  { q: '¿Con qué medios de pago funciona?', a: 'MercadoPago, débito automático y POS. Podés mezclar efectivo con pagos online.' },
  { q: '¿Hay contrato mínimo?', a: 'No. Mes a mes. Si no mejora tu cobranza en el primer mes, cancelás sin costo.' },
];

const testimonials = [
  { name: 'Box Titan (CABA)', quote: 'Duplicamos reservas y bajamos la mora al 5% en tres semanas.', metric: '30% más renovaciones' },
  { name: 'Central Club (Córdoba)', quote: 'Los cobros automáticos sacaron a la gente del WhatsApp y ordenaron al staff.', metric: '70% de cobros sin intervención' },
];

const logos = ['Arena Box', 'Distrito Cross', 'Fuerza Norte', 'Move Club', 'Trenque Fit'];

const plans = [
  {
    name: 'Lanzamiento',
    price: '14 días sin costo',
    description: 'Demo guiada, migración y turnero publicado para validar rápido.',
    cta: 'Agendar demo',
    link: brand.demo_booking_url,
    perks: ['Migración desde Excel', 'Onboarding asistido', 'Primer campaña de recordatorios'],
  },
  {
    name: 'Pro',
    price: 'USD 79 / mes',
    description: 'Para gimnasios con más de 150 socios y equipos distribuidos.',
    cta: 'Hablar con ventas',
    link: brand.demo_booking_url,
    perks: ['Soporte prioritario', 'Multisede y roles avanzados', 'Integraciones de pagos y acceso'],
    highlight: true,
  },
];

export default function Page() {
  const jsonLd = [
    organizationSchema(),
    softwareAppSchema(),
    faqSchema(faqs),
    videoSchema({
      url: brand.demo_video_url,
      name: `Demo de ${brand.brand_name} en 4 minutos`,
      description: 'Recorrido express por reservas, cobros, turnos y reportes.',
    }),
  ];

  return (
    <>
      {jsonLd.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <Header />

      <main>
        <Box
          component="section"
          aria-labelledby="hero-title"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            py: { xs: 8, md: 12 },
            borderBottom: '1px solid #1f2a37',
            background: 'radial-gradient(circle at 20% 20%, rgba(34,197,94,0.12), transparent 35%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.14), transparent 25%), #0E1117',
          }}
        >
          <Container
            maxWidth="lg"
            sx={{ display: 'grid', gridTemplateColumns: { md: '1.05fr 0.95fr' }, gap: { xs: 6, md: 10 }, alignItems: 'center' }}
          >
            <Box sx={{ color: '#E2E8F0' }}>
              <Chip label="Demo guiada en 24h" color="secondary" sx={{ mb: 2 }} />
              <Typography id="hero-title" component="h1" variant="h2" sx={{ fontWeight: 800, letterSpacing: -1, mb: 2 }}>
                La landing que agenda demos para tu software de gimnasios
              </Typography>
              <Typography component="p" variant="h6" sx={{ color: '#CBD5E1', mb: 4, maxWidth: 640 }}>
                Mostrá cómo cobrás, controlás acceso y llenás cupos en minutos. Todo listo para mandar el video por WhatsApp y cerrar demos.
              </Typography>
              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                <Button href={brand.demo_booking_url} variant="contained" size="large" color="primary">
                  Agendar demo guiada
                </Button>
                <Button href="#demo" variant="outlined" size="large" color="secondary" startIcon={<PlayCircleOutlineIcon />}>
                  Ver video 4 min
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
                {['Reservas + Cobros', 'Control de acceso', 'Recordatorios automáticos', 'Reportes listos para vender'].map((k) => (
                  <Chip key={k} label={k} variant="outlined" color="primary" sx={{ borderColor: '#1f2a37', background: 'rgba(255,255,255,0.02)' }} />
                ))}
              </Stack>
              <Grid container spacing={2} sx={{ mt: 4 }}>
                {[
                  { label: 'Gimnasios y boxes', value: '200+' },
                  { label: 'Tiempo de puesta en marcha', value: '< 24h' },
                  { label: 'Cobranza automática', value: '70% promedio' },
                ].map((item) => (
                  <Grid key={item.label} item xs={12} sm={4}>
                    <Box sx={{ p: 2, border: '1px solid #1f2a37', borderRadius: 2, background: 'rgba(255,255,255,0.02)' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{item.value}</Typography>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Card
              elevation={0}
              sx={{
                border: '1px solid #1f2a37',
                background: 'linear-gradient(180deg, rgba(15,118,110,0.16), rgba(15,118,110,0.03))',
                color: '#E2E8F0',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <BoltIcon color="secondary" />
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Checklist demo</Typography>
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                  Salí de la demo con cobros y turnero andando
                </Typography>
                <Stack spacing={1.5} sx={{ color: '#CBD5E1' }}>
                  {['Cargamos planes y precios', 'Publicamos horarios y cupos', 'Activamos cobros y recordatorios', 'Dejamos métricas básicas listas'].map((step) => (
                    <Stack key={step} direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon fontSize="small" color="secondary" />
                      <Typography variant="body2">{step}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Box sx={{ mt: 3 }}>
                  <Image
                    src="/og-cover.jpg"
                    alt="Panel de reservas y cobros de GymHero"
                    width={960}
                    height={520}
                    priority
                    sizes="(max-width: 768px) 100vw, 480px"
                    style={{ width: '100%', height: 'auto', borderRadius: 12, border: '1px solid #1f2a37' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>

        <Box id="problema" component="section" aria-labelledby="problema-title" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#0B0F14' }}>
          <Container maxWidth="lg">
            <Typography id="problema-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              Problemas que frenan tus demos
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, maxWidth: 720 }}>
              En cada llamada escuchamos lo mismo. Ordenamos estos dolores y los mostramos en la landing para que el visitante sienta que le hablás a él.
            </Typography>
            <Grid container spacing={2}>
              {problems.map((item) => (
                <Grid key={item} item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #1f2a37',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#E2E8F0',
                      height: '100%',
                    }}
                  >
                    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Chip label="Dolor" color="secondary" size="small" sx={{ minWidth: 70 }} />
                      <Typography variant="body1" sx={{ color: '#CBD5E1' }}>{item}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box
          id="solucion"
          component="section"
          aria-labelledby="solucion-title"
          sx={{
            py: { xs: 8, md: 10 },
            background: 'linear-gradient(180deg, rgba(31,41,55,0.8), #0E1117)',
            borderTop: '1px solid #1f2a37',
            borderBottom: '1px solid #1f2a37',
          }}
        >
          <Container maxWidth="lg">
            <Typography id="solucion-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              Cómo lo resolvemos en la demo
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 5, maxWidth: 760 }}>
              Mostramos el antes y después: reservas, pagos y acceso en un mismo flujo. Sin promesas vacías, solo pantalla compartida y resultados visibles.
            </Typography>
            <Grid container spacing={2.5}>
              {benefits.map((item) => (
                <Grid key={item.title} item xs={12} sm={6} md={4}>
                  <Card
                    component="article"
                    elevation={0}
                    sx={{ border: '1px solid #1f2a37', background: 'rgba(255,255,255,0.03)', color: '#E2E8F0', height: '100%' }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{item.detail}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 5 }}>
              <Button href={brand.demo_booking_url} variant="contained" size="large" color="primary">Agendar demo</Button>
              <Button href="/login" variant="outlined" size="large" color="secondary">Ver app funcionando</Button>
            </Stack>
          </Container>
        </Box>

        <Box id="demo" component="section" aria-labelledby="demo-title" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#0B0F14' }}>
          <Container maxWidth="lg">
            <Typography id="demo-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              Video Loom de 4 minutos
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, maxWidth: 780 }}>
              El mismo que mandamos por WhatsApp antes de cada reunión. Recorremos turnos, cobros, control de acceso y reportes clave para dueños y entrenadores.
            </Typography>
            <Card
              elevation={0}
              sx={{
                border: '1px solid #1f2a37',
                borderRadius: 3,
                overflow: 'hidden',
                background: '#0E1117',
              }}
            >
              <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                <Box
                  component="iframe"
                  src={brand.demo_video_url}
                  title="Demo en video de GymHero"
                  allow="autoplay; fullscreen; picture-in-picture"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                />
              </Box>
            </Card>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button href={brand.demo_booking_url} variant="contained" color="primary" startIcon={<PlayCircleOutlineIcon />}>
                Agenda tu demo guiada
              </Button>
              <Button href="/login" variant="outlined" color="secondary">
                Ir a la app (solo clientes)
              </Button>
            </Stack>
          </Container>
        </Box>

        <Box id="testimonios" component="section" aria-labelledby="testimonios-title" sx={{ py: { xs: 8, md: 10 }, background: '#0E1117' }}>
          <Container maxWidth="lg">
            <Typography id="testimonios-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              Testimonios y logos
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
              Lo que pasa después de la demo: cobranzas ordenadas, turnos llenos y menos mensajes al staff.
            </Typography>
            <Grid container spacing={2.5}>
              {testimonials.map((item) => (
                <Grid key={item.name} item xs={12} md={6}>
                  <Card
                    component="figure"
                    elevation={0}
                    sx={{
                      border: '1px solid #1f2a37',
                      background: 'rgba(15,118,110,0.08)',
                      color: '#E2E8F0',
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: '#A5B4FC', letterSpacing: 0.5 }}>{item.metric}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{item.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>“{item.quote}”</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 4, borderColor: '#1f2a37' }} />
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              {logos.map((logo) => (
                <Chip key={logo} label={logo} color="primary" variant="outlined" sx={{ borderColor: '#1f2a37', background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </Stack>
          </Container>
        </Box>

        <Box id="planes" component="section" aria-labelledby="planes-title" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#0B0F14' }}>
          <Container maxWidth="lg">
            <Typography id="planes-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              Planes y oferta
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, maxWidth: 760 }}>
              El objetivo es que vendas más membresías. Empezá sin costo y escalá cuando la cobranza ya esté automática.
            </Typography>
            <Grid container spacing={2.5}>
              {plans.map((plan) => (
                <Grid key={plan.name} item xs={12} md={6}>
                  <Card
                    component="article"
                    elevation={0}
                    sx={{
                      border: `1px solid ${plan.highlight ? '#F59E0B' : '#1f2a37'}`,
                      background: plan.highlight ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
                      color: '#E2E8F0',
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{plan.name}</Typography>
                        {plan.highlight && <Chip label="Recomendado" color="secondary" size="small" />}
                      </Stack>
                      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{plan.price}</Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 2 }}>{plan.description}</Typography>
                      <Stack spacing={1.2} sx={{ mb: 2 }}>
                        {plan.perks.map((perk) => (
                          <Stack key={perk} direction="row" spacing={1} alignItems="center">
                            <CheckCircleIcon fontSize="small" color="secondary" />
                            <Typography variant="body2" sx={{ color: '#E2E8F0' }}>{perk}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Button href={plan.link} variant={plan.highlight ? 'contained' : 'outlined'} color="primary" fullWidth>
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box id="faqs" component="section" aria-labelledby="faqs-title" sx={{ py: { xs: 8, md: 10 }, background: '#0E1117' }}>
          <Container maxWidth="lg">
            <Typography id="faqs-title" component="h2" variant="h3" sx={{ fontWeight: 800, color: '#E2E8F0', mb: 2 }}>
              FAQ breve
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
              Lo esencial que respondemos en cada llamada antes de mostrar el panel.
            </Typography>
            <Grid container spacing={2}>
              {faqs.map((item) => (
                <Grid key={item.q} item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid #1f2a37', background: 'rgba(255,255,255,0.02)', color: '#E2E8F0', height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>{item.q}</Typography>
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{item.a}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button href={brand.demo_booking_url} variant="contained" color="primary">Agendar demo ahora</Button>
              <Button href="/login" variant="outlined" color="secondary">Ingresar como cliente</Button>
            </Stack>
          </Container>
        </Box>

        <Box component="section" aria-labelledby="cta-title" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#0B0F14', borderTop: '1px solid #1f2a37' }}>
          <Container maxWidth="lg" sx={{ textAlign: 'center', color: '#E2E8F0' }}>
            <Typography id="cta-title" component="h2" variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Mandá el video, agenda la demo y cerrá membresías
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', mb: 3, maxWidth: 640, mx: 'auto' }}>
              Te dejamos la landing lista para rankear y vender. El siguiente paso es tu demo guiada.
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'center' }}>
              <Button href={brand.demo_booking_url} variant="contained" size="large" color="primary">Agendar demo</Button>
              <Button href="#demo" variant="outlined" size="large" color="secondary">Ver video ahora</Button>
            </Stack>
          </Container>
        </Box>
      </main>

      <Footer />
    </>
  );
}

