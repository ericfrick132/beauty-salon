'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SignupModalProvider, useSignupModal } from '@/app/(components)/(sections)/SignupModal';
import Header from '@/app/(components)/Header';
import Footer from '@/app/(components)/Footer';
import { apiUrl } from '@/app/(lib)/countries';
import { palette } from '@/app/(lib)/theme';

interface PromoPlan {
  code: string;
  name: string;
  price: number;
  discountedPrice: number;
  currency: string;
}

interface ActivePromo {
  slug: string;
  code: string;
  title: string;
  headline?: string | null;
  subheadline?: string | null;
  bullets?: string[] | null;
  description?: string | null;
  discountPercent: number;
  durationMonths?: number | null;
  endsAt: string;
  imageUrl?: string | null;
  imageCredit?: string | null;
  plans: PromoPlan[];
}

interface CouponCheck {
  isValid: boolean;
  originalPrice?: number;
  finalPrice?: number;
  durationMonths?: number | null;
  message?: string | null;
}

const AR_TZ = 'America/Argentina/Buenos_Aires';

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString('es-AR')}`;
  }
}

function formatDayMonth(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: AR_TZ }).format(new Date(iso));
  } catch {
    return '';
  }
}

function monthsLabel(n?: number | null): string {
  if (!n) return '';
  return n === 1 ? 'el primer mes' : `los primeros ${n} meses`;
}

function formatPercent(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

/** Lee la query actual (para CTAs, redirect y prellenar el código). */
function currentParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function PromoContent() {
  const { open } = useSignupModal();
  const [promo, setPromo] = useState<ActivePromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CouponCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = currentParams();
    const slug = params.get('slug') || params.get('promo') || '';
    const url = apiUrl(`/promos/active${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`);
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          // Sin promo vigente: a la home conservando la query (UTMs incluidos).
          const qs = params.toString();
          window.location.replace(`/${qs ? `?${qs}` : ''}`);
          return;
        }
        const data = (await res.json()) as ActivePromo;
        if (cancelled) return;

        // utm_campaign = slug de la promo: con eso el alta queda atada al cupón (el backend lo guarda en
        // el negocio y lo aplica cuando se suscribe).
        if (!params.get('utm_campaign')) {
          params.set('utm_campaign', data.slug);
          try {
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
          } catch { /* sin history */ }
        }
        try {
          sessionStorage.setItem('utm_campaign', params.get('utm_campaign') || data.slug);
          sessionStorage.setItem('promo_code', data.code);
        } catch { /* sin storage */ }

        setPromo(data);
        setCodeInput((params.get('cupon') || data.code || '').toUpperCase());
        const preferred = data.plans.find((p) => p.code === 'pro') ?? data.plans[0];
        setPlanCode(preferred?.code ?? '');
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const copyCode = useCallback(async () => {
    if (!promo) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* sin portapapeles */ }
  }, [promo]);

  const validate = useCallback(async () => {
    const code = codeInput.trim();
    if (!code || !planCode) return;
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch(apiUrl(`/registration/validate-coupon?code=${encodeURIComponent(code)}&planCode=${encodeURIComponent(planCode)}`));
      const data = (await res.json()) as CouponCheck;
      setCheck(data);
    } catch {
      setCheck({ isValid: false, message: 'No pudimos validar el código. Probá de nuevo en un rato.' });
    } finally {
      setChecking(false);
    }
  }, [codeInput, planCode]);

  // Validación automática una vez que hay promo y plan elegido.
  useEffect(() => {
    if (promo && planCode && codeInput && check === null && !checking) void validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo, planCode]);

  const selectedPlan = useMemo(() => promo?.plans.find((p) => p.code === planCode), [promo, planCode]);

  const startSignup = useCallback((code?: string) => {
    try {
      if (code) sessionStorage.setItem('_selected_plan', code);
    } catch { /* sin storage */ }
    open();
  }, [open]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!promo) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>No pudimos cargar la promo</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Revisá tu conexión y volvé a intentar.</Typography>
        <Button variant="contained" href="/">Ir a TurnosPro</Button>
      </Container>
    );
  }

  const months = promo.durationMonths ?? null;
  const badge = `${formatPercent(promo.discountPercent)}% OFF ${monthsLabel(months)}`.trim();
  const until = formatDayMonth(promo.endsAt);
  const headline = promo.headline || promo.title;
  const bullets = (promo.bullets ?? []).filter(Boolean);

  const cta = (label = 'Quiero la promo', planForSignup?: string) => (
    <Button
      variant="contained"
      color="secondary"
      size="large"
      onClick={() => startSignup(planForSignup)}
      sx={{ px: 4, py: 1.5, fontWeight: 700, fontSize: '1.05rem', borderRadius: 2, boxShadow: `4px 4px 0 ${palette.ink}` }}
    >
      {label}
    </Button>
  );

  return (
    <>
      {/* 1. Hero */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          color: '#fff',
          minHeight: { xs: 460, md: 560 },
          display: 'flex',
          alignItems: 'center',
          bgcolor: palette.ink,
          backgroundImage: promo.imageUrl
            ? `linear-gradient(180deg, rgba(23,20,16,0.55) 0%, rgba(23,20,16,0.78) 100%), url("${promo.imageUrl}")`
            : `linear-gradient(135deg, ${palette.forestDeep} 0%, ${palette.ink} 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Container maxWidth="md" sx={{ py: { xs: 8, md: 10 }, textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: palette.amber,
              color: palette.ink,
              fontFamily: 'var(--font-mono), monospace',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize: { xs: '0.75rem', md: '0.85rem' },
              px: 2,
              py: 0.75,
              borderRadius: 1,
              mb: 3,
            }}
          >
            {badge}
          </Box>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '2.3rem', md: '3.6rem' }, mb: 2.5, color: '#fff' }}>
            {headline}
          </Typography>
          {promo.subheadline && (
            <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.25rem' }, maxWidth: 640, mx: 'auto', mb: 4, color: 'rgba(255,255,255,0.88)' }}>
              {promo.subheadline}
            </Typography>
          )}
          {cta()}
        </Container>
      </Box>

      {/* 2. Código + validación */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            border: `1.5px solid ${palette.ink}`,
            borderRadius: 3,
            boxShadow: `6px 6px 0 ${palette.ink}`,
            bgcolor: palette.paperSoft,
            p: { xs: 3, md: 4 },
          }}
        >
          <Typography sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.inkSoft, mb: 1.5 }}>
            Tu código de descuento
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 4 }}>
            <Box
              sx={{
                flex: 1,
                border: `2px dashed ${palette.forest}`,
                borderRadius: 2,
                py: 2,
                px: 3,
                textAlign: 'center',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: { xs: '1.8rem', md: '2.4rem' },
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: palette.forestDeep,
                wordBreak: 'break-all',
              }}
            >
              {promo.code}
            </Box>
            <Button variant="outlined" size="large" onClick={copyCode} sx={{ minWidth: 140, py: 1.5, borderWidth: 1.5 }}>
              {copied ? 'Copiado' : 'Copiar código'}
            </Button>
          </Stack>

          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Validá tu código</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Código"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCheck(null); }}
              inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
              sx={{ flex: 1 }}
            />
            {promo.plans.length > 1 && (
              <TextField
                select
                label="Plan"
                value={planCode}
                onChange={(e) => { setPlanCode(e.target.value); setCheck(null); }}
                sx={{ minWidth: { sm: 220 } }}
              >
                {promo.plans.map((p) => (
                  <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Button variant="contained" onClick={validate} disabled={checking || !codeInput.trim() || !planCode} sx={{ minWidth: 120 }}>
              {checking ? <CircularProgress size={22} color="inherit" /> : 'Validar'}
            </Button>
          </Stack>
          {check && (
            check.isValid && check.originalPrice != null && check.finalPrice != null ? (
              <Box sx={{ mt: 1 }}>
                <Typography component="div" sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box component="span" sx={{ textDecoration: 'line-through', color: palette.inkMute, fontSize: '1.1rem' }}>
                    {formatMoney(check.originalPrice, selectedPlan?.currency ?? 'ARS')}
                  </Box>
                  <Box component="span" sx={{ fontSize: '1.8rem', fontWeight: 700, color: palette.forestDeep }}>
                    {formatMoney(check.finalPrice, selectedPlan?.currency ?? 'ARS')}
                  </Box>
                  <Box component="span" sx={{ color: palette.inkSoft }}>
                    por mes{check.durationMonths ? `, ${monthsLabel(check.durationMonths)}` : ''}
                  </Box>
                </Typography>
                <Typography sx={{ color: palette.forest, fontWeight: 600, mt: 0.5 }}>Código válido{selectedPlan ? ` para ${selectedPlan.name}` : ''}.</Typography>
              </Box>
            ) : (
              <Typography sx={{ color: palette.coralDeep, fontWeight: 600 }}>{check.message || 'Ese código no es válido.'}</Typography>
            )
          )}
        </Box>
      </Container>

      {/* 3. Beneficios */}
      {bullets.length > 0 && (
        <Box component="section" sx={{ bgcolor: palette.paperDeep, py: { xs: 6, md: 8 } }}>
          <Container maxWidth="md">
            <Typography variant="h3" component="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, mb: 4 }}>
              Qué te llevás
            </Typography>
            <Stack spacing={2}>
              {bullets.map((b) => (
                <Stack key={b} direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ mt: '0.55em', width: 10, height: 10, flexShrink: 0, borderRadius: '50%', bgcolor: palette.forest }} />
                  <Typography sx={{ fontSize: '1.1rem' }}>{b}</Typography>
                </Stack>
              ))}
            </Stack>
          </Container>
        </Box>
      )}

      {/* 4. Planes */}
      {promo.plans.length > 0 && (
        <Container maxWidth="lg" component="section" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography variant="h3" component="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, mb: 1.5, textAlign: 'center' }}>
            Así te queda cada plan
          </Typography>
          <Typography sx={{ textAlign: 'center', color: palette.inkSoft, mb: 5 }}>
            Precio normal tachado y lo que pagás con el código {promo.code}.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: `repeat(${Math.min(promo.plans.length, 4)}, 1fr)` },
            }}
          >
            {promo.plans.map((plan) => (
              <Box
                key={plan.code}
                sx={{
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 3,
                  bgcolor: palette.paperSoft,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>{plan.name}</Typography>
                <Typography sx={{ textDecoration: 'line-through', color: palette.inkMute }}>
                  {formatMoney(plan.price, plan.currency)} / mes
                </Typography>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: palette.forestDeep, lineHeight: 1.2 }}>
                  {formatMoney(plan.discountedPrice, plan.currency)}
                  <Box component="span" sx={{ fontSize: '1rem', fontWeight: 500, color: palette.inkSoft }}> / mes</Box>
                </Typography>
                <Typography sx={{ color: palette.inkSoft, mt: 1, mb: 3, flex: 1 }}>
                  {months
                    ? `por ${months === 1 ? '1 mes' : `${months} meses`}, después ${formatMoney(plan.price, plan.currency)} por mes`
                    : 'mientras mantengas la suscripción'}
                </Typography>
                <Button variant="contained" onClick={() => startSignup(plan.code)} sx={{ fontWeight: 700 }}>
                  Quiero la promo
                </Button>
              </Box>
            ))}
          </Box>
        </Container>
      )}

      {/* 5. Condiciones */}
      <Container maxWidth="md" component="section" sx={{ pb: { xs: 6, md: 8 } }}>
        <Box sx={{ borderTop: `1px solid ${palette.ink}`, pt: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Condiciones</Typography>
          <Stack component="ul" spacing={1} sx={{ pl: 2.5, m: 0, color: palette.inkSoft }}>
            {until && <li>Válido para cuentas creadas hasta el {until}.</li>}
            <li>
              {formatPercent(promo.discountPercent)}% de descuento en {months ? `${monthsLabel(months)} de tu suscripción` : 'tu suscripción'}
              {months ? '; después pagás el precio normal del plan.' : '.'}
            </li>
            <li>Creá tu cuenta desde esta página y el código queda guardado: se aplica solo al débito automático de Mercado Pago cuando elegís tu plan.</li>
            <li>Sin permanencia: cancelás cuando quieras.</li>
          </Stack>
          {promo.description && (
            <Typography sx={{ mt: 3, color: palette.inkSoft }}>{promo.description}</Typography>
          )}
        </Box>
      </Container>

      {/* 6. CTA final */}
      <Box component="section" sx={{ bgcolor: palette.forestDeep, color: palette.paper, py: { xs: 7, md: 9 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h3" component="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, mb: 2, color: palette.paper }}>
            {badge}
          </Typography>
          <Typography sx={{ mb: 4, color: 'rgba(244,239,230,0.85)' }}>
            Usá el código {promo.code}{until ? ` antes del ${until}` : ''}.
          </Typography>
          {cta()}
        </Container>
      </Box>

      {promo.imageCredit && (
        <Typography component="p" sx={{ textAlign: 'center', fontSize: '0.72rem', color: palette.inkMute, py: 1.5 }}>
          {promo.imageCredit}
        </Typography>
      )}
    </>
  );
}

export default function PromoClient() {
  return (
    <SignupModalProvider>
      <Header />
      <main>
        <PromoContent />
      </main>
      <Footer />
    </SignupModalProvider>
  );
}
