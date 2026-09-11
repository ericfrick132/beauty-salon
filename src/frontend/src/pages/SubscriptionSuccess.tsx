/**
 * /subscription/success — vuelta desde Mercado Pago.
 *
 * Dos orígenes:
 *  - ?flow=trial (o preapproval_id en la query): el dueño autorizó el débito automático desde
 *    /empezar. Confirmamos contra /preapproval/status y seguimos al onboarding si falta
 *    (/completar-perfil) o al panel.
 *  - pago/suscripción clásica: se confirma contra /subscription/status como antes.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import api, { tenantApi } from '../services/api';

type VerifyState = 'verifying' | 'approved' | 'pending' | 'failed';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : null;

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState<string>('');
  const [onboardingDone, setOnboardingDone] = useState<boolean>(true);

  const collectionStatus = searchParams.get('collection_status');
  const paymentStatus = searchParams.get('status');
  const preapprovalId = searchParams.get('preapproval_id');
  const externalReference = searchParams.get('external_reference');
  const isTrialFlow = searchParams.get('flow') === 'trial' || !!preapprovalId;

  const nextPath = onboardingDone ? '/dashboard' : '/completar-perfil';

  useEffect(() => {
    tenantApi
      .getConfig()
      .then((cfg: any) => setOnboardingDone(!!cfg?.onboardingCompletedAt))
      .catch(() => setOnboardingDone(true));
  }, []);

  useEffect(() => {
    const mpStatus = (collectionStatus || paymentStatus || '').toLowerCase();
    if (mpStatus === 'rejected' || mpStatus === 'failure' || mpStatus === 'cancelled') {
      setState('failed');
      setMessage(
        isTrialFlow
          ? 'No pudimos autorizar la tarjeta. Podés reintentar cuando quieras: mientras dure la prueba seguís usando TurnosPro.'
          : 'El pago no se completó. Podés reintentar desde tu panel.'
      );
      return;
    }

    const poll = async (): Promise<boolean> => {
      try {
        if (isTrialFlow) {
          const res = await api.get('/preapproval/status');
          if (res.data?.hasActivePreapproval) {
            const firstCharge = fmtDate(res.data?.nextPaymentDate);
            setState('approved');
            setMessage(
              firstCharge
                ? `¡Tu prueba está activa! Hoy no se cobró nada: el primer débito es el ${firstCharge}.`
                : '¡Tu prueba está activa! Hoy no se cobró nada: el primer débito es al terminar la prueba.'
            );
            return true;
          }
          return false;
        }
        const res = await api.get('/subscription/status');
        const sub = res.data?.data || res.data;
        if (sub?.isActive && !sub?.isTrialPeriod) {
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
    const maxAttempts = 8;
    const interval = setInterval(async () => {
      attempts += 1;
      const done = await poll();
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!done) {
          setState('pending');
          setMessage(
            isTrialFlow
              ? 'Mercado Pago recibió la autorización. Puede demorar unos minutos en confirmarse; mientras tanto podés seguir armando tu agenda.'
              : 'Mercado Pago recibió el pago. La activación puede demorar unos minutos — vas a recibir un aviso cuando se confirme.'
          );
        }
      }
    }, 2500);
    poll().then((done) => {
      if (done) clearInterval(interval);
    });
    return () => clearInterval(interval);
  }, [collectionStatus, paymentStatus, isTrialFlow]);

  const renderIcon = () => {
    if (state === 'approved') return <CheckCircle sx={{ fontSize: 72, color: 'success.main' }} />;
    if (state === 'failed') return <ErrorOutline sx={{ fontSize: 72, color: 'error.main' }} />;
    return <CircularProgress size={64} />;
  };

  const renderTitle = () => {
    if (state === 'approved') return isTrialFlow ? '¡Prueba activada!' : '¡Pago confirmado!';
    if (state === 'failed') return isTrialFlow ? 'No se autorizó la tarjeta' : 'El pago no se completó';
    if (state === 'pending') return isTrialFlow ? 'Autorización recibida' : 'Pago recibido — activación pendiente';
    return isTrialFlow ? 'Confirmando tu tarjeta...' : 'Confirmando tu pago...';
  };

  const continueLabel = !onboardingDone ? 'Armar mi agenda' : 'Ir al panel';

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <Box sx={{ mb: 3 }}>{renderIcon()}</Box>
          <Typography variant="h4" gutterBottom>
            {renderTitle()}
          </Typography>
          {message && (
            <Alert
              severity={state === 'failed' ? 'error' : state === 'approved' ? 'success' : 'info'}
              sx={{ mt: 2, mb: 3, textAlign: 'left' }}
            >
              {message}
            </Alert>
          )}
          {(preapprovalId || externalReference) && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Referencia: {preapprovalId || externalReference}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            {state !== 'verifying' && (
              <Button variant="contained" onClick={() => navigate(nextPath)}>
                {continueLabel}
              </Button>
            )}
            {state === 'failed' && (
              <Button
                variant="outlined"
                onClick={() => navigate(isTrialFlow ? '/empezar' : '/subscription/plans')}
              >
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
