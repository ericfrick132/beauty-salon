'use client';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AnimatedSection from './AnimatedSection';
import PlanComparison from './PlanComparison';
import { useEffect, useState } from 'react';
import { useSignupModal } from './SignupModal';
import { pricingContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';
import { estimateFromArs, fetchCountryPlanPrices, formatCountryPrice, priceParts } from '@/app/(lib)/countries';

/** Cotización para mostrar los precios en dólares en la home (solo referencia: se cobra en la moneda de cada país). */
const USD_DISPLAY_RATE = 1500;

function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Precios de la home (freemium: Gratuito, Plus, Advance y Pro). Sin país (Argentina) salen los de
 * content.ts en ARS. En las landings por país (/uy, /mx, /es) o con ?pais=uy|mx|es, los precios pagos son
 * los de la suscripción en la moneda del país (/api/subscription-plans?country=XX, por código de plan) y
 * el copy es el del país (tú y "citas" en MX/ES). Gratuito siempre es 0, en cualquier moneda.
 */
export default function PricingSection() {
  const { open, country } = useSignupModal();
  const copy = country?.copy.pricing;
  // Mientras llega la API (o si falla) se muestra el equivalente del precio en ARS, como el backend.
  const [countryPrices, setCountryPrices] = useState<Record<string, number>>({});
  // Home sin país: el visitante de afuera de Argentina puede ver los precios en dólares.
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const inUsd = !country && currency === 'USD';
  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    setCountryPrices({});
    fetchCountryPlanPrices(country)
      .then((prices) => { if (!cancelled) setCountryPrices(prices); })
      .catch(() => { /* queda la estimación */ });
    return () => { cancelled = true; };
  }, [country]);
  const headline = copy?.headline ?? pricingContent.headline;
  const accent = copy?.accent ?? pricingContent.accent;
  const [before, ...rest] = headline.split(accent);
  const after = rest.join(accent);
  // Precio mensual por plan: Gratuito siempre 0; los pagos, el de la API del país o la estimación desde ARS.
  const localPrice = (plan: (typeof pricingContent.plans)[number]) =>
    country
      ? (plan.price === 0 ? 0 : countryPrices[plan.code] ?? estimateFromArs(plan.price, country.currency))
      : inUsd ? Math.round((plan.price / USD_DISPLAY_RATE) * 100) / 100 : plan.price;
  const priceCurrency = country ? country.currency : inUsd ? 'USD' : null;
  const tablePrices = pricingContent.plans.map((plan) =>
    priceCurrency ? formatCountryPrice(localPrice(plan), priceCurrency) : `$${formatPrice(plan.price)}`,
  );
  const selectPlan = (code: string) => {
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem('_selected_plan', code); } catch { /* sin storage */ }
    }
    open();
  };
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
              maxWidth: 880,
              mx: 'auto',
            }}
          >
            {rest.length ? (
              <>
                {before}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral, fontWeight: 600 }}>
                  {accent}
                </Box>
                {after}
              </>
            ) : (
              headline
            )}
          </Typography>
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            sx={{
              textAlign: 'center',
              maxWidth: 660,
              mx: 'auto',
              mb: { xs: 6, md: 8 },
              color: palette.inkSoft,
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.6,
            }}
          >
            {copy?.subheadline ?? pricingContent.subheadline}
          </Typography>
        </AnimatedSection>

        {!country && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, mt: { xs: -3, md: -4.5 }, mb: { xs: 5, md: 6 } }}>
            <Box
              role="group"
              aria-label="Moneda de los precios"
              sx={{ display: 'inline-flex', p: '3px', border: `1.5px solid ${palette.ink}`, borderRadius: 999, bgcolor: palette.paper }}
            >
              {(['ARS', 'USD'] as const).map((c) => {
                const active = currency === c;
                return (
                  <Box
                    key={c}
                    component="button"
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCurrency(c)}
                    sx={{
                      border: 0, cursor: 'pointer', borderRadius: 999, px: 2.25, py: 0.75, minWidth: 64,
                      fontFamily: 'var(--font-mono), monospace', fontSize: '0.78rem', letterSpacing: '0.12em', fontWeight: 600,
                      bgcolor: active ? palette.ink : 'transparent', color: active ? palette.paper : palette.ink,
                      transition: 'background-color 160ms ease, color 160ms ease',
                    }}
                  >
                    {c}
                  </Box>
                );
              })}
            </Box>
            <Typography sx={{ fontSize: '0.8rem', color: palette.inkMute, textAlign: 'center', maxWidth: 420, minHeight: '1.2em' }}>
              {inUsd
                ? `Referencia en dólares (US$ 1 = $ ${formatPrice(USD_DISPLAY_RATE)}). Se cobra en la moneda de tu país.`
                : 'Precios en pesos argentinos. ¿Estás en otro país? Miralos en dólares.'}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 3.5, md: 3 },
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'stretch',
            maxWidth: { xs: 440, sm: 'none' },
            mx: 'auto',
          }}
        >
          {pricingContent.plans.map((plan, index) => {
            const highlighted = plan.highlighted;
            const isFree = plan.price === 0;
            const planCopy = copy?.plans[plan.code];
            const tagline = planCopy?.tagline ?? plan.tagline;
            const planFeatures = planCopy?.features ?? plan.features;
            const local = priceCurrency ? priceParts(localPrice(plan), priceCurrency) : null;
            const note = isFree
              ? copy?.freeNote ?? pricingContent.freeNote
              : inUsd ? 'Referencia en dólares. Se cobra en la moneda de tu país.' : copy?.paidNote ?? pricingContent.paidNote;
            const muted = highlighted ? 'rgba(244,239,230,0.68)' : palette.inkSoft;
            return (
              <AnimatedSection key={plan.code} delay={index * 0.06}>
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: highlighted ? palette.ink : palette.paperSoft,
                    color: highlighted ? palette.paper : palette.ink,
                    border: highlighted ? `2.5px solid ${palette.ink}` : `1.5px solid ${palette.ink}`,
                    borderRadius: 2,
                    boxShadow: highlighted ? `8px 8px 0 ${palette.coral}` : `4px 4px 0 ${palette.ink}`,
                    p: { xs: 3, md: 3 },
                    transform: highlighted ? { lg: 'translateY(-12px)' } : 'none',
                  }}
                >
                  {plan.badge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: palette.amber,
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

                  {/* Header: número de plan + nombre + bajada */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box
                      sx={{
                        mb: 1,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.66rem',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: highlighted ? palette.amber : palette.inkMute,
                      }}
                    >
                      Plan 0{index + 1}
                    </Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: { xs: '1.6rem', md: '1.7rem' },
                        fontWeight: 600,
                        color: highlighted ? palette.paper : palette.ink,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                        mb: 0.8,
                      }}
                    >
                      {plan.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.92rem', lineHeight: 1.45, color: muted, minHeight: { lg: '2.7em' } }}>
                      {tagline}
                    </Typography>
                  </Box>

                  {/* Precio */}
                  <Box
                    sx={{
                      mb: 2.5,
                      pt: 2.2,
                      borderTop: `1px dashed ${highlighted ? 'rgba(244,239,230,0.3)' : 'rgba(23,20,16,0.25)'}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 0.5 }}>
                      {(local ? local.prefix : '$') && (
                        <Box
                          component="span"
                          sx={{
                            fontFamily: 'var(--font-fraunces), serif',
                            fontSize: '1.1rem',
                            color: highlighted ? palette.amber : palette.inkSoft,
                            mr: 0.2,
                          }}
                        >
                          {local ? local.prefix : '$'}
                        </Box>
                      )}
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'var(--font-fraunces), serif',
                          fontWeight: 600,
                          fontSize: { xs: '2.8rem', lg: '2.6rem' },
                          lineHeight: 1,
                          letterSpacing: '-0.04em',
                          color: highlighted ? palette.paper : palette.ink,
                        }}
                      >
                        {local ? local.amount : formatPrice(plan.price)}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: '0.78rem',
                          letterSpacing: '0.08em',
                          color: muted,
                          ml: 0.4,
                        }}
                      >
                        {local?.suffix ? `${local.suffix} ` : ''}
                        {copy?.perMonth ?? '/ mes'}
                      </Box>
                    </Box>
                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: '0.8rem',
                        fontWeight: isFree ? 600 : 400,
                        color: isFree ? (highlighted ? palette.amber : palette.forest) : muted,
                      }}
                    >
                      {note}
                    </Typography>
                  </Box>

                  {/* CTA: todos se registran gratis; el plan elegido viaja como pista (_selected_plan). */}
                  <Button
                    variant="contained"
                    onClick={() => selectPlan(plan.code)}
                    sx={{
                      mb: 3,
                      py: 1.3,
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      bgcolor: highlighted ? palette.amber : isFree ? palette.forest : palette.paperSoft,
                      color: highlighted ? palette.ink : isFree ? palette.paperSoft : palette.ink,
                      border: `1.5px solid ${highlighted ? palette.paper : palette.ink}`,
                      boxShadow: highlighted ? `3px 3px 0 ${palette.paper}` : `3px 3px 0 ${palette.ink}`,
                      '&:hover': {
                        bgcolor: highlighted ? palette.coral : isFree ? palette.forestDeep : palette.ink,
                        color: palette.paperSoft,
                      },
                    }}
                  >
                    {plan.cta}
                    <Box component="span" sx={{ ml: 1 }} aria-hidden>
                      →
                    </Box>
                  </Button>

                  {/* Qué incluye */}
                  <Stack component="ul" spacing={1.2} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {planFeatures.map((f, i) => {
                      const lead = i === 0 && f.startsWith('Todo lo del');
                      return (
                        <Box
                          component="li"
                          key={f}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            fontSize: '0.92rem',
                            fontWeight: lead ? 600 : 400,
                            color: highlighted ? 'rgba(244,239,230,0.88)' : palette.ink,
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
                      );
                    })}
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
              maxWidth: 640,
              mx: 'auto',
              mt: { xs: 5, md: 7 },
              fontSize: '0.88rem',
              lineHeight: 1.6,
              color: palette.inkSoft,
            }}
          >
            <Box component="span" sx={{ color: palette.coral, fontWeight: 700, mr: 0.5 }} aria-hidden>
              *
            </Box>
            {copy?.commissionNote ?? pricingContent.commissionNote}
          </Typography>
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            sx={{
              textAlign: 'center',
              mt: 2,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: palette.inkSoft,
            }}
          >
            {copy?.microcopy ?? pricingContent.microcopy}
          </Typography>
        </AnimatedSection>

        <PlanComparison
          copy={copy?.comparison ?? pricingContent.comparison}
          plans={pricingContent.plans}
          prices={tablePrices}
          perMonth={copy?.perMonth ?? '/ mes'}
          onSelect={selectPlan}
        />
      </Container>
    </Box>
  );
}
