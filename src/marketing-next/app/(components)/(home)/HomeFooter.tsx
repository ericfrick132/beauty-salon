'use client';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { brand } from '@/app/(lib)/brand';
import { verticalLinks, featureLinks, blogLinks } from '@/app/(lib)/vertical-links';
import IntegrationsStrip from '../IntegrationsStrip';
import { BrandMark, Wrap, home, sans } from './ui';

const APP_STORE_URL = 'https://apps.apple.com/app/id6775843253';

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: sans, fontSize: '0.82rem', fontWeight: 600, color: 'rgba(244,239,230,0.5)', mb: 1.75 }}>{title}</Typography>
      <Box component="nav" aria-label={title} sx={{ display: 'grid', gap: 1.1 }}>
        {children}
      </Box>
    </Box>
  );
}

const linkSx = { fontFamily: sans, fontSize: '0.92rem', color: 'rgba(244,239,230,0.8)', textDecoration: 'none', '&:hover': { color: home.paper } } as const;

/** Footer de la home: los mismos links (rubros, guías, demos, legales) + wordmark grande. */
export default function HomeFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: home.ink, color: home.paper, pt: { xs: 7, md: 10 }, pb: 3, overflow: 'hidden' }}>
      <Wrap>
        <Box sx={{ mb: { xs: 5, md: 7 } }}>
          <IntegrationsStrip />
        </Box>
        <Box sx={{ display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1fr 1fr 1fr' } }}>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <BrandMark size={32} inverted />
            </Box>
            <Typography sx={{ fontFamily: sans, fontSize: '0.95rem', color: 'rgba(244,239,230,0.65)', lineHeight: 1.6, maxWidth: 320 }}>
              Reservas online, señas con Mercado Pago y recordatorios por WhatsApp para negocios que trabajan con turnos.
            </Typography>
            <Box component="a" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Descargar TurnosPro en el App Store" sx={{ display: 'inline-block', mt: 2.5, lineHeight: 0 }}>
              <Box component="img" src="/landing/assets/img/app-store-badge.svg" alt="Consíguelo en el App Store" sx={{ height: 44, width: 'auto' }} />
            </Box>
          </Box>

          <Col title="Rubros y funciones">
            {verticalLinks.map((v) => (
              <Box key={v.path} component={Link} href={v.path} sx={linkSx}>
                Turnos para {v.label.toLowerCase()}
              </Box>
            ))}
            {featureLinks.map((f) => (
              <Box key={f.path} component={Link} href={f.path} sx={linkSx}>
                {f.label}
              </Box>
            ))}
          </Col>

          <Col title="Recursos">
            {blogLinks.map((b) => (
              <Box key={b.path} component="a" href={b.path} sx={linkSx}>
                {b.label}
              </Box>
            ))}
            <Box component="a" href="/blog/" sx={linkSx}>Blog</Box>
            <Box component={Link} href="/ayuda" sx={linkSx}>Centro de ayuda</Box>
            <Box component={Link} href="/demo-admin" sx={linkSx}>Demo del panel</Box>
            <Box component={Link} href="/demo-app" sx={linkSx}>Demo de reservas</Box>
            <Box component={Link} href="/uy" sx={linkSx}>Uruguay</Box>
            <Box component={Link} href="/mx" sx={linkSx}>México</Box>
            <Box component={Link} href="/es" sx={linkSx}>España</Box>
          </Col>

          <Col title="Contacto y legales">
            {brand.whatsapp_url && <Box component="a" href={brand.whatsapp_url} target="_blank" rel="noopener noreferrer" sx={linkSx}>WhatsApp</Box>}
            {brand.instagram_url && <Box component="a" href={brand.instagram_url} target="_blank" rel="noopener noreferrer" sx={linkSx}>Instagram</Box>}
            <Box component="a" href={`mailto:${brand.support_email}`} sx={linkSx}>{brand.support_email}</Box>
            <Box component={Link} href="/terminos" sx={linkSx}>Términos y condiciones</Box>
            <Box component={Link} href="/privacidad" sx={linkSx}>Política de privacidad</Box>
          </Col>
        </Box>

        {/* Wordmark grande (estilo Ascend). */}
        <Box
          aria-hidden
          sx={{
            mt: { xs: 6, md: 9 },
            fontFamily: sans,
            fontWeight: 650,
            letterSpacing: '-0.06em',
            lineHeight: 0.8,
            fontSize: { xs: '19vw', md: 'min(17vw, 220px)' },
            color: home.paper,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          Turnos<Box component="span" sx={{ color: home.coral }}>Pro</Box>
        </Box>

        <Box sx={{ mt: 4, pt: 2.5, borderTop: '1px solid rgba(244,239,230,0.12)', display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', fontFamily: sans, fontSize: '0.8rem', color: 'rgba(244,239,230,0.5)' }}>
          <span>© {new Date().getFullYear()} TurnosPro · Hecho en Buenos Aires</span>
          <span>Gratis para empezar. Sin tarjeta.</span>
        </Box>
      </Wrap>
    </Box>
  );
}
