'use client';
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { palette } from '@/app/(lib)/theme';

// --- Context ---
interface SignupModalContextValue {
  open: (prefilledSubdomain?: string) => void;
}

const SignupModalContext = createContext<SignupModalContextValue>({ open: () => {} });

export function useSignupModal() {
  return useContext(SignupModalContext);
}

// --- Helpers ---
function passwordValid(pwd: string): boolean {
  return pwd.length >= 8;
}

function emailValid(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

function sanitizeSubdomain(value: string): string {
  const normalized = value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const meta = document.querySelector('meta[name="api-base"]');
  const raw = meta?.getAttribute('content') || (window as any).__API_BASE || '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  const base = trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  return base;
}

function apiUrl(path: string): string {
  const base = getApiBase();
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  if (cleaned.startsWith('/api')) return `${base}${cleaned}`;
  return `${base}/api${cleaned}`;
}

/**
 * Atribución del anuncio para mandar EN el alta (no solo en el tracking): utm_* + utm_content
 * ({{ad.id}}) + fbclid + cookie _fbp. El backend la guarda en el tenant y la usa en Conversions
 * API cuando el negocio paga (Purchase/Subscribe con monto → ROAS en el Ads Manager).
 */
function getAttribution(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const read = (k: string) => params.get(k) || sessionStorage.getItem(k) || undefined;
    const cookie = (name: string) => {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : undefined;
    };
    let fbclid = read('fbclid');
    const fbc = cookie('_fbc'); // fb.1.<ts>.<fbclid>
    if (!fbclid && fbc) { const parts = fbc.split('.'); if (parts.length >= 4) fbclid = parts.slice(3).join('.'); }
    return {
      utmSource: read('utm_source'),
      utmMedium: read('utm_medium'),
      utmCampaign: read('utm_campaign'),
      utmContent: read('utm_content'),
      fbclid,
      fbp: cookie('_fbp'),
    };
  } catch {
    return {};
  }
}

function sendTrackingEvent(eventType: string, extra: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const sid = sessionStorage.getItem('_track_sid') || '';
    const fbclid = params.get('fbclid') || sessionStorage.getItem('fbclid') || undefined;
    fetch('/api/tracking/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        url: window.location.href,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        sessionId: sid,
        fbclid,
        utmSource: params.get('utm_source') || sessionStorage.getItem('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || sessionStorage.getItem('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || undefined,
        referrer: document.referrer || undefined,
        pageTitle: document.title,
        screenResolution: window.screen.width + 'x' + window.screen.height,
        language: navigator.language,
        ...extra,
      }),
    }).catch(() => {});
  } catch {}
}

function fbqTrack(event: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return;
  const sid = sessionStorage.getItem('_track_sid') || '';
  (window as any).fbq('track', event, {}, { eventID: sid ? `${sid}-${event}` : undefined });
}

// --- Países para el WhatsApp ---
export const PHONE_COUNTRIES = [
  { dial: '+54', label: 'Argentina (+54)', placeholder: '11 2345 6789' },
  { dial: '+598', label: 'Uruguay (+598)', placeholder: '99 123 456' },
  { dial: '+56', label: 'Chile (+56)', placeholder: '9 1234 5678' },
  { dial: '+55', label: 'Brasil (+55)', placeholder: '11 91234 5678' },
  { dial: '+52', label: 'México (+52)', placeholder: '55 1234 5678' },
  { dial: '+1', label: 'Estados Unidos (+1)', placeholder: '305 123 4567' },
];

// --- Tracking del flujo de registro (window.__regFlow) ---
// Vive fuera del componente porque el estado está en window: así el modal puede mandar el
// ABANDONED al cerrarse y el formulario embebido en la landing puede arrancar el flujo recién en
// la primera interacción (y no contar como "abrió el registro" a todo el que llega al pie).
type RegFlow = {
  started: number;
  actions: string[];
  fieldTimes: Record<string, number>;
  currentField: string | null;
  fieldStart: number;
  data: Record<string, string>;
};

function getRegFlow(): RegFlow | null {
  if (typeof window === 'undefined') return null;
  return ((window as any).__regFlow as RegFlow | null) ?? null;
}

