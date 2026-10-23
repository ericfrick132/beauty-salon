/**
 * Candados de plan del panel: qué funciones incluye el plan actual y a qué checkout se va cuando no.
 *
 * Regla del dueño: lo que el plan no incluye se muestra grisado con candado (no se oculta) y cualquier click
 * lleva directo a /subscription/plans con el plan mínimo que lo desbloquea resaltado y ?from=<gate> para el
 * cartel "Para usar Cupones pasate al plan Advance". Lo mismo para los límites (reservas del mes, agendas,
 * servicios…) cuando el backend responde 403 PLAN_LIMIT: no hay diálogo intermedio.
 *
 * Mientras no cargó el plan (o si falló) no se bloquea nada: nunca le cortamos algo a quien quizás paga.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureAddonsApi, PLAN_LIMIT_EVENT, PlanFeatures, PlanLimitError, PlanLimitKind, SubscriptionPlanInfo } from '../services/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FALLBACK_PLANS, firstPlanWith, nextPlanFor, PLAN_ADVANCE, PLAN_PLUS, PLAN_PRO, usePlans, usePlanUsage } from './plans';

/** Funciones sí/no del plan, más los límites del backend (PlanLimitKind) para el checkout. */
export type PlanGate =
  | PlanLimitKind
  | 'whatsapp'
  | 'reminders'
  | 'confirmation_bot'
  | 'menu_bot'
  | 'transfer_detection'
  | 'multi_location'
  | 'branding';

interface GateInfo {
  /** Nombre de la función para "Para usar <label> pasate al plan …". */
  label: string;
  /** El plan la incluye. */
  includes: (f: PlanFeatures) => boolean;
  /** Plan si ni /subscription/plans ni el catálogo local resuelven cuál la incluye. */
  fallbackPlan: string;
  /** Add-ons que, comprados aparte (o de prueba), también la habilitan. */
  addons?: string[];
  /** Es un tope (reservas del mes, agendas…): el cartel dice "para seguir…" en vez de "para usar…". */
  quota?: boolean;
}

const hasWhatsApp = (f: PlanFeatures) => f.allowWhatsApp && f.whatsAppMonthlyLimit !== 0;
const WHATSAPP_ADDONS = ['confirmation_bot', 'menu_bot', 'ai_agent'];

export const GATES: Record<PlanGate, GateInfo> = {
  whatsapp: { label: 'WhatsApp', includes: hasWhatsApp, fallbackPlan: PLAN_PLUS, addons: WHATSAPP_ADDONS },
  reminders: { label: 'los recordatorios automáticos', includes: (f) => f.allowReminders, fallbackPlan: PLAN_PLUS },
  confirmation_bot: { label: 'el Bot de Confirmación', includes: (f) => f.allowReminders, fallbackPlan: PLAN_PLUS, addons: ['confirmation_bot'] },
  menu_bot: { label: 'el Asistente de WhatsApp', includes: hasWhatsApp, fallbackPlan: PLAN_PLUS, addons: ['menu_bot'] },
  transfer_detection: { label: 'la transferencia automática', includes: (f) => f.allowTransferDetection, fallbackPlan: PLAN_ADVANCE, addons: ['transfer_detection'] },
  coupons: { label: 'Cupones', includes: (f) => f.allowCoupons, fallbackPlan: PLAN_ADVANCE },
  recurring_bookings: { label: 'Turnos fijos', includes: (f) => f.maxRecurringBookings !== 0, fallbackPlan: PLAN_ADVANCE },
  custom_fields: { label: 'los campos del formulario', includes: (f) => f.maxCustomFields !== 0, fallbackPlan: PLAN_ADVANCE },
  customer_history: { label: 'la ficha de clientes', includes: (f) => f.allowCustomerHistory, fallbackPlan: PLAN_PRO },
  tracking_pixels: { label: 'el Píxel y Google Analytics', includes: (f) => f.allowTrackingPixels, fallbackPlan: PLAN_PRO },
  expenses: { label: 'la carga de gastos', includes: (f) => f.allowExpenses, fallbackPlan: PLAN_PLUS },
  multi_location: { label: 'varias sucursales', includes: (f) => f.allowMultiLocation, fallbackPlan: PLAN_PRO },
  branding: { label: 'tu marca y tus colores', includes: (f) => f.allowCustomBranding, fallbackPlan: PLAN_PLUS },
  bookings_per_month: { label: 'cargando reservas este mes', includes: (f) => f.maxBookingsPerMonth < 0, fallbackPlan: PLAN_PLUS, quota: true },
  staff: { label: 'sumando agendas', includes: (f) => f.maxStaff < 0, fallbackPlan: PLAN_PLUS, quota: true },
  services: { label: 'sumando servicios', includes: (f) => f.maxServicesPerStaff < 0, fallbackPlan: PLAN_PLUS, quota: true },
};

