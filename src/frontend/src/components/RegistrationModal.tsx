import React, { useEffect, useRef, useState } from 'react';
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
  Box,
} from '@mui/material';
import { Visibility, VisibilityOff, Email as EmailIcon } from '@mui/icons-material';
import { registrationApi } from '../services/api';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RegistrationModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'sent'>('form');
  const [devConfirmUrl, setDevConfirmUrl] = useState('');
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStep('form');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setDevConfirmUrl('');
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  const canSubmit = () => {
    return (
      /\S+@\S+\.\S+/.test(email) &&
      password.length >= 8 &&
      password === confirmPassword
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!canSubmit()) return;
    setLoading(true);
    try {
      const response = await registrationApi.start({
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (response.success) {
        setDevConfirmUrl(response.devConfirmUrl || '');
        setStep('sent');
      } else {
        setError(response.message || 'Error al registrar');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error creando la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {step === 'form' ? 'Crear Cuenta - 7 días GRATIS' : 'Revisá tu email'}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {step === 'form' && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Ingresá tu email y una contraseña. Te enviaremos un link para continuar.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                inputRef={firstInputRef}
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment>,
                }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                helperText="Mínimo 8 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                error={confirmPassword.length > 0 && password !== confirmPassword}
                helperText={
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? 'Las contraseñas no coinciden'
                    : ''
                }
                required
              />
            </Grid>
          </Grid>
        )}

        {step === 'sent' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Te enviamos un email de confirmación a:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
              {email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hacé click en el link del email para continuar.
            </Typography>
            {devConfirmUrl && (
              <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Dev:{' '}
                  <a href={devConfirmUrl} style={{ wordBreak: 'break-all' }}>
                    {devConfirmUrl}
                  </a>
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {step === 'sent' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {step === 'form' && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !canSubmit()}
          >
            {loading ? <><CircularProgress size={18} sx={{ mr: 1 }} /> Enviando...</> : 'Continuar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
