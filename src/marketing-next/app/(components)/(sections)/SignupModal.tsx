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

// --- Component ---
type Step = 1 | 2;

interface ModalState {
  step: Step;
  businessName: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  busy: boolean;
  error: string;
}

const initialState: ModalState = {
  step: 1,
  businessName: '',
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  busy: false,
  error: '',
};

function SignupModalInner() {
  const { isOpen, close } = useSignupModalInternal();
  const [state, setState] = useState<ModalState>(initialState);

  const startRegFlow = () => {
    (window as any).__regFlow = { started: Date.now(), actions: ['0s OPEN'], fieldTimes: {} as Record<string, number>, currentField: null as string | null, fieldStart: 0, data: {} as Record<string, string> };
  };
  const trackAction = (action: string) => {
    const f = (window as any).__regFlow; if (!f) return;
    const t = Math.round((Date.now() - f.started) / 1000);
    f.actions.push(`${t}s ${action}`);
  };
  const trackFocus = (field: string) => {
    const f = (window as any).__regFlow; if (!f) return;
    if (f.currentField) { f.fieldTimes[f.currentField] = (f.fieldTimes[f.currentField] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); }
    f.currentField = field; f.fieldStart = Date.now();
    trackAction(`FOCUS ${field}`);
  };
  const trackBlur = (field: string) => {
    const f = (window as any).__regFlow; if (!f) return;
    if (f.currentField === field) { f.fieldTimes[field] = (f.fieldTimes[field] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); f.currentField = null; }
    trackAction(`BLUR ${field}`);
  };
  const sendRegFlow = (outcome: string) => {
    const f = (window as any).__regFlow; if (!f) return;
    (window as any).__regFlow = null;
    const total = Math.round((Date.now() - f.started) / 1000);
    if (f.currentField) { f.fieldTimes[f.currentField] = (f.fieldTimes[f.currentField] || 0) + Math.round((Date.now() - f.fieldStart) / 1000); }
    f.actions.push(`${total}s ${outcome}`);
    const fields = Object.entries(f.fieldTimes).map(([k, v]) => `${k}:${v}s`).join(', ');
    const summary = `[${outcome}] ${total}s total | Campos: ${fields || 'ninguno'} | ${f.actions.join(' → ')}`;
    const d = (f.data || {}) as Record<string, string>;
    const sid = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('_track_sid') || '' : '';
    navigator.sendBeacon('/api/tracking/event', new Blob([JSON.stringify({
      eventType: 'RegisterFlow', url: window.location.href, name: summary.slice(0, 500),
      // Datos parciales: lo que la persona alcanzó a cargar antes de abandonar/completar
      businessName: d.businessName?.trim() || undefined,
      fullName: d.fullName?.trim() || undefined,
      email: d.email?.trim() || undefined,
      phone: d.mobile?.trim() || undefined,
      device: window.innerWidth < 768 ? 'mobile' : 'desktop', sessionId: sid,
      utmSource: sessionStorage.getItem('utm_source') || undefined,
      utmMedium: sessionStorage.getItem('utm_medium') || undefined,
      utmCampaign: sessionStorage.getItem('utm_campaign') || undefined,
      referrer: document.referrer || undefined,
    })], { type: 'application/json' }));
  };

  const set = useCallback((patch: Partial<ModalState>) => setState((s) => ({ ...s, ...patch })), []);

  useEffect(() => {
    if (!isOpen) return;
    startRegFlow();
    sendTrackingEvent('OpenRegister');
    // Si la persona cierra la pestaña/navega sin tocar la X, igual mandamos
    // el abandono con lo que haya cargado. sendRegFlow se anula a sí mismo,
    // así que no duplica con handleClose ni con un registro completado.
    const onPageHide = () => sendRegFlow('ABANDONED');
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [isOpen]);

  // Guardado parcial: vamos reflejando lo cargado en __regFlow.data para que el
  // beacon (que se dispara desde un handler global) tenga los valores actuales.
  useEffect(() => {
    const f = (window as any).__regFlow;
    if (f) f.data = { businessName: state.businessName, fullName: state.fullName, email: state.email, mobile: state.mobile };
  }, [state.businessName, state.fullName, state.email, state.mobile]);

  const handleClose = () => {
    trackAction('CLOSE');
    sendRegFlow('ABANDONED');
    setState(initialState);
    close();
  };

  const subdomainPreview = useMemo(
    () => sanitizeSubdomain(state.businessName) || 'tunegocio',
    [state.businessName]
  );

  const step1Valid = state.businessName.trim().length >= 2;
  const step2Valid =
    state.fullName.trim().length >= 2 &&
    emailValid(state.email) &&
    state.mobile.trim().length >= 6 &&
    passwordValid(state.password);

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
    trackAction('TAP submit');
    set({ busy: true, error: '' });

    sendTrackingEvent('Lead', {
      name: state.businessName,
      email: state.email,
      phone: state.mobile,
    });
    if (typeof window !== 'undefined' && (window as any).fbq) {
      const sid = sessionStorage.getItem('_track_sid') || '';
      (window as any).fbq('track', 'Lead', {}, { eventID: sid ? `${sid}-Lead` : undefined });
    }

    try {
      const res = await fetch(apiUrl('/registration/quick'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
          businessName: state.businessName.trim(),
          mobile: state.mobile.trim(),
          fullName: state.fullName.trim(),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Error al registrar. Intenta de nuevo.');
      }

      trackAction('SUBMIT_OK');
      sendRegFlow('COMPLETED');

      if (typeof window !== 'undefined' && (window as any).fbq) {
        const sid = sessionStorage.getItem('_track_sid') || '';
        (window as any).fbq('track', 'CompleteRegistration', {}, { eventID: sid ? `${sid}-CompleteRegistration` : undefined });
      }
      sendTrackingEvent('CompleteRegistration', {
        name: state.businessName,
        email: state.email,
        phone: state.mobile,
      });

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
        ⚡ 7 DÍAS GRATIS · SIN TARJETA · LISTO EN 2 MIN
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
        {/* Step indicator */}
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
            <Button
              size="small"
              onClick={goBackToStep1}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{
                minWidth: 0,
                px: 0.8,
                py: 0.2,
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                color: palette.ink,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono), monospace',
                '&:hover': { background: 'transparent', color: palette.coral },
              }}
            >
              Atrás
            </Button>
          )}
          <Box sx={{ flex: 1, display: 'flex', gap: 0.6, alignItems: 'center' }}>
            <Box
              sx={{
                flex: 1,
                height: 3,
                bgcolor: state.step >= 1 ? palette.forest : 'rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            />
            <Box
              sx={{
                flex: 1,
                height: 3,
                bgcolor: state.step >= 2 ? palette.forest : 'rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            />
          </Box>
          <Box component="span">Paso {state.step} de 2</Box>
        </Box>

        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {state.step === 1 ? (
          <>
            <Typography
              variant="h5"
              component="h3"
              sx={{
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 600,
                fontSize: { xs: '1.6rem', sm: '1.85rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: palette.ink,
                mb: 1,
              }}
            >
              Activá tu negocio en 2 minutos
            </Typography>
            <Typography
              sx={{
                fontSize: '0.92rem',
                color: palette.inkSoft,
                mb: 3,
                lineHeight: 1.45,
              }}
            >
              Gratis 7 días · Sin tarjeta · Listo para usar al instante
            </Typography>

            <TextField
              label="¿Cómo se llama tu negocio?"
              placeholder="Ej: Estudio Lila"
              value={state.businessName}
              onChange={(e) => set({ businessName: e.target.value })}
              onFocus={() => trackFocus('businessName')}
              onBlur={() => trackBlur('businessName')}
              onKeyDown={(e) => { if (e.key === 'Enter' && step1Valid) goToStep2(); }}
              fullWidth
              autoFocus
              sx={{ mb: 1 }}
            />
            {/* Antes mostrábamos acá el preview de la URL pública
                (xxx.turnos-pro.com). El tracking mostró que el 100% de los
                abandonos del registro pasaban en este primer campo, sin cargar
                datos: el preview de una URL "definitiva" disparaba ansiedad de
                compromiso en gente que recién llega de un ad de Instagram.
                Lo reemplazamos por una microcopy que baja la presión: es solo
                el nombre y se puede cambiar todo después. La URL se sigue
                generando sola y se confirma recién en el paso 2. */}
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: palette.inkSoft,
                mb: 2.5,
                lineHeight: 1.4,
              }}
            >
              Solo el nombre para empezar. Después podés personalizar tu link y
              todo lo demás.
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!step1Valid}
              onClick={goToStep2}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                bgcolor: palette.ink,
                color: palette.paper,
                '&:hover': { bgcolor: palette.forest },
                '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.4)' },
              }}
            >
              Continuar →
            </Button>

            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 3 }}>
              <Box component="span" sx={{ color: palette.amber, letterSpacing: '0.1em' }}>★★★★★</Box>
              <Typography sx={{ fontSize: '0.78rem', color: palette.inkSoft }}>
                4.9/5 · +1.200 negocios
              </Typography>
            </Stack>
          </>
        ) : (
          <>
            <Typography
              variant="h5"
              component="h3"
              sx={{
                fontFamily: 'var(--font-fraunces), serif',
                fontWeight: 600,
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: palette.ink,
                mb: 0.8,
              }}
            >
              Último paso,{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>
                {state.businessName.trim()}
              </Box>
            </Typography>
            <Typography
              sx={{
                fontSize: '0.92rem',
                color: palette.inkSoft,
                mb: 2.5,
                lineHeight: 1.45,
              }}
            >
              Tu sitio estará listo en 10 segundos
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Tu nombre"
                placeholder="Ej: Juana García"
                value={state.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                onFocus={() => trackFocus('fullName')}
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
                onFocus={() => trackFocus('email')}
                onBlur={() => trackBlur('email')}
                fullWidth
              />
              <TextField
                label="WhatsApp"
                type="tel"
                placeholder="11 1234 5678"
                value={state.mobile}
                onChange={(e) => set({ mobile: e.target.value })}
                onFocus={() => trackFocus('mobile')}
                onBlur={() => trackBlur('mobile')}
                fullWidth
              />
              <TextField
                label="Contraseña"
                type="password"
                value={state.password}
                onChange={(e) => set({ password: e.target.value })}
                onFocus={() => trackFocus('password')}
                onBlur={() => trackBlur('password')}
                onKeyDown={(e) => { if (e.key === 'Enter' && step2Valid && !state.busy) handleSubmit(); }}
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
            <Typography
              sx={{ fontSize: '0.72rem', color: palette.inkSoft, textAlign: 'center', mt: 0.8 }}
            >
              Podés cambiar tu link cuando quieras
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!step2Valid || state.busy}
              onClick={handleSubmit}
              startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{
                mt: 2.5,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                bgcolor: palette.ink,
                color: palette.paper,
                '&:hover': { bgcolor: palette.forest },
                '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.4)' },
              }}
            >
              {state.busy ? 'Creando cuenta...' : 'Crear mi cuenta'}
            </Button>

            <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.7} sx={{ mt: 2 }}>
              <LockOutlinedIcon sx={{ fontSize: '0.95rem', color: palette.inkSoft }} />
              <Typography sx={{ fontSize: '0.76rem', color: palette.inkSoft }}>
                Sin cargos. Cancelás cuando quieras.
              </Typography>
            </Stack>
          </>
        )}
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
