/**
 * Gate de la tarjeta: durante la prueba, el panel y el onboarding están detrás de dejar la
 * tarjeta en Mercado Pago. Mientras el preapproval no esté autorizado, cualquier pantalla
 * privada rebota a /empezar.
 *
 * Se usa en AdminLayout (todo el panel) y en CompletarPerfil (el onboarding vive fuera del
 * layout, así que sin esto se podía llegar escribiendo la URL). Las páginas públicas del
 * tenant (landing de reservas y /book) NO pasan por acá: los clientes finales tienen que
 * poder reservar aunque el negocio todavía no haya dejado la tarjeta.
 *
 * El backend lo exige igual desde SubscriptionMiddleware; esto es la mitad amable.
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

/** Pantallas que no pueden rebotar, porque son el propio checkout o su vuelta. */
const EXEMPT = [
  '/empezar',
  '/subscription/success',
  '/subscription/plans',
  '/login',
];

export function useCardGate() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (EXEMPT.some((path) => location.pathname.startsWith(path))) return;

    let cancelled = false;
    (async () => {
      try {
        const status = (await api.get('/subscription/status')).data;
        // Fuera de la prueba manda la suscripción real: de eso se ocupa SubscriptionVerification.
        if (cancelled || !status?.isTrialPeriod) return;
        const pre = (await api.get('/preapproval/status')).data;
        if (cancelled || pre?.hasActivePreapproval) return;
        navigate('/empezar', { replace: true });
      } catch {
        // Sin red no encerramos a nadie: el backend sigue bloqueando las llamadas.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Se re-consulta al cambiar de pantalla: deja de rebotar apenas MP confirma la tarjeta.
  }, [location.pathname, navigate]);
}

export default useCardGate;
