'use client';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { palette } from '@/app/(lib)/theme';

/**
 * The hero artifact. A paper-card mock of a booking flow:
 *   1) Mini calendar with a slot getting marked
 *   2) WhatsApp reminder bubble appearing
 *   3) MercadoPago "seña confirmada" chip
 * Animates sequentially on mount via Framer Motion.
 *
 * Uses transient framer-motion animations only (no layout shifts) so it
 * stays cheap on mobile. Rotated -2.5deg for editorial off-grid feel.
 */
export default function BookingTicket() {
  return (
    <Box
      sx={{
        position: 'relative',
        maxWidth: 420,
        mx: 'auto',
        // Stack layer hint for the floating notes
        zIndex: 1,
      }}
    >
      {/* Background "paper" sheet behind, slightly offset for depth */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          transform: 'rotate(2deg) translate(8px, 10px)',
          bgcolor: palette.amber,
          border: `1.5px solid ${palette.ink}`,
          borderRadius: 2,
          zIndex: -1,
        }}
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.7, ease: 'easeOut' as const }}
        style={{ transformOrigin: 'center' }}
      >
        <Box
          sx={{
            bgcolor: palette.paperSoft,
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 2,
            p: { xs: 2.5, sm: 3 },
            boxShadow: `6px 6px 0 ${palette.ink}`,
            position: 'relative',
          }}
        >
          {/* Ticket header — like a printed receipt */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pb: 1.5,
              mb: 2,
              borderBottom: `1.5px dashed ${palette.ink}`,
            }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: palette.ink,
              }}
            >
              Turno · #A284
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: palette.inkSoft,
              }}
            >
              VIE 14 MAR · 16:30
            </Box>
          </Box>

          {/* Mini week calendar */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
              mb: 2.5,
            }}
          >
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <Box
                key={i}
                sx={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.62rem',
                  color: palette.inkSoft,
                  letterSpacing: '0.08em',
                  mb: 0.5,
                }}
              >
                {d}
              </Box>
            ))}
            {[10, 11, 12, 13, 14, 15, 16].map((day) => (
              <Box
                key={day}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  border: `1px solid ${day === 14 ? palette.ink : 'rgba(23,20,16,0.18)'}`,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: day === 14 ? palette.forest : 'transparent',
                  color: day === 14 ? palette.paperSoft : palette.ink,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.7rem',
                  fontWeight: day === 14 ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {day}
                {day === 14 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -3,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: palette.coral,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>

          {/* Booking row */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                border: `1.5px solid ${palette.ink}`,
                borderRadius: 1.5,
                bgcolor: palette.paper,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: palette.rose,
                  border: `1.5px solid ${palette.ink}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: palette.ink,
                  flexShrink: 0,
                }}
              >
                S
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: palette.ink,
                    lineHeight: 1.2,
                  }}
                >
                  Sofía Pérez
                </Box>
                <Box
                  sx={{
                    fontSize: '0.78rem',
                    color: palette.inkSoft,
                    lineHeight: 1.3,
                    mt: 0.3,
                  }}
                >
                  Coloración + corte
                </Box>
              </Box>
              <Box
                sx={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: palette.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                $ 18.000
              </Box>
            </Box>
          </Box>

          {/* Status chip — MercadoPago señado */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.4,
                py: 0.7,
                borderRadius: 999,
                bgcolor: palette.forest,
                color: palette.paperSoft,
                border: `1.5px solid ${palette.ink}`,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              <Box
                component="svg"
                viewBox="0 0 16 16"
                sx={{ width: 12, height: 12 }}
                aria-hidden
              >
                <path
                  d="M3 8.5l3 3 7-7.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Box>
              Seña $5.400 · Mercado Pago
            </Box>
          </motion.div>
        </Box>
      </motion.div>

      {/* WhatsApp note — floating sticker */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 1.05, ease: 'easeOut' as const }}
        style={{
          position: 'absolute',
          right: -18,
          bottom: -34,
          zIndex: 2,
          transformOrigin: 'bottom right',
        }}
      >
        <Box
          sx={{
            transform: 'rotate(4deg)',
            bgcolor: palette.ink,
            color: palette.paperSoft,
            border: `1.5px solid ${palette.ink}`,
            borderRadius: '14px 14px 14px 4px',
            px: 1.6,
            py: 1.2,
            maxWidth: 220,
            boxShadow: `4px 4px 0 ${palette.coral}`,
            fontSize: '0.8rem',
            lineHeight: 1.35,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              mb: 0.4,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: palette.amber,
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 16 16"
              sx={{ width: 11, height: 11 }}
              aria-hidden
            >
              <path
                d="M11.7 9.3c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-1.2-.6-1.9-1-2.7-2.4-.2-.4.2-.3.6-1.1.1-.1 0-.3 0-.4 0-.1-.5-1.2-.6-1.6-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.2 3.4 3 .5.2.9.3 1.2.4.5.2.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.8.1-.9z"
                fill="currentColor"
              />
            </Box>
            WhatsApp · ahora
          </Box>
          ¡Hola Sofi! Te recordamos tu turno mañana a las 16:30
        </Box>
      </motion.div>

      {/* Decorative star */}
      <Box
        component="svg"
        aria-hidden
        viewBox="0 0 24 24"
        sx={{
          position: 'absolute',
          top: -18,
          left: -18,
          width: 36,
          height: 36,
          color: palette.coral,
          transform: 'rotate(-12deg)',
        }}
      >
        <path
          d="M12 1l2.5 7.5L22 12l-7.5 3.5L12 23l-2.5-7.5L2 12l7.5-3.5L12 1z"
          fill="currentColor"
        />
      </Box>
    </Box>
  );
}
