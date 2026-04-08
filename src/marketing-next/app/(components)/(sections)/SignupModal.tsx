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
import EmailIcon from '@mui/icons-material/Email';

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

// --- Component ---
interface ModalState {
  step: 'form' | 'sent';
  email: string;
  password: string;
  confirmPassword: string;
  busy: boolean;
  error: string;
  devConfirmUrl: string;
}

const initialState: ModalState = {
  step: 'form',
  email: '',
  password: '',
  confirmPassword: '',
  busy: false,
  error: '',
  devConfirmUrl: '',
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
    if (isOpen) startRegFlow();
  }, [isOpen]);

  const handleClose = () => {
    trackAction('CLOSE');
    sendRegFlow('ABANDONED');
    setState(initialState);
    close();
  };

  const formValid =
    emailValid(state.email) && passwordValid(state.password) && state.password === state.confirmPassword;

  const handleSubmit = async () => {
    trackAction('TAP submit');
    set({ busy: true, error: '' });
    try {
      const res = await fetch(apiUrl('/registration/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
          confirmPassword: state.confirmPassword,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.message || 'Error al registrar. Intenta de nuevo.');
      }

      trackAction('SUBMIT_OK');
      sendRegFlow('COMPLETED');
      set({
        step: 'sent',
        busy: false,
        devConfirmUrl: body.devConfirmUrl || '',
      });

      // Track registration with Meta Pixel
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'CompleteRegistration');
      }

      // Track in our DB
      try {
        const params = new URLSearchParams(window.location.search);
        fetch('/api/tracking/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'CompleteRegistration',
            url: window.location.href,
            email: state.email,
            utmSource: params.get('utm_source') || sessionStorage.getItem('utm_source') || undefined,
            utmMedium: params.get('utm_medium') || sessionStorage.getItem('utm_medium') || undefined,
            utmCampaign: params.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || undefined,
            device: window.innerWidth < 768 ? 'mobile' : 'desktop',
          }),
        }).catch(() => {});
      } catch {}
    } catch (err: any) {
      trackAction(`SUBMIT_ERROR ${(err as Error).message?.slice(0, 30)}`);
      set({ error: err.message || 'Error inesperado', busy: false });
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="span">
          {state.step === 'form' ? 'Creá tu cuenta' : 'Revisá tu email'}
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

        {state.step === 'form' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ingresá tu email y una contraseña. Te enviaremos un link de confirmación.
            </Typography>
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
              autoFocus
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
            <TextField
              label="Confirmar contraseña"
              type="password"
              value={state.confirmPassword}
              onChange={(e) => set({ confirmPassword: e.target.value })}
              onFocus={() => trackFocus('confirmPassword')}
              onBlur={() => trackBlur('confirmPassword')}
              fullWidth
              size="small"
              error={state.confirmPassword.length > 0 && state.password !== state.confirmPassword}
              helperText={
                state.confirmPassword.length > 0 && state.password !== state.confirmPassword
                  ? 'Las contraseñas no coinciden'
                  : ''
              }
            />
          </Box>
        )}

        {state.step === 'sent' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <EmailIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Te enviamos un email de confirmación a:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
              {state.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hacé click en el link del email para continuar con el registro.
              Si no lo ves, revisá la carpeta de spam.
            </Typography>
            {state.devConfirmUrl && (
              <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Dev: {' '}
                  <a href={state.devConfirmUrl} style={{ wordBreak: 'break-all' }}>
                    {state.devConfirmUrl}
                  </a>
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {state.step === 'form' && (
          <>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              disabled={!formValid || state.busy}
              onClick={handleSubmit}
              startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {state.busy ? 'Enviando...' : 'Continuar'}
            </Button>
          </>
        )}
        {state.step === 'sent' && (
          <>
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleClose}>Cerrar</Button>
          </>
        )}
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
