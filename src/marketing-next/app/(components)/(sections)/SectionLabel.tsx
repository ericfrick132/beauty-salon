'use client';
import { Box } from '@mui/material';

interface Props {
  number: string;        // e.g. "01"
  label: string;         // e.g. "SOLUCIÓN"
  align?: 'left' | 'center';
}

/**
 * Editorial-style section eyebrow used across the landing.
 * Renders as: ─── Nº 01 · SOLUCIÓN
 */
export default function SectionLabel({ number, label, align = 'left' }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        mb: { xs: 3, md: 4 },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.5,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'text.primary',
        }}
      >
        <Box
          component="span"
          sx={{ display: 'inline-block', width: 36, height: '1.5px', bgcolor: 'text.primary' }}
        />
        <Box component="span" sx={{ fontWeight: 600 }}>Nº {number}</Box>
        <Box component="span" sx={{ opacity: 0.5 }}>·</Box>
        <Box component="span">{label}</Box>
      </Box>
    </Box>
  );
}
