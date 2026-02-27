'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Alert,
  CircularProgress,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { businessTypeOptions } from '@/app/(lib)/content';

// --- Context ---
interface SignupModalContextValue {
  open: (prefilledSubdomain?: string) => void;
}

const SignupModalContext = createContext<SignupModalContextValue>({ open: () => {} });

export function useSignupModal() {
  return useContext(SignupModalContext);
}

// --- Helpers ---
function sanitizeSubdomain(value: string): string {
  const normalized = value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

function mapBusinessToVertical(value: string): string {
  switch (value) {
    case 'barbershop':
    case 'barberia':
      return 'barbershop';
    case 'peluqueria':
      return 'peluqueria';
    case 'estetica':
    case 'aesthetics':
    case 'salud':
      return 'aesthetics';
    case 'profesionales':
      return 'other';
    default:
      return 'barbershop';
  }
}

function passwordValid(pwd: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pwd);
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

function buildAutoLoginUrl(payload: any): string {
  const token = payload?.token;
  const tenantSubdomain = payload?.tenantSubdomain || payload?.subdomain;
  const dashboardUrl = payload?.dashboardUrl || payload?.tenantUrl;
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
  const domain = isLocal ? 'localhost:3001' : 'turnos-pro.com';
  const protocol = isLocal ? 'http:' : 'https:';
  if (token && tenantSubdomain) {
    return `${protocol}//${tenantSubdomain}.${domain}/dashboard?impersonationToken=${encodeURIComponent(token)}&tour=onboarding&onboarding=1`;
  }
  if (tenantSubdomain && dashboardUrl) {
    try {
      return new URL(dashboardUrl).toString();
    } catch {
      return `${protocol}//${tenantSubdomain}.${domain}`;
    }
  }
  return '';
}

// --- Component ---
interface ModalState {
  step: number;
  businessType: string;
  businessName: string;
  subdomain: string;
  email: string;
  password: string;
  confirmPassword: string;
  busy: boolean;
  error: string;
}

const initialState: ModalState = {
  step: 1,
  businessType: '',
  businessName: '',
  subdomain: '',
  email: '',
  password: '',
  confirmPassword: '',
  busy: false,
  error: '',
};

function SignupModalInner() {
  const { isOpen, prefilledSubdomain, close } = useSignupModalInternal();
  const [state, setState] = useState<ModalState>(initialState);

  const set = useCallback((patch: Partial<ModalState>) => setState((s) => ({ ...s, ...patch })), []);

  const handleClose = () => {
    setState(initialState);
    close();
  };

  const handleBusinessNameChange = (value: string) => {
    set({ businessName: value, subdomain: sanitizeSubdomain(value) });
  };

  const step1Valid = state.businessType && state.businessName.trim().length >= 2 && state.subdomain.trim().length >= 3;
  const step2Valid =
    emailValid(state.email) && passwordValid(state.password) && state.password === state.confirmPassword;

  const handleRegister = async () => {
    set({ busy: true, error: '' });
    try {
      const primaryBody = {
        gymName: state.businessName.trim(),
        subdomain: state.subdomain.trim(),
        adminEmail: state.email.trim(),
        adminFirstName: 'Admin',
        adminLastName: 'Turnos Pro',
        password: state.password,
      };

      let res = await fetch(apiUrl('/tenants/self-register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(primaryBody),
      });

      if (!res.ok) {
        const fallbackBody = {
          verticalCode: mapBusinessToVertical(state.businessType),
          subdomain: state.subdomain.trim(),
          businessName: state.businessName.trim(),
          adminEmail: state.email.trim(),
          adminFirstName: 'Admin',
          adminLastName: 'Turnos Pro',
          adminPassword: state.password,
          confirmPassword: state.password,
          timeZone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
          language: 'es',
          isDemo: true,
          demoDays: 30,
        };

        res = await fetch(apiUrl('/self-registration'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackBody),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.title || 'Error al registrar. Intenta de nuevo.');
      }

      const payload = await res.json();
      const loginUrl = buildAutoLoginUrl(payload);
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        handleClose();
      }
    } catch (err: any) {
      set({ error: err.message || 'Error inesperado', busy: false });
    }
  };

  // Apply prefilled subdomain on open
  const effectiveSubdomain = state.subdomain || prefilledSubdomain || '';

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="span">
          {state.step === 1 ? '¿Qué tipo de negocio tenés?' : 'Creá tu cuenta'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={state.step - 1} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Negocio</StepLabel>
          </Step>
          <Step>
            <StepLabel>Acceso</StepLabel>
          </Step>
        </Stepper>

        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {state.step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Tipo de negocio
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {businessTypeOptions.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    variant={state.businessType === opt.value ? 'filled' : 'outlined'}
                    color={state.businessType === opt.value ? 'primary' : 'default'}
                    onClick={() => set({ businessType: opt.value })}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
            <TextField
              label="Nombre del negocio"
              placeholder="Ej: Studio Ana"
              value={state.businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Subdominio"
              placeholder="studio-ana"
              value={effectiveSubdomain}
              onChange={(e) => set({ subdomain: sanitizeSubdomain(e.target.value) })}
              fullWidth
              size="small"
              helperText="Min 3 letras/números, sin espacios."
              InputProps={{
                endAdornment: <InputAdornment position="end">.turnos-pro.com</InputAdornment>,
              }}
            />
          </Box>
        )}

        {state.step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={state.email}
              onChange={(e) => set({ email: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Contraseña"
              type="password"
              value={state.password}
              onChange={(e) => set({ password: e.target.value })}
              fullWidth
              size="small"
              helperText="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo."
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              value={state.confirmPassword}
              onChange={(e) => set({ confirmPassword: e.target.value })}
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {state.step === 2 && (
          <Button onClick={() => set({ step: 1, error: '' })} disabled={state.busy}>
            Volver
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {state.step === 1 ? (
          <Button
            variant="contained"
            disabled={!step1Valid}
            onClick={() => set({ step: 2, error: '', subdomain: effectiveSubdomain })}
          >
            Continuar
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={!step2Valid || state.busy}
            onClick={handleRegister}
            startIcon={state.busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {state.busy ? 'Creando...' : 'Crear cuenta'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// --- Internal context for open/close state ---
interface InternalContextValue {
  isOpen: boolean;
  prefilledSubdomain: string;
  close: () => void;
}

const InternalContext = createContext<InternalContextValue>({
  isOpen: false,
  prefilledSubdomain: '',
  close: () => {},
});

function useSignupModalInternal() {
  return useContext(InternalContext);
}

// --- Provider ---
export function SignupModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefilledSubdomain, setPrefilledSubdomain] = useState('');

  const open = useCallback((sub?: string) => {
    setPrefilledSubdomain(sub || '');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPrefilledSubdomain('');
  }, []);

  return (
    <SignupModalContext.Provider value={{ open }}>
      <InternalContext.Provider value={{ isOpen, prefilledSubdomain, close }}>
        {children}
        <SignupModalInner />
      </InternalContext.Provider>
    </SignupModalContext.Provider>
  );
}
