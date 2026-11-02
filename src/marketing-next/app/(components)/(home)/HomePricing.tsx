'use client';
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { pricingContent, type ComparisonCell, type PlanCode } from '@/app/(lib)/content';
import { apiUrl } from '@/app/(lib)/countries';
import { useSignupModal } from '../(sections)/SignupModal';
import DemoRequest from './DemoRequest';
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

/**
 * Lo que muestra cada tarjeta: 3 o 4 diferenciales (todos salen de pricingContent.plans[].features).
 * El detalle completo queda en la tabla "Compará los planes".
 */
const HIGHLIGHTS: Record<PlanCode, string[]> = {
  free: ['100 reservas por mes', 'Hasta 3 agendas', '5% de comisión por cobro'],
  plus: ['200 reservas por mes', 'Recordatorios automáticos', '30 mensajes de WhatsApp por mes', '2% de comisión por cobro'],
  advance: ['Reservas y agendas ilimitadas', 'Reservas recurrentes', 'Transferencia bancaria automática', '1% de comisión por cobro'],
  pro_v2: ['Todo lo del plan Advance', '250 mensajes de WhatsApp por mes', 'Ficha e historial de clientes', 'Sin comisión por cobro'],
};

/** Plan "A medida" (card #23): sin precio publicado, se cotiza por el formulario de arriba. */
const CUSTOM = {
  name: 'A medida',
  tagline: 'Para cadenas, franquicias y centros con muchas agendas o sucursales.',
  items: ['Todo lo del plan Pro', 'Precio según tu operación (sucursales, profesionales)', 'Propuesta por WhatsApp'],
};

/** Columna "A medida" de la tabla: todo lo de Pro; los cupos numéricos se arman según la operación. */
function customCell(pro: ComparisonCell): ComparisonCell {
  if (typeof pro === 'string' && /^\d/.test(pro)) return 'A medida';
  return pro;
}

function Cell({ v }: { v: ComparisonCell }) {
  if (v === true) return <Box component="span" sx={{ color: home.forest, fontWeight: 700 }} aria-label="Incluido">✓</Box>;
  if (v === false) return <Box component="span" sx={{ color: home.inkMute }} aria-label="No incluido">—</Box>;
  return <>{v}</>;
}

const cardSx = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  p: 3,
  borderRadius: home.radius,
} as const;

const ctaSx = {
  py: 1.3,
  px: 2,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  fontFamily: sans,
  fontWeight: 600,
  fontSize: '0.95rem',
  lineHeight: 1.25,
  color: home.ink,
} as const;

/** Primera columna fija al scrollear la tabla en mobile. */
const stickySx = { position: 'sticky', left: 0, zIndex: 1, bgcolor: home.card } as const;

