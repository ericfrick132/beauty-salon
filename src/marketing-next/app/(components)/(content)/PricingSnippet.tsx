'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import Link from 'next/link';
import { pricingContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';
import TrialCta from './TrialCta';

interface Props {
  title: string;
  intro: string;
  number?: string;
}

const fmt = new Intl.NumberFormat('es-AR');

/** Resumen de precios (misma fuente que la home: pricingContent) con link a /#precios. */
export default function PricingSnippet({ title, intro, number = '03' }: Props) {
  return (
    <Box component="section" aria-labelledby="pricing-snippet" sx={{ py: { xs: 7, md: 10 }, bgcolor: palette.paperDeep, borderTop: `1.5px solid ${palette.ink}` }}>
      <Container maxWidth="md">
        <Box className="tp-rule" sx={{ mb: 3 }}>
          Nº {number} · Precios
        </Box>
        <Typography
          id="pricing-snippet"
          variant="h2"
          sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, fontVariationSettings: '"opsz" 144', color: palette.ink, mb: 2 }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: palette.inkSoft, fontSize: '1.05rem', lineHeight: 1.65, mb: 4, maxWidth: 720 }}>{intro}</Typography>

        <Grid container spacing={2}>
          {pricingContent.plans.map((plan) => (
            <Grid item xs={6} md={3} key={plan.code}>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 2, md: 2.5 },
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 2,
                  bgcolor: plan.highlighted ? palette.ink : palette.paperSoft,
                  color: plan.highlighted ? palette.paper : palette.ink,
                  boxShadow: `3px 3px 0 ${palette.ink}`,
                }}
              >
                <Box
                  sx={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.64rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: plan.highlighted ? palette.amber : palette.inkMute,
                    mb: 1,
                  }}
                >
                  {plan.commitment}
                </Box>
                <Box sx={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 600, fontSize: { xs: '1.3rem', md: '1.55rem' }, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  ARS {fmt.format(plan.price)}
                </Box>
                <Box sx={{ fontSize: '0.8rem', opacity: 0.75, mt: 0.5 }}>por mes</Box>
                <Box sx={{ fontSize: '0.8rem', mt: 1.5, opacity: 0.85 }}>
                  {plan.trialDays} días gratis{plan.discount ? ` · ${plan.discount}` : ''}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography
          sx={{
            mt: 3,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: palette.inkSoft,
          }}
        >
          {pricingContent.microcopy}
        </Typography>

        <Typography sx={{ mt: 2, color: palette.inkSoft, fontSize: '1rem' }}>
          Todos los planes incluyen {pricingContent.features.slice(0, 3).join(', ').toLowerCase()} y agenda multi-profesional.{' '}
          <Link href="/#precios" style={{ color: palette.forest, fontWeight: 500 }}>
            Ver el detalle completo de precios
          </Link>
          .
        </Typography>

        <TrialCta label="Empezar prueba gratis" />
      </Container>
    </Box>
  );
}