function startRegFlow() {
  // Si había un flujo a medias (ej: tocó el formulario del pie y después abrió el modal del
  // header), lo cerramos como abandono para no perder lo que alcanzó a cargar.
  if (getRegFlow()) sendRegFlow('ABANDONED');
  (window as any).__regFlow = { started: Date.now(), actions: ['0s OPEN'], fieldTimes: {}, currentField: null, fieldStart: 0, data: {} } as RegFlow;
  sendTrackingEvent('OpenRegister');
}

function trackAction(action: string) {
  const f = getRegFlow(); if (!f) return;
  const t = Math.round((Date.now() - f.started) / 1000);
  f.actions.push(`${t}s ${action}`);
}

function trackFocus(field: string) {
  const f = getRegFlow(); if (!f) return;
  if (f.currentField) { f.fieldTimes[f.currentField] = (f.fieldTimes[f.currentField] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); }
  f.currentField = field; f.fieldStart = Date.now();
  trackAction(`FOCUS ${field}`);
}

function trackBlur(field: string) {
  const f = getRegFlow(); if (!f) return;
  if (f.currentField === field) { f.fieldTimes[field] = (f.fieldTimes[field] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); f.currentField = null; }
  trackAction(`BLUR ${field}`);
}

function setRegFlowData(data: Record<string, string>) {
  const f = getRegFlow();
  if (f) f.data = data;
}

function sendRegFlow(outcome: string) {
  const f = getRegFlow(); if (!f) return;
  (window as any).__regFlow = null;
  const total = Math.round((Date.now() - f.started) / 1000);
  if (f.currentField) { f.fieldTimes[f.currentField] = (f.fieldTimes[f.currentField] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); }
  f.actions.push(`${total}s ${outcome}`);
  const fields = Object.entries(f.fieldTimes).map(([k, v]) => `${k}:${v}s`).join(', ');
  const summary = `[${outcome}] ${total}s total | Campos: ${fields || 'ninguno'} | ${f.actions.join(' → ')}`;
  const d = f.data || {};
  const sid = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('_track_sid') || '' : '';
  navigator.sendBeacon('/api/tracking/event', new Blob([JSON.stringify({
    eventType: 'RegisterFlow', url: window.location.href, name: summary.slice(0, 500),
    // Datos parciales: lo que la persona alcanzó a cargar antes de abandonar/completar
    businessName: d.businessName?.trim() || undefined,
    fullName: d.fullName?.trim() || undefined,
    email: d.email?.trim() || undefined,
    phone: d.phone?.trim() || undefined,
    device: window.innerWidth < 768 ? 'mobile' : 'desktop', sessionId: sid,
    utmSource: sessionStorage.getItem('utm_source') || undefined,
    utmMedium: sessionStorage.getItem('utm_medium') || undefined,
    utmCampaign: sessionStorage.getItem('utm_campaign') || undefined,
    referrer: document.referrer || undefined,
  })], { type: 'application/json' }));
}

// --- Estado del formulario ---
// 'email' = flujo passwordless (default): nombre + email + WhatsApp → pedimos el código y mandamos
// a /register?email=..., la página de la app donde se ingresa el código (misma AuthShell que /login).
// 1/2 = flujo legacy con usuario y contraseña.
type Step = 'email' | 1 | 2;

interface FormState {
  step: Step;
  businessName: string;
  fullName: string;
  email: string;
  dial: string;
  mobile: string;
  password: string;
  busy: boolean;
  error: string;
  info: string;
}

const initialState: FormState = {
  step: 'email',
  businessName: '',
  fullName: '',
  email: '',
  dial: PHONE_COUNTRIES[0].dial,
  mobile: '',
  password: '',
  busy: false,
  error: '',
  info: '',
};

// --- Estilos compartidos ---
const titleSx = {
  fontFamily: 'var(--font-fraunces), serif',
  fontWeight: 600,
  fontSize: { xs: '1.5rem', sm: '1.75rem' },
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  color: palette.ink,
  mb: 0.8,
} as const;

const subtitleSx = { fontSize: '0.92rem', color: palette.inkSoft, mb: 2.5, lineHeight: 1.45 } as const;