const LIMIT_KINDS: PlanLimitKind[] = [
  'bookings_per_month', 'staff', 'services', 'coupons', 'custom_fields', 'recurring_bookings', 'customer_history', 'tracking_pixels', 'expenses',
];
const isLimitKind = (g: string): g is PlanLimitKind => (LIMIT_KINDS as string[]).includes(g);

export const isPlanGate = (g: string | null | undefined): g is PlanGate => !!g && g in GATES;

/**
 * Plan mínimo que desbloquea la función. Con el plan actual se busca el siguiente que levanta el tope (así un
 * Plus que llega a 200 reservas va a Advance, no a Plus); si no, el primer plan pago que la incluye.
 */
export const planForGate = (gate: PlanGate, plans: SubscriptionPlanInfo[], currentCode?: string | null): SubscriptionPlanInfo | null => {
  if (currentCode && isLimitKind(gate)) {
    const next = nextPlanFor(plans, currentCode, gate);
    if (next) return next;
  }
  const info = GATES[gate];
  return (
    firstPlanWith(plans, info.includes) ??
    firstPlanWith(FALLBACK_PLANS, info.includes) ??
    plans.find((p) => p.code === info.fallbackPlan) ??
    FALLBACK_PLANS.find((p) => p.code === info.fallbackPlan) ??
    null
  );
};

/** URL del checkout con el plan resaltado y de dónde viene. */
export const checkoutPath = (gate: PlanGate | null, planCode?: string | null): string => {
  const params = new URLSearchParams();
  if (planCode) params.set('highlight', planCode);
  if (gate) params.set('from', gate);
  const qs = params.toString();
  return qs ? `/subscription/plans?${qs}` : '/subscription/plans';
};

/** "Para usar Cupones pasate al plan Advance." / "Para seguir cargando reservas este mes pasate al plan Plus." */
export const gateMessage = (gate: PlanGate, planName: string, tu = false): string => {
  const info = GATES[gate];
  const verb = info.quota ? 'seguir' : 'usar';
  const move = tu ? 'cámbiate' : 'pasate';
  return `Para ${verb} ${info.label} ${move} al plan ${planName}.`;
};

// Add-ons activos, compartidos por el layout y las pantallas (una sola llamada por sesión del panel).
let addonsPromise: Promise<string[]> | null = null;
const loadActiveAddons = (): Promise<string[]> => {
  if (!addonsPromise) {
    addonsPromise = featureAddonsApi
      .list()
      .then((list) => (Array.isArray(list) ? list.filter((a) => a.active).map((a) => a.code) : []))
      .catch(() => {
        addonsPromise = null;
        return [];
      });
  }
  return addonsPromise;
};

/** Para que se vuelva a pedir después de comprar un add-on o cambiar de plan. */
export const invalidateActiveAddons = () => {
  addonsPromise = null;
};

/**
 * Estado de los candados del plan actual. `isLocked(gate)` es true solo si ya se sabe el plan y no la incluye
 * (ni hay un add-on activo que la habilite). `goToCheckout(gate)` navega al checkout con el plan mínimo.
 */
