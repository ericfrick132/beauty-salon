import React, { useEffect, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DAY = 24 * 60 * 60 * 1000;

interface TrialStatus {
  isActive: boolean;
  isTrialPeriod: boolean;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  daysRemaining?: number;
  requireCard?: boolean;
  tenantInTrial?: boolean;
  hasCard?: boolean;
}

/**
 * Aviso discreto en el panel mientras corre la prueba sin tarjeta (Trial:RequireCard=false):
 * cuántos días quedan y un atajo a /empezar para activar el plan. Dejar la tarjeta es opcional
 * hasta que vence; al vencer, useCardGate manda a /empezar igual.
 *
 * No se muestra si el backend pide tarjeta (ahí manda el gate), si ya dejó la tarjeta, si el
 * negocio ya pagó (tenantInTrial = false: pagos manuales, de plataforma, cortesías) o si la
 * prueba ya venció (de eso se ocupan el gate y SubscriptionVerification).
 */
const TrialBanner: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/subscription/status', { params: { includePaymentLink: false } })
      .then((res) => {
        if (!cancelled) setStatus(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (
    !status ||
    status.requireCard !== false ||
    !status.isTrialPeriod ||
    !status.tenantInTrial ||
    !status.isActive ||
    status.hasCard
  ) {
    return null;
  }

  const end = status.trialEndsAt || status.expiresAt;
  const daysLeft = end
    ? Math.max(1, Math.ceil((new Date(end).getTime() - Date.now()) / DAY))
    : Math.max(1, status.daysRemaining ?? 1);

  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 2, py: 0, alignItems: 'center', '& .MuiAlert-message': { py: 1 } }}
      action={
        <Button size="small" color="inherit" onClick={() => navigate('/empezar')} sx={{ fontWeight: 600 }}>
          Activá tu plan
        </Button>
      }
    >
      Te {daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} de prueba
    </Alert>
  );
};

export default TrialBanner;
