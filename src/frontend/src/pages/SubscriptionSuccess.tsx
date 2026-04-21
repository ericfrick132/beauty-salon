import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

type VerifyState = 'verifying' | 'approved' | 'pending' | 'failed';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState<string>('');

  const collectionStatus = searchParams.get('collection_status');
  const paymentStatus = searchParams.get('status');
  const preapprovalId = searchParams.get('preapproval_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const mpStatus = (collectionStatus || paymentStatus || '').toLowerCase();

    if (mpStatus === 'rejected' || mpStatus === 'failure' || mpStatus === 'cancelled') {
      setState('failed');
      setMessage('El pago no se completó. Podés reintentar desde tu panel.');
      return;
    }

    const pollSubscription = async () => {
      try {
        const res = await api.get('/subscription/status');
        const sub = res.data?.data || res.data;
        if (sub?.status === 'active' || sub?.status === 'authorized') {
          setState('approved');
          setMessage('¡Tu suscripción está activa!');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    let attempts = 0;
    const maxAttempts = 6;
    const interval = setInterval(async () => {
      attempts += 1;
      const done = await pollSubscription();
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!done) {
          setState('pending');
          setMessage(
            'Mercado Pago recibió el pago. La activación puede demorar unos minutos — vas a recibir un aviso cuando se confirme.'
          );
        }
      }
    }, 2500);

    pollSubscription().then((done) => {
      if (done) clearInterval(interval);
    });

    return () => clearInterval(interval);
  }, [collectionStatus, paymentStatus]);

  const renderIcon = () => {
    if (state === 'approved') return <CheckCircle sx={{ fontSize: 72, color: 'success.main' }} />;
    if (state === 'failed') return <ErrorOutline sx={{ fontSize: 72, color: 'error.main' }} />;
    return <CircularProgress size={64} />;
  };

  const renderTitle = () => {
    if (state === 'approved') return '¡Pago confirmado!';
    if (state === 'failed') return 'El pago no se completó';
    if (state === 'pending') return 'Pago recibido — activación pendiente';
    return 'Confirmando tu pago...';
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <Box sx={{ mb: 3 }}>{renderIcon()}</Box>
          <Typography variant="h4" gutterBottom>
            {renderTitle()}
          </Typography>
          {message && (
            <Alert severity={state === 'failed' ? 'error' : state === 'approved' ? 'success' : 'info'} sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
              {message}
            </Alert>
          )}
          {(preapprovalId || externalReference) && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Referencia: {preapprovalId || externalReference}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              Ir al panel
            </Button>
            {state === 'failed' && (
              <Button variant="outlined" onClick={() => navigate('/subscription/plans')}>
                Reintentar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SubscriptionSuccess;