export const usePlanGates = () => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { plans } = usePlans();
  const [addons, setAddons] = useState<string[] | null>(null);
  const features = subscription?.features ?? null;
  const currentCode = subscription ? (subscription.isPaid ? subscription.planType : 'free') : null;

  useEffect(() => {
    let cancelled = false;
    if (!localStorage.getItem('authToken')) return;
    loadActiveAddons().then((list) => { if (!cancelled) setAddons(list); });
    return () => { cancelled = true; };
  }, [subscription]);

  const isLocked = useCallback(
    (gate: PlanGate): boolean => {
      if (!features) return false;
      const info = GATES[gate];
      if (info.includes(features)) return false;
      if (info.addons && addons && info.addons.some((a) => addons.includes(a))) return false;
      // Con add-ons todavía sin cargar, los que se pueden comprar aparte no se traban (evita el parpadeo).
      if (info.addons && addons === null) return false;
      return true;
    },
    [features, addons],
  );

  const pathFor = useCallback(
    (gate: PlanGate) => checkoutPath(gate, planForGate(gate, plans, currentCode)?.code),
    [plans, currentCode],
  );

  const goToCheckout = useCallback((gate: PlanGate) => navigate(pathFor(gate)), [navigate, pathFor]);

  return { ready: !!features, features, isLocked, pathFor, goToCheckout, plans, currentCode, subscription };
};

export type QuotaGate = 'bookings_per_month' | 'staff' | 'services';

/**
 * Topes cuantitativos del plan (GET /subscription/usage): `atLimit(gate)` dice si crear uno más ya choca con el
 * tope, para mostrar el botón de alta grisado con candado y mandar al checkout antes del 403.
 */
export const usePlanQuotas = () => {
  const usage = usePlanUsage();
  const atLimit = useCallback(
    /** `used`: el conteo que ya tiene la pantalla (más fresco que el de /usage después de dar de alta o baja). */
    (gate: QuotaGate, used?: number): boolean => {
      if (!usage) return false;
      const [usedFromApi, max] =
        gate === 'bookings_per_month' ? [usage.bookingsThisMonth, usage.maxBookingsPerMonth]
          : gate === 'staff' ? [usage.activeStaff, usage.maxStaff]
            : [usage.activeServices, usage.maxServices];
      return max >= 0 && (used ?? usedFromApi) >= max;
    },
    [usage],
  );
  return { usage, atLimit };
};

/**
 * Escucha los 403 PLAN_LIMIT (el interceptor de api.ts dispara PLAN_LIMIT_EVENT, y openPlanUpsell también) y
 * manda directo al checkout con el plan que levanta ese límite. Reemplaza al viejo PlanLimitDialog. Va montado
 * solo en el panel (AdminLayout): la página pública de reservas del cliente final nunca redirige.
 */
export const usePlanLimitRedirect = () => {
  const navigate = useNavigate();
  const { plans } = usePlans();

  useEffect(() => {
    const onLimit = (ev: Event) => {
      const detail = (ev as CustomEvent<PlanLimitError & { feature?: string }>).detail;
      let gate: PlanGate | null = null;
      let planCode: string | null = null;
      if (detail?.code === 'PLAN_LIMIT' && isPlanGate(detail.limit)) {
        gate = detail.limit;
        planCode = planForGate(gate, plans, detail.planCode)?.code ?? null;
      }
      if (!gate) return;
      navigate(checkoutPath(gate, planCode));
    };
    // 402 FEATURE_REQUIRED de un add-on que viene incluido en un plan (Bot de Confirmación → Plus).
    const onFeatureRequired = (ev: Event) => {
      const feature = (ev as CustomEvent<{ feature?: string }>).detail?.feature;
      if (feature !== 'confirmation_bot' && feature !== 'transfer_detection') return;
      navigate(checkoutPath(feature, planForGate(feature, plans)?.code));
    };
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    window.addEventListener('feature-required', onFeatureRequired);
    return () => {
      window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
      window.removeEventListener('feature-required', onFeatureRequired);
    };
  }, [navigate, plans]);
};