const primaryButtonSx = {
  py: 1.5,
  fontSize: '1rem',
  fontWeight: 700,
  bgcolor: palette.ink,
  color: palette.paper,
  '&:hover': { bgcolor: palette.forest },
  '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.4)' },
} as const;

const linkButtonSx = {
  mt: 1.5,
  fontSize: '0.8rem',
  color: palette.inkSoft,
  textTransform: 'none',
  '&:hover': { background: 'transparent', color: palette.coral },
} as const;

const backButtonSx = {
  minWidth: 0,
  px: 0.8,
  py: 0.2,
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  color: palette.ink,
  textTransform: 'uppercase',
  fontFamily: 'var(--font-mono), monospace',
  '&:hover': { background: 'transparent', color: palette.coral },
} as const;

const finePrintSx = { fontSize: '0.78rem', color: palette.inkSoft, lineHeight: 1.45, textAlign: 'center' } as const;

function SocialProof({ mt = 2 }: { mt?: number }) {
  return (
    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt }}>
      <Box component="span" sx={{ color: palette.amber, letterSpacing: '0.1em' }}>★★★★★</Box>
      <Typography sx={{ fontSize: '0.78rem', color: palette.inkSoft }}>
        4.9/5 · +1.200 negocios
      </Typography>
    </Stack>
  );
}

export type SignupFormVariant = 'modal' | 'inline';

/**
 * Formulario de alta compartido por el modal (CTAs del header, hero y precios) y por la sección
 * #registro del final de la landing. Paso 'email': nombre del negocio + email + WhatsApp →
 * pedimos el código por email y saltamos a /register?email=..., donde se ingresa. Pasos 1/2:
 * alternativa legacy con usuario y contraseña.
 *
 * - 'modal': autofocus en el primer campo y el flujo de tracking arranca al montarse (= al abrir).
 * - 'inline': sin autofocus (haría scroll al pie de la página) y el tracking arranca en el primer
 *   foco, así solo cuenta a quien de verdad tocó el formulario.
 */
