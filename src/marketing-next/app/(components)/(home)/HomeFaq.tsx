'use client';
import { Box, Typography } from '@mui/material';
import { faqs, pricingContent } from '@/app/(lib)/content';
import { Accent, Section, SectionHead, Wrap, home, sans } from './ui';

// Mismas preguntas que el JSON-LD FAQPage de app/page.tsx (generales + las de precios).
const items = [...faqs, ...pricingContent.comparison.faqs];

export default function HomeFaq() {
  return (
    <Section id="faq">
      <Wrap max={820}>
        <SectionHead title={<>¿Dudas? <Accent>Respuestas cortas.</Accent></>} line="Y si no está acá, escribinos por WhatsApp." />
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {items.map((f, i) => (
            <Box
              key={f.q}
              component="details"
              className="faq-item"
              open={i === 0}
              sx={{
                borderRadius: home.radiusSm,
                bgcolor: home.card,
                border: `1px solid ${home.line}`,
                '& summary::-webkit-details-marker': { display: 'none' },
                '&[open] .faq-plus': { transform: 'rotate(45deg)' },
              }}
            >
              <Box component="summary" sx={{ listStyle: 'none', cursor: 'pointer', px: { xs: 2.5, sm: 3 }, py: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography component="h3" sx={{ fontFamily: sans, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.06rem' }, letterSpacing: '-0.015em', color: home.ink, lineHeight: 1.35 }}>
                  {f.q}
                </Typography>
                <Box component="span" aria-hidden className="faq-plus" sx={{ flex: '0 0 auto', fontSize: '1.3rem', color: home.inkSoft, transition: 'transform 160ms', lineHeight: 1 }}>
                  +
                </Box>
              </Box>
              <Typography sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, fontFamily: sans, fontSize: '0.98rem', color: home.inkSoft, lineHeight: 1.6 }}>{f.a}</Typography>
            </Box>
          ))}
        </Box>
      </Wrap>
    </Section>
  );
}
