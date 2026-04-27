'use client';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AnimatedSection from './AnimatedSection';
import { pricingContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PricingSection() {
  return (
    <Box
      id="precios"
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 10, md: 14 },
        bgcolor: palette.paperDeep,
        borderTop: `1.5px solid ${palette.ink}`,
        borderBottom: `1.5px solid ${palette.ink}`,
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <AnimatedSection>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
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
                color: palette.ink,
              }}
            >
              <Box component="span" sx={{ width: 36, height: '1.5px', bgcolor: palette.ink }} />
              {pricingContent.eyebrow}
              <Box component="span" sx={{ width: 36, height: '1.5px', bgcolor: palette.ink }} />
            </Box>
          </Box>
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '2.2rem', md: '3.4rem', lg: '3.8rem' },
              color: palette.ink,
              mb: 2.5,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              maxWidth: 820,
              mx: 'auto',
            }}
          >
            {pricingContent.headline.split('se adapta')[0]}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral, fontWeight: 600 }}>
              se adapta
            </Box>
            {pricingContent.headline.split('se adapta')[1]}
          </Typography>
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            sx={{
              textAlign: 'center',
              maxWidth: 620,
              mx: 'auto',
              mb: { xs: 5, md: 7 },
              color: palette.inkSoft,
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.6,
            }}
          >
            {pricingContent.subheadline}
          </Typography>
        </AnimatedSection>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2.5, md: 3 },
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            alignItems: 'stretch',
          }}
        >
          {pricingContent.plans.map((plan) => {
            const highlighted = plan.highlighted;
            return (
              <AnimatedSection key={plan.code}>
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: highlighted ? palette.ink : palette.paperSoft,
                    color: highlighted ? palette.paper : palette.ink,
                    border: `1.5px solid ${palette.ink}`,
                    borderRadius: 2,
                    boxShadow: highlighted
                      ? `6px 6px 0 ${palette.coral}`
                      : `4px 4px 0 ${palette.ink}`,
                    p: { xs: 3, md: 3.5 },
                    transform: highlighted ? { md: 'translateY(-8px)' } : 'none',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                  }}
                >
                  {plan.badge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: highlighted ? palette.amber : palette.coral,
                        color: palette.ink,
                        border: `1.5px solid ${palette.ink}`,
                        borderRadius: 999,
                        px: 1.6,
                        py: 0.4,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.66rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {plan.badge}
                    </Box>
                  )}

                  {/* Header */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.66rem',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: highlighted ? palette.amber : palette.inkSoft,
                      }}
                    >
                      <span>{plan.commitment}</span>
                      {plan.discount && (
                        <Box
                          component="span"
                          sx={{
                            px: 0.8,
                            py: 0.2,
                            border: `1px solid ${highlighted ? palette.amber : palette.coral}`,
                            borderRadius: 999,
                            color: highlighted ? palette.amber : palette.coral,
                            fontWeight: 700,
                          }}
                        >
                          {plan.discount}
                        </Box>
                      )}
                    </Box>
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: { xs: '1.4rem', md: '1.55rem' },
                        fontWeight: 600,
                        color: highlighted ? palette.paper : palette.ink,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {plan.name}
                    </Typography>
                  </Box>

                  {/* Price */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'var(--font-fraunces), serif',
                          fontSize: '1.1rem',
                          color: highlighted ? palette.amber : palette.inkSoft,
                          mr: 0.3,
                        }}
                      >
                        $
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'var(--font-fraunces), serif',
                          fontWeight: 600,
                          fontSize: { xs: '2.6rem', md: '3rem' },
                          lineHeight: 1,
                          letterSpacing: '-0.04em',
                          color: highlighted ? palette.paper : palette.ink,
                        }}
                      >
                        {formatPrice(plan.price)}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: '0.78rem',
                          letterSpacing: '0.08em',
                          color: highlighted ? 'rgba(244,239,230,0.7)' : palette.inkSoft,
                          ml: 0.5,
                        }}
                      >
                        / mes
                      </Box>
                    </Box>
                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: '0.82rem',
                        color: highlighted ? 'rgba(244,239,230,0.65)' : palette.inkSoft,
                      }}
                    >
                      {plan.trialDays} días de prueba gratis
                    </Typography>
                  </Box>

                  {/* CTA */}
                  <Button
                    variant="contained"
                    href={`/register?plan=${plan.code}`}
                    sx={{
                      mb: 3,
                      py: 1.3,
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      bgcolor: highlighted ? palette.amber : palette.forest,
                      color: highlighted ? palette.ink : palette.paperSoft,
                      borderColor: highlighted ? palette.paper : palette.ink,
                      boxShadow: highlighted
                        ? `3px 3px 0 ${palette.paper}`
                        : `3px 3px 0 ${palette.ink}`,
                      '&:hover': {
                        bgcolor: highlighted ? palette.coral : palette.forestDeep,
                        color: palette.paperSoft,
                      },
                    }}
                  >
                    {plan.cta}
                    <Box component="span" sx={{ ml: 1 }} aria-hidden>
                      →
                    </Box>
                  </Button>

                  {/* Features */}
                  <Stack spacing={1.2} sx={{ mt: 'auto' }}>
                    {pricingContent.features.map((f) => (
                      <Box
                        key={f}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          fontSize: '0.92rem',
                          color: highlighted ? 'rgba(244,239,230,0.85)' : palette.ink,
                          lineHeight: 1.4,
                        }}
                      >
                        <CheckRoundedIcon
                          sx={{
                            fontSize: '1.05rem',
                            mt: '2px',
                            color: highlighted ? palette.amber : palette.forest,
                            flexShrink: 0,
                          }}
                        />
                        <span>{f}</span>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </AnimatedSection>
            );
          })}
        </Box>

        <AnimatedSection>
          <Typography
            sx={{
              textAlign: 'center',
              mt: { xs: 5, md: 6 },
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: palette.inkSoft,
            }}
          >
            {pricingContent.microcopy}
          </Typography>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
