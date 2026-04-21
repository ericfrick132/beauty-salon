'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { agendaContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

const SLOTS = [
  // Mon
  [{ time: '09:00', client: 'Luca M.', status: 'confirmed' }, { time: '11:30', client: 'Vero R.', status: 'pending' }],
  // Tue
  [{ time: '10:00', client: 'Sofi P.', status: 'confirmed' }, { time: '14:00', client: 'Bloqueo', status: 'block' }],
  // Wed
  [{ time: '12:00', client: 'Caro G.', status: 'confirmed' }, { time: '15:30', client: 'Mati F.', status: 'whatsapp' }],
  // Thu
  [{ time: '09:30', client: 'Lara T.', status: 'confirmed' }, { time: '13:00', client: 'Disponible', status: 'open' }],
  // Fri (active day)
  [{ time: '10:30', client: 'Naty O.', status: 'confirmed' }, { time: '16:30', client: 'Sofí P.', status: 'confirmed' }, { time: '18:00', client: 'Joaco V.', status: 'pending' }],
  // Sat
  [{ time: '11:00', client: 'Bel R.', status: 'confirmed' }, { time: '14:30', client: 'Disponible', status: 'open' }],
  // Sun
  [{ time: '—', client: 'Cerrado', status: 'block' }],
] as const;

const statusColor = {
  confirmed: { bg: palette.forest, fg: palette.paperSoft },
  pending: { bg: palette.amber, fg: palette.ink },
  whatsapp: { bg: palette.coral, fg: palette.paperSoft },
  open: { bg: 'transparent', fg: palette.inkSoft },
  block: { bg: palette.paperDeep, fg: palette.inkSoft },
} as const;

const days = ['LUN 10', 'MAR 11', 'MIÉ 12', 'JUE 13', 'VIE 14', 'SÁB 15', 'DOM 16'];

function CalendarMock() {
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: palette.paperSoft,
        border: `1.5px solid ${palette.ink}`,
        borderRadius: 2,
        boxShadow: `8px 8px 0 ${palette.ink}`,
        overflow: 'hidden',
      }}
    >
      {/* Calendar header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2.5,
          py: 1.8,
          borderBottom: `1.5px solid ${palette.ink}`,
          bgcolor: palette.paper,
        }}
      >
        <Box
          sx={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 600,
            fontSize: '1rem',
            color: palette.ink,
          }}
        >
          Marzo 2026
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 0.4,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: palette.inkSoft,
          }}
        >
          <Box sx={{ px: 1.2, py: 0.4, border: `1px solid ${palette.ink}`, borderRadius: 999, color: palette.ink, fontWeight: 600 }}>Sem</Box>
          <Box sx={{ px: 1.2, py: 0.4, opacity: 0.5 }}>Mes</Box>
        </Box>
      </Box>

      {/* Day headers */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: `1.5px solid ${palette.ink}`,
        }}
      >
        {days.map((d, i) => (
          <Box
            key={d}
            sx={{
              py: 1.2,
              textAlign: 'center',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: i === 4 ? palette.ink : palette.inkSoft,
              fontWeight: i === 4 ? 600 : 400,
              borderRight: i < 6 ? `1px solid rgba(23,20,16,0.18)` : 'none',
              bgcolor: i === 4 ? palette.amber : 'transparent',
            }}
          >
            {d}
          </Box>
        ))}
      </Box>

      {/* Grid body */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          minHeight: 280,
        }}
      >
        {SLOTS.map((daySlots, di) => (
          <Box
            key={di}
            sx={{
              borderRight: di < 6 ? `1px solid rgba(23,20,16,0.18)` : 'none',
              p: 0.7,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.6,
              bgcolor: di === 4 ? 'rgba(244,192,56,0.07)' : 'transparent',
            }}
          >
            {daySlots.map((slot, si) => {
              const c = statusColor[slot.status as keyof typeof statusColor];
              const isOpen = slot.status === 'open';
              return (
                <Box
                  key={si}
                  sx={{
                    px: 0.7,
                    py: 0.7,
                    borderRadius: 1,
                    border: `1px solid ${isOpen ? 'rgba(23,20,16,0.3)' : palette.ink}`,
                    borderStyle: isOpen ? 'dashed' : 'solid',
                    bgcolor: c.bg,
                    color: c.fg,
                    minHeight: 42,
                    position: 'relative',
                    transition: 'transform 0.18s',
                    '&:hover': { transform: 'translate(-1px,-1px)' },
                  }}
                >
                  <Box
                    sx={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: '0.62rem',
                      letterSpacing: '0.05em',
                      lineHeight: 1.1,
                      opacity: 0.9,
                    }}
                  >
                    {slot.time}
                  </Box>
                  <Box
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      lineHeight: 1.2,
                      mt: 0.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {slot.client}
                  </Box>
                  {slot.status === 'whatsapp' && (
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: palette.amber,
                        border: `1.5px solid ${palette.ink}`,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.8,
          px: 2,
          py: 1.5,
          borderTop: `1.5px dashed ${palette.ink}`,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: palette.inkSoft,
        }}
      >
        {[
          { c: palette.forest, l: 'Confirmado' },
          { c: palette.amber, l: 'Esperando seña' },
          { c: palette.coral, l: 'WhatsApp enviado' },
        ].map((x) => (
          <Box key={x.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <Box sx={{ width: 9, height: 9, bgcolor: x.c, border: `1px solid ${palette.ink}`, borderRadius: '2px' }} />
            {x.l}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function AgendaSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="03" label="Agenda" />
        </AnimatedSection>

        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid item xs={12} md={5}>
            <AnimatedSection direction="left">
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '2.8rem', lg: '3.2rem' },
                  fontVariationSettings: '"opsz" 144',
                  color: palette.ink,
                  mb: 3,
                }}
              >
                Tu agenda online,{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>
                  siempre en orden.
                </Box>
              </Typography>

              <Box
                component="ul"
                sx={{
                  m: 0,
                  p: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                }}
              >
                {agendaContent.bullets.map((bullet, i) => (
                  <Box
                    key={bullet}
                    component="li"
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      py: 2,
                      borderTop: `1.5px solid ${palette.ink}`,
                      ...(i === agendaContent.bullets.length - 1 && {
                        borderBottom: `1.5px solid ${palette.ink}`,
                      }),
                    }}
                  >
                    <Box
                      sx={{
                        flexShrink: 0,
                        mt: 0.5,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        color: palette.inkSoft,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </Box>
                    <Box
                      sx={{
                        fontSize: '1rem',
                        color: palette.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      {bullet}
                    </Box>
                  </Box>
                ))}
              </Box>
            </AnimatedSection>
          </Grid>
          <Grid item xs={12} md={7}>
            <AnimatedSection direction="right">
              <CalendarMock />
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
