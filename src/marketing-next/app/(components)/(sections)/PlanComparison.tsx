'use client';
import { Fragment } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AnimatedSection from './AnimatedSection';
import type { ComparisonCell, PlanComparisonCopy, PricingPlan } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

interface Props {
  copy: PlanComparisonCopy;
  plans: PricingPlan[];
  /** Precio ya formateado por plan, mismo orden que plans (ej. "$0", "US$ 6", "18 €"). */
  prices: string[];
  perMonth: string;
  onSelect: (code: string) => void;
}

const mono = 'var(--font-mono), monospace';
const serif = 'var(--font-fraunces), serif';
const highlightBg = 'rgba(244,192,56,0.16)';
const rule = 'rgba(23,20,16,0.14)';

function Cell({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return <CheckRoundedIcon aria-label="Incluido" sx={{ fontSize: '1.25rem', color: palette.forest, verticalAlign: 'middle' }} />;
  }
  if (value === false) {
    return (
      <Box component="span" aria-label="No incluido" sx={{ color: palette.inkMute, fontSize: '1.1rem' }}>
        —
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ fontWeight: 600, fontSize: '0.88rem', color: palette.ink, lineHeight: 1.3 }}>
      {value}
    </Box>
  );
}

/**
 * "Compará los planes": tabla completa por categoría (debajo de las 4 tarjetas de PricingSection),
 * ejemplo de comisión, packs de WhatsApp y FAQ de precios (el mismo FAQ va al JSON-LD de la página).
 * En mobile la tabla scrollea dentro de su caja con la primera columna fija: la página no se desborda.
 */
