import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { featureAddonsApi, FeatureAddonStatus } from '../../services/api';

const DAY = 24 * 60 * 60 * 1000;
/** Cuántos días después de vencida la prueba se sigue mostrando el aviso (si no lo cierran). */
const SHOW_ENDED_DAYS = 30;
/** Pantalla de cada add-on, para el botón "Ver". */
const ADDON_PATH: Record<string, string> = { transfer_detection: '/transfer-detection' };

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const dismissKey = (a: FeatureAddonStatus) => `addon-trial-ended-${a.code}-${a.paidUntil}`;

/**
 * Aviso en el panel de las pruebas gratis de add-ons que da el super admin: mientras dura, cuántos
 * días le quedan; cuando vence (se corta sola), que terminó y cómo activarlo. Lo pagado durante la
 * prueba se suma desde el fin de la prueba, así que no pierde días.
 */
const AddonTrialBanner: React.FC = () => {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<FeatureAddonStatus[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    featureAddonsApi.list()
      .then((list) => setTrials(list.filter((a) => a.isTrial && a.paidUntil)))
      .catch(() => setTrials([]));
  }, []);

  const activate = async (code: string) => {
    setBuying(code);
    try {
      const res = await featureAddonsApi.purchase(code);
      if (res?.paymentLink) window.location.href = res.paymentLink;
    } finally {
      setBuying(null);
    }
  };

  const dismiss = (a: FeatureAddonStatus) => {
    try { localStorage.setItem(dismissKey(a), '1'); } catch { /* sin storage: queda visible */ }
    force((n) => n + 1);
  };

  const now = Date.now();
  const visible = trials.filter((a) => {
    const end = new Date(a.paidUntil!).getTime();
    if (a.active) return true;
    if (now - end > SHOW_ENDED_DAYS * DAY) return false;
    try { return localStorage.getItem(dismissKey(a)) !== '1'; } catch { return true; }
  });
  if (visible.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
      {visible.map((a) => {
        const end = new Date(a.paidUntil!);
        const daysLeft = Math.max(1, Math.ceil((end.getTime() - now) / DAY));
        const actions = (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {a.active && ADDON_PATH[a.code] && (
              <Button size="small" color="inherit" onClick={() => navigate(ADDON_PATH[a.code])}>Ver</Button>
            )}
            <Button size="small" variant="contained" disabled={buying === a.code || a.hasPendingPurchase} onClick={() => activate(a.code)}>
              {a.hasPendingPurchase ? 'Pago en curso' : 'Activar'}
            </Button>
          </Box>
        );
        return a.active ? (
          <Alert key={a.code} severity="info" action={actions}>
            <AlertTitle>Estás probando {a.name} gratis</AlertTitle>
            Te {daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} (hasta el {end.toLocaleDateString('es-AR')}).
            Después se corta solo. Para seguir usándolo, activalo por {money(a.monthlyPrice)} por mes.
          </Alert>
        ) : (
          <Alert key={a.code} severity="warning" action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {actions}
              <Button size="small" color="inherit" onClick={() => dismiss(a)}>Cerrar</Button>
            </Box>
          }>
            <AlertTitle>Terminó tu prueba de {a.name}</AlertTitle>
            Ya no está funcionando. Activalo por {money(a.monthlyPrice)} por mes para seguir usándolo.
          </Alert>
        );
      })}
    </Box>
  );
};

export default AddonTrialBanner;