export function SignupForm({ variant }: { variant: SignupFormVariant }) {
  const isModal = variant === 'modal';
  const [state, setState] = useState<FormState>(initialState);
  const set = useCallback((patch: Partial<FormState>) => setState((s) => ({ ...s, ...patch })), []);

  const phoneCountry = PHONE_COUNTRIES.find((c) => c.dial === state.dial) ?? PHONE_COUNTRIES[0];
  const phoneDigits = state.mobile.replace(/[^0-9]/g, '');
  // Con prefijo internacional: el backend lo normaliza a +549... (o el país que corresponda).
  const fullPhone = phoneDigits ? `${state.dial} ${state.mobile.trim()}` : '';

  useEffect(() => {
    if (isModal) startRegFlow();
    // Si la persona cierra la pestaña/navega sin tocar la X, igual mandamos el abandono con lo
    // que haya cargado. sendRegFlow se anula a sí mismo, así que no duplica con el cierre del
    // modal ni con un registro completado.
    const onPageHide = () => sendRegFlow('ABANDONED');
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [isModal]);

  // Guardado parcial: vamos reflejando lo cargado en __regFlow.data para que el beacon (que se
  // dispara desde un handler global) tenga los valores actuales.
  useEffect(() => {
    setRegFlowData({ businessName: state.businessName, fullName: state.fullName, email: state.email, phone: fullPhone });
  }, [state.businessName, state.fullName, state.email, fullPhone]);

  const focus = (field: string) => {
    if (!isModal && !getRegFlow()) startRegFlow();
    trackFocus(field);
  };

  const subdomainPreview = useMemo(
    () => sanitizeSubdomain(state.businessName) || 'tunegocio',
    [state.businessName]
  );

  const businessNameValid = state.businessName.trim().length >= 2;
  const emailOk = emailValid(state.email.trim());
  const phoneValid = phoneDigits.length >= 8;
  const emailStepValid = businessNameValid && emailOk && phoneValid;
  const step1Valid = businessNameValid;
  const step2Valid = state.fullName.trim().length >= 2 && emailOk && phoneValid && passwordValid(state.password);

  // --- Código por email (passwordless) ---
  const requestOtp = async () => {
    if (!emailStepValid || state.busy) return;
    trackAction('TAP request_otp');
    set({ busy: true, error: '', info: '' });
    try {
      const res = await fetch(apiUrl('/registration/email/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email.trim(),
          businessName: state.businessName.trim(),
          phone: fullPhone,
          // La atribución viaja ya en el start: queda guardada en la transacción y el verify
          // la usa aunque la página del código no la tenga a mano.
          ...getAttribution(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'No pudimos enviar el código. Intentá de nuevo.');
      }
      trackAction(body.isExisting ? 'OTP_SENT_LOGIN' : 'OTP_SENT');
      // Lead solo para cuentas nuevas (un login no es un lead nuevo).
      if (!body.isExisting) {
        sendTrackingEvent('Lead', { name: state.businessName.trim(), email: state.email.trim(), phone: fullPhone });
        fbqTrack('Lead');
      }
      // El código se ingresa en la app: cerramos el flujo de la landing acá (no cuenta como
      // abandono) y llevamos a /register con el email fijo. busy queda en true: la página se va.
      sendRegFlow('CODE_SENT');
      window.location.href = body.state
        ? '/register?s=' + encodeURIComponent(body.state)
        : '/register?email=' + encodeURIComponent(state.email.trim());
    } catch (err: any) {
      trackAction(`OTP_ERROR ${(err as Error).message?.slice(0, 30)}`);
      set({ error: err.message || 'Error inesperado', busy: false });
    }
  };

  // --- Legacy: usuario y contraseña ---
  const goToStep2 = () => {
    if (!step1Valid) return;
    trackAction('STEP2');
    set({ step: 2 });
  };

  const goBackToStep1 = () => {
    trackAction('BACK');
    set({ step: 1 });
  };

  const handleSubmit = async () => {
    if (!step2Valid || state.busy) return;
    trackAction('TAP submit');
    set({ busy: true, error: '' });

    sendTrackingEvent('Lead', { name: state.businessName, email: state.email, phone: fullPhone });
    fbqTrack('Lead');

    try {
      const res = await fetch(apiUrl('/registration/quick'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
          businessName: state.businessName.trim(),
          mobile: fullPhone,
          fullName: state.fullName.trim(),
          ...getAttribution(),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Error al registrar. Intenta de nuevo.');
      }

      trackAction('SUBMIT_OK');
      sendRegFlow('COMPLETED');
      fbqTrack('CompleteRegistration');
      sendTrackingEvent('CompleteRegistration', { name: state.businessName, email: state.email, phone: fullPhone });

      if (body.redirectUrl) {
        window.location.href = body.redirectUrl;
      } else {
        set({ busy: false, error: 'Cuenta creada pero no pudimos redirigirte. Intentá iniciar sesión.' });
      }
    } catch (err: any) {
      trackAction(`SUBMIT_ERROR ${(err as Error).message?.slice(0, 30)}`);
      set({ error: err.message || 'Error inesperado', busy: false });
    }
  };

  const phoneRow = (
    <Stack direction="row" spacing={1}>
      <TextField
        select
        label="País"
        value={state.dial}
        onChange={(e) => set({ dial: e.target.value })}
        sx={{ minWidth: 132, flexShrink: 0 }}
        SelectProps={{ renderValue: (v) => String(v) }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <MenuItem key={c.dial} value={c.dial}>{c.label}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Tu WhatsApp"
        type="tel"
        placeholder={phoneCountry.placeholder}
        value={state.mobile}
        onChange={(e) => set({ mobile: e.target.value })}
        onFocus={() => focus('mobile')}
        onBlur={() => trackBlur('mobile')}
        inputProps={{ inputMode: 'tel', autoComplete: 'tel-national' }}
        fullWidth
      />
    </Stack>
  );

  return (
    <>
      {/* Indicador de pasos — solo para el flujo legacy con contraseña (pasos numéricos) */}
      {(state.step === 1 || state.step === 2) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2.5,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.66rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: palette.inkSoft,
          }}
        >
          {state.step === 2 && (
            <Button size="small" onClick={goBackToStep1} startIcon={<ArrowBackIcon fontSize="small" />} sx={backButtonSx}>
              Atrás
            </Button>
          )}
          <Box sx={{ flex: 1, display: 'flex', gap: 0.6, alignItems: 'center' }}>
            <Box sx={{ flex: 1, height: 3, bgcolor: palette.forest, borderRadius: 2 }} />
            <Box sx={{ flex: 1, height: 3, bgcolor: state.step === 2 ? palette.forest : 'rgba(0,0,0,0.1)', borderRadius: 2 }} />
          </Box>
          <Box component="span">Paso {state.step} de 2</Box>
        </Box>
      )}

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}
      {state.info && !state.error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {state.info}
        </Alert>
      )}

      {state.step === 'email' ? (
        <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); requestOtp(); }}>
          <Typography variant="h5" component="h3" sx={titleSx}>
            Creá tu cuenta gratis
          </Typography>
          <Typography sx={subtitleSx}>
            Sin contraseña: te mandamos un código por email. Después activás 7 días gratis con tu tarjeta en Mercado Pago y el primer cobro es recién al terminar la prueba.
          </Typography>

          <Stack spacing={2}>
            <Box>
              <TextField
                label="¿Cómo se llama tu negocio?"
                placeholder="Ej: Estudio Lila"
                value={state.businessName}
                onChange={(e) => set({ businessName: e.target.value })}
                onFocus={() => focus('businessName')}
                onBlur={() => trackBlur('businessName')}
                inputProps={{ autoComplete: 'organization' }}
                fullWidth
                autoFocus={isModal}
              />
              <Typography
                sx={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.72rem',
                  color: palette.inkSoft,
                  mt: 0.6,
                  opacity: state.businessName ? 1 : 0,
                  transition: 'opacity 200ms',
                }}
              >
                🌐 {subdomainPreview}.turnos-pro.com
              </Typography>
            </Box>
            <TextField
              label="Tu email"
              type="email"
              placeholder="tu@email.com"
              value={state.email}
              onChange={(e) => set({ email: e.target.value })}
              onFocus={() => focus('email')}
              onBlur={() => trackBlur('email')}
              inputProps={{ inputMode: 'email', autoComplete: 'email' }}
              fullWidth
            />
            {phoneRow}
          </Stack>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={!emailStepValid || state.busy}
            startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ ...primaryButtonSx, mt: 2.5 }}
          >
            {state.busy ? 'Enviando código...' : 'Empezar gratis 7 días'}
          </Button>

          <Typography sx={{ ...finePrintSx, mt: 1.5 }}>
            Te mandamos un código de 6 dígitos a tu email para confirmar. Después activás la prueba con
            tu tarjeta (hoy no se cobra nada) y armás tu agenda: rubro, servicios y horarios.
          </Typography>

          <Button
            fullWidth
            onClick={() => { trackAction('SWITCH_PASSWORD'); set({ step: 1, error: '', info: '' }); }}
            sx={{ ...linkButtonSx, mt: 0.5 }}
          >
            Prefiero crear usuario y contraseña
          </Button>

          <SocialProof mt={1} />
        </Box>
      ) : state.step === 1 ? (
        <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); goToStep2(); }}>
          <Typography variant="h5" component="h3" sx={{ ...titleSx, fontSize: { xs: '1.6rem', sm: '1.85rem' }, mb: 1 }}>
            Activá tu negocio en 2 minutos
          </Typography>
          <Typography sx={{ ...subtitleSx, mb: 3 }}>
            Gratis 7 días · Primer cobro al día 8 · Listo al instante
          </Typography>

          <TextField
            label="¿Cómo se llama tu negocio?"
            placeholder="Ej: Estudio Lila"
            value={state.businessName}
            onChange={(e) => set({ businessName: e.target.value })}
            onFocus={() => focus('businessName')}
            onBlur={() => trackBlur('businessName')}
            fullWidth
            autoFocus
            sx={{ mb: 1 }}
          />
          <Typography
            sx={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.72rem',
              color: palette.inkSoft,
              mb: 2.5,
              opacity: state.businessName ? 1 : 0,
              transition: 'opacity 200ms',
            }}
          >
            🌐 {subdomainPreview}.turnos-pro.com
          </Typography>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={!step1Valid} sx={primaryButtonSx}>
            Continuar →
          </Button>

          <SocialProof mt={3} />
        </Box>
      ) : (
        <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <Typography variant="h5" component="h3" sx={titleSx}>
            Último paso,{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>
              {state.businessName.trim()}
            </Box>
          </Typography>
          <Typography sx={subtitleSx}>
            Tu sitio estará listo en 10 segundos
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Tu nombre"
              placeholder="Ej: Juana García"
              value={state.fullName}
              onChange={(e) => set({ fullName: e.target.value })}
              onFocus={() => focus('fullName')}
              onBlur={() => trackBlur('fullName')}
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={state.email}
              onChange={(e) => set({ email: e.target.value })}
              onFocus={() => focus('email')}
              onBlur={() => trackBlur('email')}
              fullWidth
            />
            {phoneRow}
            <TextField
              label="Contraseña"
              type="password"
              value={state.password}
              onChange={(e) => set({ password: e.target.value })}
              onFocus={() => focus('password')}
              onBlur={() => trackBlur('password')}
              fullWidth
              helperText="Mínimo 8 caracteres"
            />
          </Stack>

          <Box
            sx={{
              mt: 2.5,
              px: 1.6,
              py: 1.2,
              bgcolor: palette.paperSoft,
              border: `1.5px dashed ${palette.ink}`,
              borderRadius: 1.5,
              textAlign: 'center',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.82rem',
              color: palette.ink,
              letterSpacing: '0.02em',
            }}
          >
            🌐{' '}
            <Box component="span" sx={{ color: palette.coral, fontWeight: 600 }}>
              {subdomainPreview}
            </Box>
            <Box component="span" sx={{ color: palette.inkSoft }}>
              .turnos-pro.com
            </Box>
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={!step2Valid || state.busy}
            startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ ...primaryButtonSx, mt: 2.5 }}
          >
            {state.busy ? 'Creando cuenta...' : 'Crear mi cuenta'}
          </Button>

          <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.7} sx={{ mt: 2 }}>
            <LockOutlinedIcon sx={{ fontSize: '0.95rem', color: palette.inkSoft }} />
            <Typography sx={{ fontSize: '0.76rem', color: palette.inkSoft }}>
              Sin cargos hasta el día 8. Cancelás cuando quieras.
            </Typography>
          </Stack>
        </Box>
      )}
    </>
  );
}

