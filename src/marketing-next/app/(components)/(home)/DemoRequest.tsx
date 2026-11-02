'use client';
import { useState, type FormEvent } from 'react';
import { Box, Typography } from '@mui/material';
import { trackDemoLead } from '../(sections)/SignupModal';
import { SALES_WA_URL } from '../WhatsAppFloat';
import { Accent, home, sans, titleSx } from './ui';

/** Endpoint público de sales-hub: crea el lead en el CRM (origen LandingForm) y arranca el seguimiento por WhatsApp. */
const LEADS_URL = 'https://api.sales.efcloud.tech/api/public/landing-leads';
const CALENDLY_URL = 'https://calendly.com/efcloud/demo';

export const SIZE_OPTIONS = ['Solo yo', '2 a 3 profesionales', '4 a 5 profesionales', '6 a 10 profesionales', 'Más de 10 profesionales'];
export const PLAN_OPTIONS = ['Gratuito', 'Plus', 'Advance', 'Pro', 'A medida', 'Todavía no sé'];

type Status = 'idle' | 'sending' | 'done' | 'error';

/** Lo que el backend normaliza mejor: dígitos con el 54 adelante (acepta 0/15 y el 9 de celular). */
function toArPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `54${digits}`;
}

const fieldSx = {
  width: '100%',
  boxSizing: 'border-box' as const,
  px: 1.75,
  py: 1.35,
  borderRadius: home.radiusSm,
  border: `1px solid ${home.lineStrong}`,
  bgcolor: '#fff',
  fontFamily: sans,
  fontSize: '1rem',
  color: home.ink,
  outline: 'none',
  appearance: 'none' as const,
  '&:focus': { borderColor: home.forest, boxShadow: `0 0 0 3px ${home.forestSoft}` },
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box component="label" sx={{ display: 'grid', gap: 0.75, fontFamily: sans, fontSize: '0.88rem', fontWeight: 600, color: home.ink }}>
      <span>
        {label}
        {required && <Box component="span" sx={{ color: home.coral }}> *</Box>}
      </span>
      {children}
    </Box>
  );
}

/**
 * Bloque "pedí una demo o cotizá" que abre la sección de precios (card #24): formulario a la
 * derecha, qué pasa después a la izquierda. El plan es controlado desde HomePricing para que la
 * tarjeta "A medida" lo pueda preseleccionar.
 */
export default function DemoRequest({ plan, onPlanChange }: { plan: string; onPlanChange: (p: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [business, setBusiness] = useState('');
  const [size, setSize] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || status === 'sending') return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productKey: 'turnospro',
          name: name.trim(),
          phone: toArPhone(phone),
          business: business.trim() || undefined,
          size: size || undefined,
          plan: plan || undefined,
          page: window.location.pathname,
          website,
        }),
      });
      if (res.status === 429) throw new Error('Recibimos varios pedidos desde tu conexión. Probá de nuevo en unos minutos.');
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || 'No pudimos enviar tu pedido.');
      trackDemoLead({ name: business.trim() || name.trim(), phone: toArPhone(phone) });
      setStatus('done');
    } catch (err) {
      setError((err as Error).message || 'No pudimos enviar tu pedido.');
      setStatus('error');
    }
  };

  return (
    <Box
      id="cotizar"
      sx={{
        scrollMarginTop: 96,
        display: 'grid',
        gap: { xs: 4, md: 6 },
        gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
        alignItems: 'center',
        p: { xs: 3, md: 5 },
        mb: { xs: 7, md: 10 },
        borderRadius: home.radius,
        bgcolor: home.card,
        border: `1px solid ${home.line}`,
      }}
    >
      <Box>
        <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
          ¿Lo querés ver con tu caso? <Accent>Pedí una demo o cotizá a medida.</Accent>
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 3, display: 'grid', gap: 1.5 }}>
          {[
            'Dejanos tus datos y te escribimos por WhatsApp para coordinar.',
            'Te mostramos la agenda, las señas y los recordatorios con tus servicios.',
            'Si tenés varias sucursales o muchos profesionales, te pasamos una propuesta a medida.',
          ].map((t) => (
            <Box component="li" key={t} sx={{ display: 'flex', gap: 1.25, fontFamily: sans, fontSize: '1rem', lineHeight: 1.5, color: home.inkSoft }}>
              <Box component="span" aria-hidden sx={{ color: home.forest, fontWeight: 700 }}>✓</Box>
              {t}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: home.radius, bgcolor: home.paperSoft, border: `1px solid ${home.line}`, boxShadow: home.shadow }}>
        {status === 'done' ? (
          <Box role="status" sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ ...titleSx, fontSize: '1.6rem' }}>¡Listo! Te escribimos por WhatsApp.</Typography>
            <Typography sx={{ mt: 1.5, fontFamily: sans, color: home.inkSoft, lineHeight: 1.5 }}>
              Si preferís, elegí vos el día y la hora de la demo.
            </Typography>
            <Box
              component="a"
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 3, display: 'inline-flex', px: 3, py: 1.3, borderRadius: 999, bgcolor: 'rgba(23,20,16,0.06)', color: home.ink, fontFamily: sans, fontWeight: 600, textDecoration: 'none', '&:hover': { bgcolor: 'rgba(23,20,16,0.11)' } }}
            >
              Elegir día y hora
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Field label="Nombre" required>
              <Box component="input" required autoComplete="name" value={name} onChange={(e: any) => setName(e.target.value)} sx={fieldSx} />
            </Field>
            <Field label="WhatsApp" required>
              <Box component="input" required type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345 6789" value={phone} onChange={(e: any) => setPhone(e.target.value)} sx={fieldSx} />
            </Field>
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Field label="Nombre del negocio">
                <Box component="input" autoComplete="organization" value={business} onChange={(e: any) => setBusiness(e.target.value)} sx={fieldSx} />
              </Field>
            </Box>
            <Field label="Profesionales">
              <Box component="select" value={size} onChange={(e: any) => setSize(e.target.value)} sx={fieldSx}>
                <option value="">Elegí</option>
                {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Box>
            </Field>
            <Field label="Plan de interés">
              <Box component="select" value={plan} onChange={(e: any) => onPlanChange(e.target.value)} sx={fieldSx}>
                <option value="">Elegí</option>
                {PLAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Box>
            </Field>
            {/* Honeypot: invisible para personas; si llega con texto, el backend lo descarta. */}
            <Box aria-hidden sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>
                Sitio web
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
              </label>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Box
                component="button"
                type="submit"
                disabled={!valid || status === 'sending'}
                sx={{
                  width: '100%',
                  py: 1.6,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: sans,
                  fontWeight: 600,
                  fontSize: '1.05rem',
                  bgcolor: home.forest,
                  color: home.paperSoft,
                  '&:hover': { bgcolor: home.forestDeep },
                  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                }}
              >
                {status === 'sending' ? 'Enviando…' : 'Quiero mi demo'}
              </Box>
              {status === 'error' && (
                <Typography role="alert" sx={{ mt: 1.5, fontFamily: sans, fontSize: '0.9rem', color: home.coralDeep, lineHeight: 1.5 }}>
                  {error}{' '}
                  <Box component="a" href={SALES_WA_URL} target="_blank" rel="noopener noreferrer" sx={{ color: home.forest, fontWeight: 600 }}>
                    Escribinos por WhatsApp
                  </Box>
                </Typography>
              )}
              <Typography sx={{ mt: 1.5, textAlign: 'center', fontFamily: sans, fontSize: '0.8rem', color: home.inkMute }}>
                Sin compromiso. Usamos tus datos solo para contactarte por la demo.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