export default function PlanComparison({ copy, plans, prices, perMonth, onSelect }: Props) {
  const [before, ...rest] = copy.title.split(copy.accent);
  const stickyCol = {
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
    bgcolor: palette.paperSoft,
    borderRight: `1px solid ${rule}`,
  };

  return (
    <Box sx={{ mt: { xs: 9, md: 12 } }}>
      <AnimatedSection>
        <Typography
          component="h3"
          sx={{
            fontFamily: serif,
            textAlign: 'center',
            fontSize: { xs: '1.9rem', md: '2.6rem' },
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: palette.ink,
            mb: 1.5,
          }}
        >
          {rest.length ? (
            <>
              {before}
              <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral, fontWeight: 600 }}>
                {copy.accent}
              </Box>
              {rest.join(copy.accent)}
            </>
          ) : (
            copy.title
          )}
        </Typography>
        <Typography sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto', mb: { xs: 4, md: 5 }, color: palette.inkSoft, lineHeight: 1.6 }}>
          {copy.intro}
        </Typography>
      </AnimatedSection>

      <Typography
        sx={{
          display: { xs: 'block', md: 'none' },
          mb: 1.2,
          fontFamily: mono,
          fontSize: '0.66rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: palette.inkSoft,
        }}
      >
        {copy.swipeHint}
      </Typography>

      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          border: `1.5px solid ${palette.ink}`,
          borderRadius: 2,
          bgcolor: palette.paperSoft,
          boxShadow: `4px 4px 0 ${palette.ink}`,
        }}
      >
        <Box
          component="table"
          sx={{
            width: '100%',
            minWidth: 700,
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            '& th, & td': { borderBottom: `1px solid ${rule}`, px: { xs: 1.2, md: 2 }, py: 1.4 },
            '& td:not(:first-of-type), & th:not(:first-of-type)': { textAlign: 'center' },
          }}
        >
          <colgroup>
            <col style={{ width: '32%' }} />
            {plans.map((p) => (
              <col key={p.code} style={{ width: '17%' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <Box
                component="th"
                scope="col"
                sx={{
                  ...stickyCol,
                  textAlign: 'left',
                  verticalAlign: 'bottom',
                  fontFamily: mono,
                  fontSize: '0.66rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  color: palette.inkSoft,
                  borderBottom: `1.5px solid ${palette.ink} !important`,
                }}
              >
                {copy.featureHeader}
              </Box>
              {plans.map((p) => (
                <Box
                  component="th"
                  scope="col"
                  key={p.code}
                  sx={{
                    verticalAlign: 'bottom',
                    pt: '20px !important',
                    bgcolor: p.highlighted ? highlightBg : 'transparent',
                    borderBottom: `1.5px solid ${palette.ink} !important`,
                  }}
                >
                  {p.badge && (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        mb: 0.8,
                        bgcolor: palette.amber,
                        border: `1.5px solid ${palette.ink}`,
                        borderRadius: 999,
                        px: 1,
                        py: 0.2,
                        fontFamily: mono,
                        fontSize: '0.58rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: palette.ink,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.badge}
                    </Box>
                  )}
                  <Box sx={{ fontFamily: serif, fontWeight: 600, fontSize: { xs: '1.1rem', md: '1.3rem' }, letterSpacing: '-0.02em', color: palette.ink }}>
                    {p.name}
                  </Box>
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {copy.groups.map((g) => (
              <Fragment key={g.title}>
                <tr>
                  <Box
                    component="th"
                    scope="colgroup"
                    colSpan={plans.length + 1}
                    sx={{
                      textAlign: 'left',
                      bgcolor: palette.paperDeep,
                      pt: '18px !important',
                      pb: '8px !important',
                      borderBottom: `1px solid ${palette.ink} !important`,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        position: 'sticky',
                        left: 12,
                        fontFamily: mono,
                        fontSize: '0.68rem',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: palette.ink,
                      }}
                    >
                      {g.title}
                    </Box>
                  </Box>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.label}>
                    <Box
                      component="th"
                      scope="row"
                      sx={{ ...stickyCol, textAlign: 'left', fontWeight: 400, fontSize: { xs: '0.84rem', md: '0.92rem' }, lineHeight: 1.35, color: palette.ink }}
                    >
                      {r.label}
                    </Box>
                    {r.values.map((v, i) => (
                      <Box component="td" key={plans[i].code} sx={{ bgcolor: plans[i].highlighted ? highlightBg : 'transparent' }}>
                        <Cell value={v} />
                      </Box>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr>
              <Box
                component="th"
                scope="row"
                sx={{
                  ...stickyCol,
                  textAlign: 'left',
                  borderBottom: 'none !important',
                  borderTop: `1.5px solid ${palette.ink}`,
                  fontFamily: mono,
                  fontSize: '0.68rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: palette.ink,
                }}
              >
                {copy.priceLabel}
              </Box>
              {plans.map((p, i) => (
                <Box
                  component="td"
                  key={p.code}
                  sx={{
                    borderBottom: 'none !important',
                    borderTop: `1.5px solid ${palette.ink}`,
                    bgcolor: p.highlighted ? highlightBg : 'transparent',
                    py: '18px !important',
                  }}
                >
                  <Box sx={{ fontFamily: serif, fontWeight: 600, fontSize: { xs: '1.25rem', md: '1.5rem' }, letterSpacing: '-0.03em', color: palette.ink, lineHeight: 1 }}>
                    {prices[i]}
                  </Box>
                  <Box sx={{ fontFamily: mono, fontSize: '0.66rem', letterSpacing: '0.08em', color: palette.inkSoft, mt: 0.5, mb: 1.4 }}>
                    {perMonth}
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onSelect(p.code)}
                    sx={{
                      px: 1.2,
                      py: 0.7,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      bgcolor: p.highlighted ? palette.ink : p.price === 0 ? palette.forest : palette.paperSoft,
                      color: p.highlighted || p.price === 0 ? palette.paperSoft : palette.ink,
                      border: `1.5px solid ${palette.ink}`,
                      boxShadow: `2px 2px 0 ${p.highlighted ? palette.coral : palette.ink}`,
                      '&:hover': { bgcolor: p.highlighted ? palette.coral : palette.forestDeep, color: palette.paperSoft },
                    }}
                  >
                    {p.cta}
                  </Button>
                </Box>
              ))}
            </tr>
          </tbody>
        </Box>
      </Box>

      {/* Ejemplo de comisión + packs */}
      <Box
        sx={{
          mt: { xs: 4, md: 5 },
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 2,
            bgcolor: palette.paper,
            boxShadow: `4px 4px 0 ${palette.coral}`,
          }}
        >
          <Box sx={{ fontFamily: mono, fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.coral, fontWeight: 700, mb: 1 }}>
            {copy.exampleTitle}
          </Box>
          <Typography sx={{ color: palette.ink, fontSize: { xs: '0.95rem', md: '1rem' }, lineHeight: 1.6 }}>{copy.example}</Typography>
        </Box>
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 2,
            bgcolor: palette.forest,
            color: palette.paperSoft,
            boxShadow: `4px 4px 0 ${palette.ink}`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontFamily: serif, fontSize: { xs: '1.15rem', md: '1.25rem' }, lineHeight: 1.35, fontWeight: 500 }}>
            {copy.packs}
          </Typography>
        </Box>
      </Box>

      {/* FAQ de precios (también en el JSON-LD FAQPage de la página) */}
      <Box sx={{ mt: { xs: 6, md: 8 } }}>
        <Box className="tp-rule" sx={{ mb: 3 }}>
          {copy.faqTitle}
        </Box>
        <Box sx={{ display: 'grid', columnGap: 4, rowGap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {copy.faqs.map((f) => (
            <Box key={f.q} sx={{ borderTop: `1.5px solid ${palette.ink}`, pt: 2 }}>
              <Typography component="h4" sx={{ fontFamily: serif, fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em', color: palette.ink, mb: 0.8 }}>
                {f.q}
              </Typography>
              <Typography sx={{ color: palette.inkSoft, fontSize: '0.96rem', lineHeight: 1.6 }}>{f.a}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
