'use client';
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
 * Send a tracking event with the full metadata payload that CAPI needs to
 * hash identifiers and dedupe with the browser pixel.
 * Always includes sessionId/fbclid/UTMs/screen/lang so Meta Event Match Quality stays high.
 */
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
interface ModalState {
  businessName: string;
  email: string;
  mobile: string;
  password: string;
  busy: boolean;
  error: string;
}

const initialState: ModalState = {
  businessName: '',
  email: '',
  mobile: '',
  password: '',
  busy: false,
  error: '',
};

function SignupModalInner() {
  const { isOpen, close } = useSignupModalInternal();
  const [state, setState] = useState<ModalState>(initialState);
  const regFlowRef = useCallback(() => {
    // stored on window to survive re-renders
    if (typeof window !== 'undefined' && !(window as any).__regFlow) {
      (window as any).__regFlow = null;
    }
  }, []);
  regFlowRef();

  const startRegFlow = () => {
    (window as any).__regFlow = { started: Date.now(), actions: ['0s OPEN'], fieldTimes: {} as Record<string, number>, currentField: null as string | null, fieldStart: 0 };
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
    const sid = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('_track_sid') || '' : '';
    navigator.sendBeacon('/api/tracking/event', new Blob([JSON.stringify({
      eventType: 'RegisterFlow', url: window.location.href, name: summary.slice(0, 500),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop', sessionId: sid,
      utmSource: sessionStorage.getItem('utm_source') || undefined,
      utmMedium: sessionStorage.getItem('utm_medium') || undefined,
      utmCampaign: sessionStorage.getItem('utm_campaign') || undefined,
      referrer: document.referrer || undefined,
    })], { type: 'application/json' }));
  };

  const set = useCallback((patch: Partial<ModalState>) => setState((s) => ({ ...s, ...patch })), []);

  // Start flow tracking when modal opens
  useEffect(() => {
    if (isOpen) {
      startRegFlow();
      // Backend signal: user opened the signup modal (intent, not a lead yet).
      // Mirrored to Meta CAPI as nothing — OpenRegister is internal-only on the backend
      // (we don't want to inflate Lead counts with people who never type a single field).
      sendTrackingEvent('OpenRegister');
    }
  }, [isOpen]);

  const handleClose = () => {
    trackAction('CLOSE');
    sendRegFlow('ABANDONED');
    setState(initialState);
    close();
  };

  const formValid =
    state.businessName.trim().length >= 2 &&
    emailValid(state.email) &&
    state.mobile.trim().length >= 6 &&
    passwordValid(state.password);

  const handleSubmit = async () => {
    trackAction('TAP submit');
    set({ busy: true, error: '' });

    // Lead = qualified intent the moment the user commits with all fields filled.
    // Fired BEFORE the API call so Meta still gets the lead even if /registration/quick fails.
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
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Error al registrar. Intenta de nuevo.');
      }

      trackAction('SUBMIT_OK');
      sendRegFlow('COMPLETED');

      // CompleteRegistration to Meta — full identity for high Event Match Quality on CAPI.
      if (typeof window !== 'undefined' && (window as any).fbq) {
        const sid = sessionStorage.getItem('_track_sid') || '';
        (window as any).fbq('track', 'CompleteRegistration', {}, { eventID: sid ? `${sid}-CompleteRegistration` : undefined });
      }
      sendTrackingEvent('CompleteRegistration', {
        name: state.businessName,
        email: state.email,
        phone: state.mobile,
      });

      // Auto-login: redirect to the new tenant dashboard with the impersonation token.
      // The backend already returned redirectUrl with the token embedded.
      if (body.redirectUrl) {
        window.location.href = body.redirectUrl;
      } else {
        // Fallback shouldn't happen, but just in case
        set({ busy: false, error: 'Cuenta creada pero no pudimos redirigirte. Intentá iniciar sesión.' });
      }
    } catch (err: any) {
      trackAction(`SUBMIT_ERROR ${(err as Error).message?.slice(0, 30)}`);
      set({ error: err.message || 'Error inesperado', busy: false });
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="span">
          Creá tu cuenta gratis
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            7 días gratis. Sin tarjeta. Acceso inmediato a tu panel.
          </Typography>
          <TextField
            label="Nombre del negocio"
            placeholder="Mi Peluquería"
            value={state.businessName}
            onChange={(e) => set({ businessName: e.target.value })}
            onFocus={() => trackFocus('businessName')}
            onBlur={() => trackBlur('businessName')}
            fullWidth
            size="small"
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
            size="small"
          />
          <TextField
            label="WhatsApp / Celular"
            type="tel"
            placeholder="11 1234 5678"
            value={state.mobile}
            onChange={(e) => set({ mobile: e.target.value })}
            onFocus={() => trackFocus('mobile')}
            onBlur={() => trackBlur('mobile')}
            fullWidth
            size="small"
          />
          <TextField
            label="Contraseña"
            type="password"
            value={state.password}
            onChange={(e) => set({ password: e.target.value })}
            onFocus={() => trackFocus('password')}
            onBlur={() => trackBlur('password')}
            fullWidth
            size="small"
            helperText="Mínimo 8 caracteres"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          disabled={!formValid || state.busy}
          onClick={handleSubmit}
          startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {state.busy ? 'Creando cuenta...' : 'Empezar gratis'}
        </Button>
      </DialogActions>
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

  // Auto-open modal if ?register=true in URL
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