// --- Modal ---
function SignupModalInner() {
  const { isOpen, close } = useSignupModalInternal();

  // El Dialog desmonta el formulario al cerrarse, así que el estado se resetea solo.
  const handleClose = () => {
    trackAction('CLOSE');
    sendRegFlow('ABANDONED');
    close();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: `1.5px solid ${palette.ink}`,
          boxShadow: `8px 8px 0 ${palette.ink}`,
          overflow: 'hidden',
        },
      }}
    >
      {/* Top promo ribbon */}
      <Box
        sx={{
          bgcolor: palette.amber,
          color: palette.ink,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.68rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'center',
          py: 0.9,
          fontWeight: 700,
        }}
      >
        ⚡ 7 DÍAS GRATIS · PRIMER COBRO AL DÍA 8 · LISTO EN 2 MIN
      </Box>

      {/* Close button */}
      <IconButton
        onClick={handleClose}
        size="small"
        sx={{ position: 'absolute', top: 38, right: 10, zIndex: 2, color: palette.inkSoft }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: { xs: 3, sm: 4 }, py: { xs: 3, sm: 3.5 } }}>
        <SignupForm variant="modal" />
      </DialogContent>
    </Dialog>
  );
}

// --- Internal context for open/close state ---
interface InternalContextValue {
  isOpen: boolean;
  close: () => void;
}

const InternalContext = createContext<InternalContextValue>({
  isOpen: false,
  close: () => {},
});

function useSignupModalInternal() {
  return useContext(InternalContext);
}

// --- Provider ---
export function SignupModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  useState(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // ?register=true abre el modal en el paso del email. El link del mail con el código
    // ya no pasa por acá: va directo a /register?email=... en la app.
    if (params.get('register') === 'true') {
      setIsOpen(true);
    }
  });

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SignupModalContext.Provider value={{ open }}>
      <InternalContext.Provider value={{ isOpen, close }}>
        {children}
        <SignupModalInner />
      </InternalContext.Provider>
    </SignupModalContext.Provider>
  );
}
