'use client';
import { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { faqs } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

interface ItemProps {
  q: string;
  a: string;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
}

function FaqItem({ q, a, index, total, open, onToggle }: ItemProps) {
  return (
    <Box
      className="faq-item"
      sx={{
        borderTop: `1.5px solid ${palette.ink}`,
        ...(index === total - 1 && { borderBottom: `1.5px solid ${palette.ink}` }),
      }}
    >
      <Box
        component="button"
        onClick={onToggle}
        aria-expanded={open}
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '40px 1fr 32px', md: '60px 1fr 40px' },
          gap: { xs: 2, md: 2.5 },
          alignItems: 'center',
          py: { xs: 2.5, md: 3 },
          px: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: palette.ink,
          transition: 'color 180ms',
          '&:hover': { color: palette.coral },
          '&:focus-visible': {
            outline: `2px solid ${palette.forest}`,
            outlineOffset: 4,
            borderRadius: 4,
          },
        }}
      >
        <Box
          sx={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.14em',
            color: palette.inkSoft,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </Box>
        <Box
          sx={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontVariationSettings: '"opsz" 144',
            fontSize: { xs: '1.15rem', md: '1.5rem' },
            lineHeight: 1.25,
            letterSpacing: '-0.015em',
            color: 'inherit',
          }}
        >
          {q}
        </Box>
        <Box
          aria-hidden
          sx={{
            justifySelf: 'end',
            width: { xs: 32, md: 40 },
            height: { xs: 32, md: 40 },
            borderRadius: '50%',
            border: `1.5px solid ${palette.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: open ? palette.coral : palette.paperSoft,
            color: open ? palette.paperSoft : palette.ink,
            transition: 'background 200ms ease, transform 200ms ease',
            transform: open ? 'rotate(45deg)' : 'rotate(0)',
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 16 16"
            sx={{ width: 14, height: 14 }}
          >
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 280ms ease',
        }}
      >
        <Box sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '40px 1fr 32px', md: '60px 1fr 40px' },
              gap: { xs: 2, md: 2.5 },
              pb: { xs: 3, md: 3.5 },
            }}
          >
            <Box />
            <Typography
              sx={{
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                color: palette.inkSoft,
                lineHeight: 1.65,
                maxWidth: 720,
              }}
            >
              {a}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Box id="faq" component="section" sx={{ py: { xs: 9, md: 14 }, bgcolor: palette.paperDeep }}>
      <Container maxWidth="md">
        <AnimatedSection>
          <SectionLabel number="07" label="Preguntas" />
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2.2rem', md: '3.4rem' },
              fontVariationSettings: '"opsz" 144',
              color: palette.ink,
              mb: { xs: 5, md: 7 },
            }}
          >
            Lo que todos preguntan{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.forest }}>
              antes de empezar.
            </Box>
          </Typography>
        </AnimatedSection>

        <AnimatedSection>
          <Box>
            {faqs.map((faq, i) => (
              <FaqItem
                key={faq.q}
                index={i}
                total={faqs.length}
                q={faq.q}
                a={faq.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
              />
            ))}
          </Box>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
