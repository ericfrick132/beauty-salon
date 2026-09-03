'use client';
import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';
import { palette } from '@/app/(lib)/theme';

/**
 * Tipografía editorial para contenido largo (h2/h3/p/ul/table) con la
 * misma paleta y fuentes que la landing. Recibe HTML semántico como children.
 */
export default function Prose({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Box
        sx={{
          color: palette.ink,
          fontSize: { xs: '1.02rem', md: '1.08rem' },
          lineHeight: 1.7,
          '& h2': {
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 500,
            fontVariationSettings: '"opsz" 144',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            fontSize: { xs: '1.75rem', md: '2.2rem' },
            color: palette.ink,
            mt: { xs: 5.5, md: 7 },
            mb: 2,
          },
          '& section:first-of-type h2': { mt: 0 },
          '& h3': {
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            fontSize: { xs: '1.3rem', md: '1.5rem' },
            color: palette.ink,
            mt: 4,
            mb: 1.5,
          },
          '& p': { my: 2, color: palette.inkSoft },
          '& ul, & ol': { my: 2, pl: 3, color: palette.inkSoft },
          '& li': { mb: 0.8, pl: 0.4 },
          '& li::marker': { color: palette.coral, fontWeight: 600 },
          '& strong': { color: palette.ink, fontWeight: 600 },
          '& a': {
            color: palette.forest,
            fontWeight: 500,
            textDecorationColor: 'rgba(30,94,63,0.45)',
            textUnderlineOffset: '3px',
            transition: 'color 160ms',
            '&:hover': { color: palette.coral },
          },
          '& .tp-table': {
            overflowX: 'auto',
            my: 3,
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 2,
            bgcolor: palette.paperSoft,
          },
          '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 600 },
          '& th': {
            textAlign: 'left',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: palette.ink,
            p: 1.5,
            borderBottom: `1.5px solid ${palette.ink}`,
            bgcolor: palette.paperDeep,
          },
          '& td': {
            p: 1.5,
            borderBottom: '1px solid rgba(23,20,16,0.14)',
            verticalAlign: 'top',
            color: palette.inkSoft,
          },
          '& tr:last-of-type td': { borderBottom: 'none' },
          '& blockquote': {
            borderLeft: `3px solid ${palette.amber}`,
            pl: 2.5,
            ml: 0,
            my: 3,
            fontStyle: 'italic',
            color: palette.ink,
          },
          '& .tp-callout': {
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 2,
            bgcolor: palette.paperSoft,
            boxShadow: `4px 4px 0 ${palette.ink}`,
            p: { xs: 2.5, md: 3 },
            my: 4,
          },
          '& .tp-callout p': { my: 1 },
          '& .tp-meta': {
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.68rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: palette.inkMute,
            mb: 3,
          },
        }}
      >
        {children}
      </Box>
    </Container>
  );
}