export default function HomePricing() {
  const { open } = useSignupModal();
  const live = useLivePrices();
  const [demoPlan, setDemoPlan] = useState('');
  const plans = pricingContent.plans.map((p) => ({ ...p, price: live[p.code] ?? p.price }));
  const cmp = pricingContent.comparison;

  const quote = () => {
    setDemoPlan('A medida');
    document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Section id="precios">
      <Wrap>
        <DemoRequest plan={demoPlan} onPlanChange={setDemoPlan} />

        <SectionHead
          title={<><Accent>$0 por mes.</Accent> Pagás 5% solo cuando te pagan online.</>}
          line="Efectivo y transferencia, sin comisión. Pasate de plan cuando lo necesites."
        />

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' } }}>
          {plans.map((p) => {
            const free = p.price === 0;
            const items = HIGHLIGHTS[p.code] ?? p.features;
            return (
              <Box
                key={p.code}
                sx={{
                  ...cardSx,
                  bgcolor: free ? home.ink : home.card,
                  color: free ? home.paper : home.ink,
                  border: `1px solid ${free ? home.ink : p.highlighted ? home.forest : home.line}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{p.name}</Typography>
                  {free && <Box sx={{ px: 1.25, py: 0.3, borderRadius: 999, bgcolor: home.amber, color: home.ink, fontFamily: sans, fontSize: '0.74rem', fontWeight: 700 }}>Para siempre</Box>}
                  {!free && p.badge && <Box sx={{ px: 1.25, py: 0.3, borderRadius: 999, bgcolor: home.forestSoft, color: home.forestDeep, fontFamily: sans, fontSize: '0.74rem', fontWeight: 600 }}>{p.badge}</Box>}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ ...titleSx, color: 'inherit', fontSize: '2.2rem' }}>{ars(p.price)}</Typography>
                  <Typography sx={{ fontFamily: sans, fontSize: '0.9rem', opacity: 0.7 }}>/mes</Typography>
                </Box>
                <Typography sx={{ mt: 0.5, fontFamily: sans, fontSize: '0.88rem', opacity: 0.75, minHeight: { lg: 42 } }}>
                  {free ? 'Sin tarjeta. Sin vencimiento.' : p.tagline}
                </Typography>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, mb: 3, display: 'grid', gap: 1, alignContent: 'start', flex: 1 }}>
                  {items.map((f) => (
                    <Box component="li" key={f} sx={{ display: 'flex', gap: 1, fontFamily: sans, fontSize: '0.92rem', lineHeight: 1.4 }}>
                      <Box component="span" aria-hidden sx={{ color: free ? home.amber : home.forest, fontWeight: 700 }}>✓</Box>
                      {f}
                    </Box>
                  ))}
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => open()}
                  sx={{
                    ...ctaSx,
                    bgcolor: free ? home.paper : 'rgba(23,20,16,0.07)',
                    '&:hover': { bgcolor: free ? '#fff' : 'rgba(23,20,16,0.12)' },
                  }}
                >
                  {free ? 'Empezá gratis' : `Empezá gratis y pasate a ${p.name}`}
                </Box>
              </Box>
            );
          })}

          {/* A medida: sin número a propósito; el precio se arma con la operación de cada negocio. */}
          <Box sx={{ ...cardSx, bgcolor: home.forestDeep, color: home.paperSoft, border: `1px solid ${home.forestDeep}` }}>
            <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{CUSTOM.name}</Typography>
            <Typography sx={{ ...titleSx, mt: 2, color: 'inherit', fontSize: '1.7rem', lineHeight: 1.15 }}>Consultá el precio</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: sans, fontSize: '0.88rem', opacity: 0.8, minHeight: { lg: 42 } }}>{CUSTOM.tagline}</Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, mb: 3, display: 'grid', gap: 1, alignContent: 'start', flex: 1 }}>
              {CUSTOM.items.map((f) => (
                <Box component="li" key={f} sx={{ display: 'flex', gap: 1, fontFamily: sans, fontSize: '0.92rem', lineHeight: 1.4 }}>
                  <Box component="span" aria-hidden sx={{ color: home.amber, fontWeight: 700 }}>✓</Box>
                  {f}
                </Box>
              ))}
            </Box>
            <Box component="button" type="button" onClick={quote} sx={{ ...ctaSx, bgcolor: home.paperSoft, '&:hover': { bgcolor: '#fff' } }}>
              Cotizar
            </Box>
          </Box>
        </Box>

        <Typography sx={{ mt: 2.5, textAlign: 'center', fontFamily: sans, fontSize: '0.88rem', color: home.inkSoft, maxWidth: 720, mx: 'auto', lineHeight: 1.5 }}>
          {pricingContent.commissionNote} Precio final en pesos.
        </Typography>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Box
            component="a"
            href="#comparar-planes"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 2.5, py: 1.1, borderRadius: 999, border: `1px solid ${home.lineStrong}`, color: home.ink, fontFamily: sans, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(23,20,16,0.05)' } }}
          >
            Comparar planes <span aria-hidden>↓</span>
          </Box>
        </Box>

        {/* Comparativa completa (card #25), agrupada por categoría como la de Dentalink. */}
        <Box id="comparar-planes" sx={{ mt: { xs: 5, md: 7 }, scrollMarginTop: 96, borderRadius: home.radius, bgcolor: home.card, border: `1px solid ${home.line}`, overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3 }}>
            <Typography component="h3" sx={{ ...titleSx, fontSize: { xs: '1.5rem', md: '1.9rem' } }}>{cmp.title}</Typography>
            <Typography sx={{ mt: 1, fontFamily: sans, fontSize: '0.95rem', color: home.inkSoft }}>{cmp.intro}</Typography>
            <Typography sx={{ mt: 1, display: { md: 'none' }, fontFamily: sans, fontSize: '0.82rem', color: home.inkMute }}>{cmp.swipeHint}</Typography>
          </Box>
          <Box sx={{ mt: 2, px: { xs: 0, sm: 1 }, pb: 3, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'separate', borderSpacing: 0, fontFamily: sans, fontSize: '0.88rem' }}>
              <thead>
                <Box component="tr" sx={{ textAlign: 'left' }}>
                  <Box component="th" sx={{ ...stickySx, py: 1.25, pl: { xs: 2, sm: 2 }, pr: 2, color: home.inkSoft, fontWeight: 500, minWidth: 190 }}>{cmp.featureHeader}</Box>
                  {plans.map((p) => (
                    <Box component="th" key={p.code} sx={{ py: 1.25, px: 1, fontWeight: 600, textAlign: 'center', verticalAlign: 'bottom' }}>
                      {p.name}
                      <Box component="span" sx={{ display: 'block', mt: 0.25, fontWeight: 500, fontSize: '0.8rem', color: home.inkSoft }}>
                        {p.price === 0 ? '$0' : `${ars(p.price)}/mes`}
                      </Box>
                    </Box>
                  ))}
                  <Box component="th" sx={{ py: 1.25, px: 1, fontWeight: 600, textAlign: 'center', verticalAlign: 'bottom', color: home.forestDeep }}>
                    {CUSTOM.name}
                    <Box component="span" sx={{ display: 'block', mt: 0.25, fontWeight: 500, fontSize: '0.8rem', color: home.inkSoft }}>Consultá</Box>
                  </Box>
                </Box>
              </thead>
              <tbody>
                {cmp.groups.map((g) => [
                  <Box component="tr" key={g.title}>
                    <Box component="td" sx={{ ...stickySx, pt: 2.5, pb: 1, pl: 2, fontWeight: 700, color: home.ink, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{g.title}</Box>
                    <Box component="td" colSpan={plans.length + 1} sx={{ pt: 2.5, pb: 1 }} />
                  </Box>,
                  ...g.rows.map((r) => (
                    <Box component="tr" key={g.title + r.label}>
                      <Box component="td" sx={{ ...stickySx, py: 1.1, pl: 2, pr: 2, color: home.inkSoft, borderTop: `1px solid ${home.line}` }}>{r.label}</Box>
                      {r.values.map((v, i) => (
                        <Box component="td" key={i} sx={{ py: 1.1, px: 1, textAlign: 'center', color: home.ink, borderTop: `1px solid ${home.line}` }}><Cell v={v} /></Box>
                      ))}
                      <Box component="td" sx={{ py: 1.1, px: 1, textAlign: 'center', color: home.ink, borderTop: `1px solid ${home.line}`, bgcolor: 'rgba(30,94,63,0.05)' }}>
                        <Cell v={customCell(r.values[r.values.length - 1])} />
                      </Box>
                    </Box>
                  )),
                ])}
              </tbody>
            </Box>
          </Box>
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
            <Typography sx={{ fontFamily: sans, fontSize: '0.86rem', color: home.inkSoft, lineHeight: 1.55 }}>
              <Box component="span" sx={{ fontWeight: 600, color: home.ink }}>{cmp.exampleTitle}. </Box>
              {cmp.example} {cmp.packs}
            </Typography>
            <Box component="button" type="button" onClick={quote} sx={{ mt: 2, ...ctaSx, px: 2.5, bgcolor: 'rgba(23,20,16,0.07)', '&:hover': { bgcolor: 'rgba(23,20,16,0.12)' } }}>
              ¿Necesitás algo a medida? Cotizá
            </Box>
          </Box>
        </Box>
      </Wrap>
    </Section>
  );
}
