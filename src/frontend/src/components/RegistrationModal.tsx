import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Person, Email } from '@mui/icons-material';

type RegistrationForm = {
  gymName: string;
  subdomain: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  password: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const API_BASE = (process.env.REACT_APP_API_URL as string) || 'http://localhost:5000/api';

const normalizeSubdomain = (raw: string) => {
  const noAccents = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  const lower = noAccents.toLowerCase();
  const replaced = lower
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return replaced;
};

export default function RegistrationModal({ open, onClose }: Props) {
  const [form, setForm] = useState<RegistrationForm>({
    gymName: '',
    subdomain: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    password: '',
  });
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced subdomain availability check
  const debouncedSubdomain = useMemo(() => form.subdomain, [form.subdomain]);
  useEffect(() => {
    let cancelled = false;
    if (!debouncedSubdomain || debouncedSubdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }
    setSubdomainChecking(true);
    const t = setTimeout(async () => {
      try {
        // Try primary endpoint
        const res = await fetch(`${API_BASE}/tenants/check-subdomain/${debouncedSubdomain}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          const available = data?.data?.available ?? data?.available ?? false;
          setSubdomainAvailable(Boolean(available));
          return;
        }
        // Fallback to our self-registration endpoint
        const fb = await fetch(`${API_BASE}/self-registration/check-subdomain/${debouncedSubdomain}`);
        if (!cancelled && fb.ok) {
          const data = await fb.json();
          const available = data?.available ?? data?.data?.available ?? false;
          setSubdomainAvailable(Boolean(available));
          return;
        }
        if (!cancelled) setSubdomainAvailable(false);
      } catch (e) {
        if (!cancelled) setSubdomainAvailable(false);
      } finally {
        if (!cancelled) setSubdomainChecking(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [debouncedSubdomain]);

  const handleChange = (key: keyof RegistrationForm, value: string) => {
    setRegistrationError('');
    if (key === 'gymName') {
      const maybeAuto = normalizeSubdomain(value);
      setForm((prev) => ({
        ...prev,
        gymName: value,
        subdomain: subdomainEdited ? prev.subdomain : maybeAuto,
      }));
      return;
    }
    if (key === 'subdomain') {
      setSubdomainEdited(true);
      setForm((prev) => ({ ...prev, subdomain: normalizeSubdomain(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit = () => {
    return (
      form.gymName.trim().length > 0 &&
      form.subdomain.trim().length >= 3 &&
      subdomainAvailable === true &&
      form.adminFirstName.trim().length > 0 &&
      form.adminLastName.trim().length > 0 &&
      /[^\s@]+@[^\s@]+\.[^\s@]+/.test(form.adminEmail) &&
      form.password.length >= 6
    );
  };

  const buildAutoLoginUrl = (payload: any) => {
    const token = payload?.token;
    const tenantSubdomain = payload?.tenantSubdomain || payload?.subdomain;
    const dashboardUrl = payload?.dashboardUrl || payload?.tenantUrl;
    if (token && tenantSubdomain) {
      try {
        const base = dashboardUrl ? new URL(dashboardUrl) : new URL(`${window.location.protocol}//${tenantSubdomain}.gymhero.fitness/`);
        base.pathname = '/admin/login';
        base.search = `token=${encodeURIComponent(token)}&impersonation=true&tenant=${encodeURIComponent(tenantSubdomain)}`;
        return base.toString();
      } catch {
        return `${window.location.protocol}//${tenantSubdomain}.gymhero.fitness/admin/login?token=${encodeURIComponent(token)}&impersonation=true&tenant=${encodeURIComponent(tenantSubdomain)}`;
      }
    }
    if (tenantSubdomain && dashboardUrl) {
      // Fallback to provided tenant URL or simple tenant domain
      try {
        const base = new URL(dashboardUrl);
        return base.toString();
      } catch {
        return `${window.location.protocol}//${tenantSubdomain}.turnos-pro.com`;
      }
    }
    return '';
  };

  const handleSubmit = async () => {
    setRegistrationError('');
    if (!canSubmit()) return;
    setRegistrationLoading(true);
    try {
      // Primary API per spec
      const primaryBody = {
        gymName: form.gymName.trim(),
        subdomain: form.subdomain.trim(),
        adminEmail: form.adminEmail.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        password: form.password,
      };
      let res = await fetch(`${API_BASE}/tenants/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(primaryBody),
      });
      let ok = res.ok;
      let data: any = null;
      if (ok) {
        data = await res.json();
        const success = data?.success;
        const payload = success ? data?.data : data;
        const redirect = buildAutoLoginUrl(payload);
        if (redirect) {
          window.location.href = redirect;
          return;
        }
      }

      // Fallback to our backend self-registration
      const fallbackBody = {
        verticalCode: 'barbershop',
        subdomain: form.subdomain.trim(),
        businessName: form.gymName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminPassword: form.password,
        confirmPassword: form.password,
        timeZone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        language: 'es',
        isDemo: true,
        demoDays: 7,
      };
      res = await fetch(`${API_BASE}/self-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = err?.message || 'Error al crear la cuenta. Intenta nuevamente.';
        setRegistrationError(message);
        return;
      }
      data = await res.json();
      const payload = data?.data || data;
      const redirect = buildAutoLoginUrl(payload);
      if (redirect) {
        window.location.href = redirect;
      } else if (payload?.tenantUrl) {
        window.location.href = payload.tenantUrl;
      } else {
        // last resort go to subdomain
        window.location.href = `${window.location.protocol}//${form.subdomain}.turnos-pro.com`;
      }
    } catch (e: any) {
      setRegistrationError(e?.message || 'Error creando la cuenta');
    } finally {
      setRegistrationLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Crear Cuenta Demo - 7 días GRATIS</DialogTitle>
      <DialogContent dividers>
        {registrationError && (
          <Alert severity="error" sx={{ mb: 2 }}>{registrationError}</Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              inputRef={firstInputRef}
              fullWidth
              label="Nombre del Gimnasio/Negocio"
              value={form.gymName}
              onChange={(e) => handleChange('gymName', e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><Business /></InputAdornment>
              ) }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Subdominio"
              value={form.subdomain}
              onChange={(e) => handleChange('subdomain', e.target.value)}
              helperText={
                subdomainChecking ? 'Verificando disponibilidad…' :
                subdomainAvailable === true ? '✅ Disponible' :
                subdomainAvailable === false ? '❌ No disponible' :
                'Tu URL será: ' + (form.subdomain || 'tu-gimnasio') + '.turnos-pro.com'
              }
              error={subdomainAvailable === false}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nombre del Administrador"
              value={form.adminFirstName}
              onChange={(e) => handleChange('adminFirstName', e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><Person /></InputAdornment>
              ) }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Apellido del Administrador"
              value={form.adminLastName}
              onChange={(e) => handleChange('adminLastName', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email del Administrador"
              type="email"
              value={form.adminEmail}
              onChange={(e) => handleChange('adminEmail', e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><Email /></InputAdornment>
              ) }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              helperText="Mínimo 6 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} aria-label="Mostrar contraseña">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              required
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={registrationLoading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={registrationLoading || !canSubmit()}
        >
          {registrationLoading ? <><CircularProgress size={18} sx={{ mr: 1 }} /> Creando…</> : 'Crear Cuenta Demo'}
        </Button>
      </DialogActions>
      <Typography variant="caption" sx={{ px: 3, pb: 2, color: 'text.secondary' }}>
        Al continuar aceptas los Términos y la Política de Privacidad.
      </Typography>
    </Dialog>
  );
}

