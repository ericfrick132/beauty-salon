'use client';
import Link from 'next/link';
import { Box, Container, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { palette } from '@/app/(lib)/theme';

const demos = [
  {
    href: '/demo-admin',
    tag: 'Tu panel',
    title: 'Entrá al panel y tocá todo',
    text: 'Agenda de turnos, el bot que confirma por WhatsApp, el agente IA que reserva solo, señas y reportes. Con datos de ejemplo, sin registrarte.',
  },
  {
    href: '/demo-app',
    tag: 'Lo que ve tu cliente',
    title: 'Reservá como si fueras tu cliente',
    text: 'Servicio, profesional, horario y seña con MercadoPago desde el celular. Y después, el WhatsApp para confirmar.',
  },
];

// Accesos a las demos interactivas (/demo-admin y /demo-app).
export default function DemoCards() {
  return (
    <Box id="demo" component="section" sx={{ py: { xs: 8, md: 11 }, borderTop: `1.5px solid ${palette.ink}` }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="04b" label="Demo interactiva" />
          <Typography variant="h2" sx={{ fontSize: { xs: '2.1rem', md: '3.2rem' }, color: palette.ink, mb: { xs: 4, md: 5 }, maxWidth: 760 }}>
            Probalo por dentro{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>antes de registrarte.</Box>
          </Typography>
        </AnimatedSection>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          {demos.map((d, i) => (
            <AnimatedSection key={d.href} delay={i * 0.08}>
              <Box
                component={Link}
                href={d.href}
                sx={{
                  display: 'flex', flexDirection: 'column', gap: 1.2, height: '100%', p: { xs: 3, md: 4 }, textDecoration: 'none', color: palette.ink,
                  bgcolor: palette.paperSoft, border: `1.5px solid ${palette.ink}`, borderRadius: 2, boxShadow: `4px 4px 0 ${palette.ink}`,
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translate(-2px,-2px)', boxShadow: `6px 6px 0 ${palette.coral}` },
                }}
              >
                <Box sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.coral }}>
                  Demo · {d.tag}
                </Box>
                <Typography sx={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: { xs: '1.6rem', md: '1.9rem' }, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {d.title} →
                </Typography>
                <Typography sx={{ color: palette.inkSoft, lineHeight: 1.6 }}>{d.text}</Typography>
              </Box>
            </AnimatedSection>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
