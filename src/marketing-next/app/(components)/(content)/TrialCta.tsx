'use client';
import { Box, Button, Typography } from '@mui/material';
import { useSignupModal } from '../(sections)/SignupModal';
import { palette } from '@/app/(lib)/theme';

interface Props {
  label?: string;
  microcopy?: string;
  align?: 'left' | 'center';
  secondaryHref?: string;
  secondaryLabel?: string;
}

/** CTA de prueba gratis: abre el mismo SignupModal que usa la home. */
export default function TrialCta({
  label = 'Empezar gratis',
  microcopy = 'Sin tarjeta · Sin permanencia · Listo en 15 minutos',
  align = 'left',
  secondaryHref,
  secondaryLabel,
}: Props) {
  const { open } = useSignupModal();
  const justify = align === 'center' ? 'center' : 'flex-start';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: justify,
        gap: 1.4,
        my: { xs: 3, md: 4 },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: justify }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => open()}
          sx={{ px: 4, py: 1.4, fontSize: '1rem' }}
        >
          {label}
          <Box component="span" sx={{ ml: 1 }} aria-hidden>
            →
          </Box>
        </Button>
        {secondaryHref && secondaryLabel && (
          <Button variant="outlined" size="large" href={secondaryHref} sx={{ px: 3, py: 1.4, fontSize: '1rem' }}>
            {secondaryLabel}
          </Button>
        )}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.68rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: palette.inkSoft,
          textAlign: align,
        }}
      >
        {microcopy}
      </Typography>
    </Box>
  );
}
