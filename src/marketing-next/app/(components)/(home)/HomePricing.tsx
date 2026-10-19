'use client';
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { pricingContent, type ComparisonCell } from '@/app/(lib)/content';
import { apiUrl } from '@/app/(lib)/countries';
import { useSignupModal } from '../(sections)/SignupModal';
import { Accent, Section, SectionHead, Wrap, home, sans, titleSx } from './ui';

const ars = (n: number) => `$${n.toLocaleString('es-AR')}`;

/**
 * Precios: el HTML estático sale de pricingContent (mismos valores que la base) y en el cliente se
 * pisan con GET /api/subscription-plans (precio por código de plan), así un cambio de precio en el
 * super admin se ve sin rebuild.
 */
function useLivePrices(): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    fetch(apiUrl('/subscription-plans'))
      .then((r) => (r.ok ? r.json() : []))
      .then((plans: { code: string; price: number }[]) => {
        if (!alive || !Array.isArray(plans)) return;
        const map: Record<string, number> = {};
        for (const p of plans) if (p && typeof p.price === 'number') map[p.code] = p.price;
        setPrices(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return prices;
}

function Cell({ v }: { v: ComparisonCell }) {
  if (v === true) return <Box component="span" sx={{ color: home.forest, fontWeight: 700 }} aria-label="Incluido">✓</Box>;
  if (v === false) return <Box component="span" sx={{ color: home.inkMute }} aria-label="No incluido">—</Box>;
  return <>{v}</>;
}

export default function HomePricing() {
  const { open } = useSignupModal();
  const live = useLivePrices();
  const plans = pricingContent.plans.map((p) => ({ ...p, price: live[p.code] ?? p.price }));
  const cmp = pricingContent.comparison;

  return (
    <Section id="precios">
      <Wrap>
        <SectionHead
          title={<><Accent>$0 por mes.</Accent> Pagás 5% solo cuando te pagan online.</>}
          line="Efectivo y transferencia, sin comisión. Pasate de plan cuando lo necesites."
        />

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
          {plans.map((p) => {
            const free = p.price === 0;
            return (
              <Box
                key={p.code}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 3,
                  borderRadius: home.radius,
                  bgcolor: free ? home.ink : home.card,
                  color: free ? home.paper : home.ink,
                  border: `1px solid ${free ? home.ink : home.line}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{p.name}</Typography>
                  {free && <Box sx={{ px: 1.25, py: 0.3, borderRadius: 999, bgcolor: home.amber, color: home.ink, fontFamily: sans, fontSize: '0.74rem', fontWeight: 700 }}>Para siempre</Box>}
                  {!free && p.badge && <Box sx={{ px: 1.25, py: 0.3, borderRadius: 999, bgcolor: home.forestSoft, color: home.forestDeep, fontFamily: sans, fontSize: '0.74rem', fontWeight: 600 }}>{p.badge}</Box>}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ ...titleSx, color: 'inherit', fontSize: '2.4rem' }}>{ars(p.price)}</Typography>
                  <Typography sx={{ fontFamily: sans, fontSize: '0.9rem', opacity: 0.7 }}>/mes</Typography>
                </Box>
                <Typography sx={{ mt: 0.5, fontFamily: sans, fontSize: '0.88rem', opacity: 0.75, minHeight: { lg: 42 } }}>
                  {free ? 'Sin tarjeta. Sin vencimiento.' : p.tagline}
                </Typography>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, mb: 3, display: 'grid', gap: 1, flex: 1 }}>
                  {p.features.map((f) => (
                    <Box component="li" key={f} sx={{ display: 'flex', gap: 1, fontFamily: sans, fontSize: '0.92rem', lineHeight: 1.4 }}>
                      <Box component="span" aria-hidden sx={{ color: free ? home.amber : home.forest, fontWeight: 700 }}>✓</Box>
                      {f}
                    </Box>
                  ))}
                  {free && (
                    <Box component="li" sx={{ display: 'flex', gap: 1, fontFamily: sans, fontSize: '0.88rem', lineHeight: 1.4, opacity: 0.7 }}>
                      <Box component="span" aria-hidden>—</Box>
                      WhatsApp, recordatorios y asistente: desde Plus
                    </Box>
                  )}
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => open()}
                  sx={{
                    py: 1.3,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: sans,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    bgcolor: free ? home.paper : 'rgba(23,20,16,0.07)',
                    color: home.ink,
                    '&:hover': { bgcolor: free ? '#fff' : 'rgba(23,20,16,0.12)' },
                  }}
                >
                  {free ? 'Empezá gratis' : `Empezá gratis y pasate a ${p.name}`}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ mt: 2.5, textAlign: 'center', fontFamily: sans, fontSize: '0.88rem', color: home.inkSoft, maxWidth: 720, mx: 'auto', lineHeight: 1.5 }}>
          {pricingContent.commissionNote} Precio final en pesos.
        </Typography>

        {/* Tabla completa, plegada para no cortar el ritmo de la página. */}
        <Box component="details" sx={{ mt: 4, borderRadius: home.radius, bgcolor: home.card, border: `1px solid ${home.line}`, '& summary::-webkit-details-marker': { display: 'none' } }}>
          <Box component="summary" sx={{ listStyle: 'none', cursor: 'pointer', px: 3, py: 2.25, fontFamily: sans, fontWeight: 600, fontSize: '1rem', color: home.ink, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {cmp.title}
            <Box component="span" aria-hidden sx={{ color: home.inkSoft }}>＋</Box>
          </Box>
          <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 3, overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontFamily: sans, fontSize: '0.88rem' }}>
              <thead>
                <Box component="tr" sx={{ textAlign: 'left' }}>
                  <Box component="th" sx={{ py: 1, pr: 2, color: home.inkSoft, fontWeight: 500 }}>{cmp.featureHeader}</Box>
                  {plans.map((p) => (
                    <Box component="th" key={p.code} sx={{ py: 1, px: 1, fontWeight: 600, textAlign: 'center' }}>{p.name}</Box>
                  ))}
                </Box>
              </thead>
              <tbody>
                {cmp.groups.map((g) => [
                  <Box component="tr" key={g.title}>
                    <Box component="td" colSpan={5} sx={{ pt: 2.5, pb: 1, fontWeight: 600, color: home.ink }}>{g.title}</Box>
                  </Box>,
                  ...g.rows.map((r) => (
                    <Box component="tr" key={g.title + r.label} sx={{ borderTop: `1px solid ${home.line}` }}>
                      <Box component="td" sx={{ py: 1.1, pr: 2, color: home.inkSoft }}>{r.label}</Box>
                      {r.values.map((v, i) => (
                        <Box component="td" key={i} sx={{ py: 1.1, px: 1, textAlign: 'center', color: home.ink }}><Cell v={v} /></Box>
                      ))}
                    </Box>
                  )),
                ])}
              </tbody>
            </Box>
            <Typography sx={{ mt: 2.5, fontFamily: sans, fontSize: '0.86rem', color: home.inkSoft, lineHeight: 1.55 }}>
              <Box component="span" sx={{ fontWeight: 600, color: home.ink }}>{cmp.exampleTitle}. </Box>
              {cmp.example} {cmp.packs}
            </Typography>
          </Box>
        </Box>
      </Wrap>
    </Section>
  );
}
