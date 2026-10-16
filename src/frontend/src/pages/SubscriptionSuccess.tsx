/**
 * /subscription/success — vuelta del checkout al pasarse a un plan pago (Plus / Advance / Pro).
 *
 * Dos orígenes:
 *  - preapproval_id en la query (o ?flow=trial de links viejos): el dueño autorizó el débito automático de
 *    Mercado Pago desde /subscription/plans (AddPaymentInfo en GA4). Se confirma contra /preapproval/status.
 *  - Stripe (?provider=stripe) u otros pagos: se confirma contra /subscription/status (isPaid).
 * Freemium: no hay prueba, el débito arranca hoy.
 */
import React, { useEffect, useRef, useState } from 'react';
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
import { getWording } from '../utils/wording';
import { trackAddPaymentInfoFromTenant } from '../utils/funnelTracking';

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
  // Débito automático de Mercado Pago (flow=trial queda por links viejos que todavía vuelvan así). Stripe se
  // confirma contra /subscription/status.
  const flow = searchParams.get('flow');
  const isPreapprovalFlow = searchParams.get('provider') !== 'stripe' && (flow === 'preapproval' || flow === 'trial' || !!preapprovalId);
  // Fuera de Argentina la suscripción se paga con Stripe (vuelve con ?provider=stripe&session_id=...).
  const providerName = searchParams.get('provider') === 'stripe' ? 'Stripe' : 'Mercado Pago';
  // Tú para negocios de México y España (el país llega con la config del negocio).
  const [businessCountry, setBusinessCountry] = useState<string | undefined>(undefined);
  const w = getWording(businessCountry);

  const nextPath = onboardingDone ? '/dashboard' : '/completar-perfil';

  // AddPaymentInfo (embudo GA4): una sola vez, cuando MP confirma el débito. StartTrial ya salió al crear
  // la cuenta (nombre histórico, las campañas optimizan sobre él). El ref evita el doble disparo entre el
  // poll inicial y el del intervalo.
  const paymentInfoSent = useRef(false);

  useEffect(() => {
    tenantApi
      .getConfig()
      .then((cfg: any) => {
        setOnboardingDone(!!cfg?.onboardingCompletedAt);
        setBusinessCountry(cfg?.country || undefined);
      })
      .catch(() => setOnboardingDone(true));
  }, []);

  useEffect(() => {
    // Una vez por negocio: la marca en localStorage evita repetirlo si recarga la página.
    const reportAddPaymentInfo = () => {
      if (paymentInfoSent.current) return;
      paymentInfoSent.current = true;
      try {
        const key = `tp_add_payment_info_${window.location.hostname}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch {
        /* sin storage: lo mandamos igual */
      }
      trackAddPaymentInfoFromTenant();
    };

    const mpStatus = (collectionStatus || paymentStatus || '').toLowerCase();
    if (mpStatus === 'rejected' || mpStatus === 'failure' || mpStatus === 'cancelled') {
      setState('failed');
      setMessage(
        isPreapprovalFlow
          ? w.t('No pudimos autorizar el débito. Podés reintentar cuando quieras: mientras tanto seguís con tu plan actual.', 'No pudimos autorizar el cobro. Puedes reintentar cuando quieras: mientras tanto sigues con tu plan actual.')
          : w.t('El pago no se completó. Podés reintentar desde tu panel.', 'El pago no se completó. Puedes reintentar desde tu panel.')
      );
      return;
    }

    const poll = async (): Promise<boolean> => {
      try {
        if (isPreapprovalFlow) {
          const res = await api.get('/preapproval/status');
          if (res.data?.hasActivePreapproval) {
            reportAddPaymentInfo();
            const next = fmtDate(res.data?.nextPaymentDate);
            setState('approved');
            setMessage(
              next
                ? `¡Listo, ya tenés tu nuevo plan! El débito se renueva solo cada mes; el próximo es el ${next}.`
                : '¡Listo, ya tenés tu nuevo plan! El débito se hace hoy y se renueva solo cada mes.'
            );
            return true;
          }
          return false;
        }
        const res = await api.get('/subscription/status');
        const sub = res.data?.data || res.data;
        // Freemium: isActive siempre es true; lo que confirma el pago es isPaid.
        if (sub?.isPaid) {
          setState('approved');
          setMessage(`¡Listo, ya tenés el plan ${sub.planName}!`);
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
            isPreapprovalFlow
              ? w.t(`${providerName} recibió la autorización. Puede demorar unos minutos en confirmarse; mientras tanto seguís usando TurnosPro.`, `${providerName} recibió la autorización. Puede tardar unos minutos en confirmarse; mientras tanto sigues usando TurnosPro.`)
              : `${providerName} recibió el pago. La activación puede demorar unos minutos — vas a recibir un aviso cuando se confirme.`
          );
        }
      }
    }, 2500);
    poll().then((done) => {
      if (done) clearInterval(interval);
    });
    return () => clearInterval(interval);
  }, [collectionStatus, paymentStatus, isPreapprovalFlow, providerName]);

  const renderIcon = () => {
    if (state === 'approved') return <CheckCircle sx={{ fontSize: 72, color: 'success.main' }} />;
    if (state === 'failed') return <ErrorOutline sx={{ fontSize: 72, color: 'error.main' }} />;
    return <CircularProgress size={64} />;
  };

  const renderTitle = () => {
    if (state === 'approved') return '¡Plan activado!';
    if (state === 'failed') return isPreapprovalFlow ? 'No se autorizó el débito' : 'El pago no se completó';
    if (state === 'pending') return isPreapprovalFlow ? 'Autorización recibida' : 'Pago recibido — activación pendiente';
    return 'Confirmando tu plan...';
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
                onClick={() => navigate('/subscription/plans')}
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
