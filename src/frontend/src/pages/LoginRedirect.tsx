import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import api from '../services/api';

const LoginRedirect: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.get('/public/tenant-by-email', { params: { email: trimmed } });
      const { loginUrl } = res.data;
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        setError('No se encontró una cuenta asociada a ese email.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se encontró una cuenta asociada a ese email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF7F2',
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 2,
        }}
      >
        <LoginIcon sx={{ fontSize: 48, color: '#1E40AF', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
          Iniciar sesion
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280', mb: 3 }}>
          Ingresa tu email para encontrar tu negocio y redirigirte al login.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          size="small"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#FFFFFF' } }}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleLookup}
          disabled={!email.trim() || loading}
          sx={{ backgroundColor: '#1E40AF', '&:hover': { backgroundColor: '#1D4ED8' }, mb: 2 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Continuar'}
        </Button>

        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          ¿No tenes cuenta?{' '}
          <a href="/register" style={{ color: '#1E40AF', textDecoration: 'none', fontWeight: 600 }}>
            Registrate gratis
          </a>
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginRedirect;
