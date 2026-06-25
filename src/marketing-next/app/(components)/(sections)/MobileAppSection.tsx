'use client';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { palette } from '@/app/(lib)/theme';

const APP_STORE_URL = 'https://apps.apple.com/us/app/turnospro/id6775843253';

function AppStoreBadge() {
  return (
    <Box
      component="a"
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Descargar TurnosPro en el App Store"
      sx={{ display: 'inline-block', lineHeight: 0, transition: 'transform 180ms', '&:hover': { transform: 'translateY(-2px)' } }}
    >
      {/* Official Apple "App Store" badge (es-MX, black) */}
      <Box
        component="img"
        src="/assets/app-store-badge.svg"
        alt="Consíguelo en el App Store"
        sx={{ height: { xs: 50, md: 56 }, width: 'auto', display: 'block' }}
      />
    </Box>
  );
}

export default function MobileAppSection() {
  return (
    <Box
      id="app-movil"
      component="section"
      sx={{
        bgcolor: palette.paperDeep,
        borderTop: `1.5px solid ${palette.ink}`,
        borderBottom: `1.5px solid ${palette.ink}`,
        py: { xs: 8, md: 12 },
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 6, md: 6 },
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            alignItems: 'center',
          }}
        >
          {/* LEFT — copy */}
          <Box>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: palette.coral,
                  '&::before': { content: '""', width: 24, height: '1.5px', bgcolor: palette.coral, display: 'inline-block' },
                }}
              >
                Nueva · App para iPhone
              </Box>

              <Typography
                component="h2"
                sx={{
                  mt: 2.5,
                  mb: 2.5,
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontVariationSettings: '"opsz" 144, "SOFT" 50',
                  fontSize: { xs: '2rem', sm: '2.6rem', md: '3.1rem' },
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                  color: palette.ink,
                }}
              >
                Tu negocio, también{' '}
                <Box component="span" sx={{ color: palette.coral, fontStyle: 'italic' }}>
                  en tu bolsillo
                </Box>
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: '1.05rem', md: '1.15rem' },
                  color: palette.inkSoft,
                  maxWidth: 440,
                  lineHeight: 1.6,
                  mb: 3.5,
                }}
              >
                Ya tenemos <Box component="span" sx={{ color: palette.ink, fontWeight: 600 }}>app para iPhone</Box>:
                gestioná tu agenda del día, confirmá turnos, mirá tus clientes y seguí tu caja
                desde el celular, estés donde estés. Descargala gratis en el App Store.
              </Typography>

              <AppStoreBadge />

              <Typography
                sx={{
                  mt: 2,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.72rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: palette.inkSoft,
                }}
              >
                Disponible para iPhone · Gratis
              </Typography>
            </motion.div>
          </Box>

          {/* RIGHT — phone screenshots */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: { xs: 1.5, md: 2.5 },
              minHeight: { xs: 360, md: 460 },
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Box
                component="img"
                src="/assets/app-turnospro-1.png"
                alt="App TurnosPro — agenda del día en iPhone"
                loading="lazy"
                sx={{
                  width: { xs: 150, sm: 190, md: 220 },
                  height: 'auto',
                  borderRadius: '26px',
                  border: `1.5px solid ${palette.ink}`,
                  boxShadow: '0 18px 50px rgba(23,20,16,0.22)',
                  transform: 'rotate(-4deg)',
                  bgcolor: palette.paper,
                }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            >
              <Box
                component="img"
                src="/assets/app-turnospro-2.png"
                alt="App TurnosPro — clientes en iPhone"
                loading="lazy"
                sx={{
                  width: { xs: 150, sm: 190, md: 220 },
                  height: 'auto',
                  borderRadius: '26px',
                  border: `1.5px solid ${palette.ink}`,
                  boxShadow: '0 18px 50px rgba(23,20,16,0.22)',
                  transform: 'rotate(4deg)',
                  mb: { xs: 2, md: 3 },
                  bgcolor: palette.paper,
                }}
              />
            </motion.div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
