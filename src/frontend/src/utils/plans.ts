/**
 * Planes freemium (Gratuito / Plus / Advance / Pro): catálogo de respaldo, viñetas y "qué plan te saca del
 * límite". Espejo de Models/Constants/PlanCatalog.cs del backend.
 *
 * Las viñetas se arman con las features que manda /subscription/plans, mostrando en cada plan solo lo que
 * cambia respecto del anterior (así lo pide el copy comercial). Con los valores del catálogo dan exactamente
 * el texto de la grilla de precios; si el super admin cambia un límite, la viñeta lo sigue.
 */
import { useEffect, useState } from 'react';
import { PLAN_LIMIT_EVENT, PlanFeatures, PlanLimitError, PlanLimitKind, PlanUsage, subscriptionApi, SubscriptionPlanInfo } from '../services/api';

export const PLAN_FREE = 'free';
export const PLAN_PLUS = 'plus';
export const PLAN_ADVANCE = 'advance';
/** Pro de freemium. "pro" (sin sufijo) es el Pro viejo, que siguen pagando los clientes de antes. */
export const PLAN_PRO = 'pro_v2';
export const OFFERED_PLAN_CODES = [PLAN_FREE, PLAN_PLUS, PLAN_ADVANCE, PLAN_PRO];

const baseFeatures: PlanFeatures = {
  maxBookingsPerMonth: -1,
  maxServices: -1,
  maxStaff: -1,
  maxCustomers: -1,
  allowOnlinePayments: true,
  allowCustomBranding: true,
  allowSmsNotifications: false,
  allowEmailMarketing: false,
  allowReports: true,
  allowMultiLocation: false,
  allowWhatsApp: true,
  whatsAppMonthlyLimit: 0,
  whatsAppExtraMessageCost: 0,
  commissionPercent: 0,
  maxServicesPerStaff: -1,
  allowReminders: true,
  maxRecurringBookings: 0,
  maxCustomFields: 0,
  allowCoupons: false,
  allowTransferDetection: false,
  allowCustomerHistory: false,
  allowTrackingPixels: false,
};

/** Si /subscription/plans no responde: los planes tal como los siembra el backend (precios en ARS). */
export const FALLBACK_PLANS: SubscriptionPlanInfo[] = [
  {
    code: PLAN_FREE, name: 'Gratuito', tagline: 'Para empezar a recibir reservas online.', price: 0, currency: 'ARS',
    isPopular: false, displayOrder: 0,
    features: { ...baseFeatures, maxBookingsPerMonth: 100, maxStaff: 3, maxServicesPerStaff: 1, commissionPercent: 5,
      allowReminders: false, allowWhatsApp: false, allowCustomBranding: false },
  },
  {
    code: PLAN_PLUS, name: 'Plus', tagline: 'Un plus en la gestión de tus reservas.', price: 8000, currency: 'ARS',
    isPopular: false, displayOrder: 1,
    features: { ...baseFeatures, maxBookingsPerMonth: 200, maxStaff: 5, commissionPercent: 2, whatsAppMonthlyLimit: 30 },
  },
  {
    code: PLAN_ADVANCE, name: 'Advance', tagline: 'Para ordenar y automatizar todas tus reservas.', price: 18000, currency: 'ARS',
    isPopular: true, displayOrder: 2,
    features: { ...baseFeatures, commissionPercent: 1, whatsAppMonthlyLimit: 100, maxRecurringBookings: 10, maxCustomFields: 1,
      allowCoupons: true, allowTransferDetection: true },
  },
  {
    code: PLAN_PRO, name: 'Pro', tagline: 'Sin límites ni fricciones.', price: 30000, currency: 'ARS',
    isPopular: false, displayOrder: 3,
    features: { ...baseFeatures, commissionPercent: 0, whatsAppMonthlyLimit: 250, maxRecurringBookings: -1, maxCustomFields: -1,
      allowCoupons: true, allowTransferDetection: true, allowCustomerHistory: true, allowTrackingPixels: true, allowMultiLocation: true },
  },
];

const num = (n: number) => n.toLocaleString('es-AR');
const unlimited = (n: number | undefined) => n !== undefined && n < 0;

/** Ordena por displayOrder (y precio) y se queda con los cuatro planes que se ofrecen. */
export const sortOfferedPlans = (plans: SubscriptionPlanInfo[]): SubscriptionPlanInfo[] => {
  const offered = plans.filter((p) => OFFERED_PLAN_CODES.includes(p.code));
  const list = offered.length > 0 ? offered : plans;
  return [...list].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99) || a.price - b.price);
};

/** Features del plan; si el backend no las manda, las del catálogo de respaldo. */
export const featuresOf = (plan: SubscriptionPlanInfo): PlanFeatures | null =>
  plan.features ?? FALLBACK_PLANS.find((p) => p.code === plan.code)?.features ?? null;

const bookingsText = (n: number) => (unlimited(n) ? 'Reservas ilimitadas' : `${num(n)} reservas por mes`);
const staffText = (n: number) => (unlimited(n) ? 'Agendas ilimitadas' : `Hasta ${num(n)} agendas`);
const servicesText = (perStaff: number) =>
  unlimited(perStaff) ? 'Servicios ilimitados' : `${num(perStaff)} ${perStaff === 1 ? 'servicio' : 'servicios'} por agenda`;
const whatsAppText = (f: PlanFeatures) =>
  unlimited(f.whatsAppMonthlyLimit) ? 'WhatsApp ilimitado' : `${num(f.whatsAppMonthlyLimit)} mensajes de WhatsApp por mes`;
const recurringText = (n: number) => (unlimited(n) ? 'Reservas recurrentes ilimitadas' : 'Reservas recurrentes');
const customFieldsText = (n: number) =>
  unlimited(n) ? 'Campos personalizados ilimitados' : n === 1 ? 'Un campo personalizado en el formulario' : `${num(n)} campos personalizados en el formulario`;
const commissionText = (pct: number) => (pct > 0 ? `${num(pct)}% de comisión por cobro` : 'Sin comisión por cobro');

const hasWhatsApp = (f: PlanFeatures) => f.allowWhatsApp && f.whatsAppMonthlyLimit !== 0;

/**
 * Viñetas de un plan. El primero lista todo lo que tiene; los demás, lo que cambia respecto del anterior
 * (el de arriba de todo arranca con "Todo lo del plan …").
 */
export const planBullets = (
  plan: SubscriptionPlanInfo,
  previous: SubscriptionPlanInfo | null,
  opts: { isTop?: boolean; stripe?: boolean } = {},
): string[] => {
  const f = featuresOf(plan);
  if (!f) return plan.description ? [plan.description] : [];
  const p = previous ? featuresOf(previous) : null;
  const out: string[] = [];

  if (!p) {
    out.push(bookingsText(f.maxBookingsPerMonth), staffText(f.maxStaff), servicesText(f.maxServicesPerStaff));
    if (f.allowReminders) out.push('Recordatorios automáticos');
    if (hasWhatsApp(f)) out.push(whatsAppText(f));
    out.push(opts.stripe ? 'Cobros con tarjeta y transferencia' : 'Cobros con MercadoPago y transferencia');
    if (f.allowReports) out.push('Panel de métricas');
    if (f.maxRecurringBookings !== 0) out.push(recurringText(f.maxRecurringBookings));
    if (f.maxCustomFields !== 0) out.push(customFieldsText(f.maxCustomFields));
    if (f.allowCoupons) out.push('Cupones de descuento');
    if (f.allowTransferDetection) out.push('Transferencia bancaria automática');
    if (f.allowCustomerHistory) out.push('Ficha e historial de clientes');
    if (f.allowTrackingPixels) out.push('Píxel y Google Analytics');
    out.push(commissionText(f.commissionPercent));
    return out;
  }

  if (opts.isTop && previous) out.push(`Todo lo del plan ${previous.name}`);
  const bookingsChanged = f.maxBookingsPerMonth !== p.maxBookingsPerMonth;
  const staffChanged = f.maxStaff !== p.maxStaff;
  if (bookingsChanged && staffChanged && unlimited(f.maxBookingsPerMonth) && unlimited(f.maxStaff)) {
    out.push('Reservas y agendas ilimitadas');
  } else {
    if (bookingsChanged) out.push(bookingsText(f.maxBookingsPerMonth));
    if (staffChanged) out.push(staffText(f.maxStaff));
  }
  if (f.maxServicesPerStaff !== p.maxServicesPerStaff) out.push(servicesText(f.maxServicesPerStaff));
  if (f.allowReminders && !p.allowReminders) out.push('Recordatorios automáticos');
  if (hasWhatsApp(f) && (!hasWhatsApp(p) || f.whatsAppMonthlyLimit !== p.whatsAppMonthlyLimit)) out.push(whatsAppText(f));
  if (f.maxRecurringBookings !== 0 && f.maxRecurringBookings !== p.maxRecurringBookings) out.push(recurringText(f.maxRecurringBookings));
  if (f.maxCustomFields !== 0 && f.maxCustomFields !== p.maxCustomFields) out.push(customFieldsText(f.maxCustomFields));
  if (f.allowCoupons && !p.allowCoupons) out.push('Cupones de descuento');
  if (f.allowTransferDetection && !p.allowTransferDetection) out.push('Transferencia bancaria automática');
  if (f.allowCustomerHistory && !p.allowCustomerHistory) out.push('Ficha e historial de clientes');
  if (f.allowTrackingPixels && !p.allowTrackingPixels) out.push('Píxel y Google Analytics');
  if (f.commissionPercent !== p.commissionPercent) out.push(commissionText(f.commissionPercent));
  return out;
};

/** Viñetas de cada plan de la lista (ordenada), indexadas por código. */
export const bulletsByPlan = (ordered: SubscriptionPlanInfo[], stripe = false): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  ordered.forEach((plan, i) => {
    out[plan.code] = planBullets(plan, i > 0 ? ordered[i - 1] : null, { isTop: i === ordered.length - 1 && i >= 3, stripe });
  });
  return out;
};

/** Límites que son una feature sí/no (no tienen barra de usados/tope): el diálogo muestra el pitch y el plan. */
export const FEATURE_LIMITS: PlanLimitKind[] = ['coupons', 'customer_history', 'tracking_pixels'];
export const isFeatureLimit = (limit: PlanLimitKind) => FEATURE_LIMITS.includes(limit);

/** Valor del tope en un plan; las features sí/no cuentan como ilimitadas (-1) o no incluidas (0). */
const limitValue = (f: PlanFeatures, limit: PlanLimitKind): number => {
  const flag = (on: boolean) => (on ? -1 : 0);
  switch (limit) {
    case 'bookings_per_month': return f.maxBookingsPerMonth;
    case 'staff': return f.maxStaff;
    case 'coupons': return flag(f.allowCoupons);
    case 'customer_history': return flag(f.allowCustomerHistory);
    case 'tracking_pixels': return flag(f.allowTrackingPixels);
    case 'custom_fields': return f.maxCustomFields;
    case 'recurring_bookings': return f.maxRecurringBookings;
    case 'services':
    default: return f.maxServicesPerStaff;
  }
};

/**
 * El plan más barato (en orden) por encima del actual que levanta ese límite. Para servicios se compara el
 * tope por agenda, que es lo que define el plan.
 */
export const nextPlanFor = (
  ordered: SubscriptionPlanInfo[],
  currentCode: string,
  limit: PlanLimitKind,
): SubscriptionPlanInfo | null => {
  const idx = ordered.findIndex((p) => p.code === currentCode);
  const current = idx >= 0 ? featuresOf(ordered[idx]) : null;
  const currentMax = current ? limitValue(current, limit) : 0;
  const candidates = ordered.slice(idx >= 0 ? idx + 1 : 0).filter((p) => p.price > 0);
  return (
    candidates.find((p) => {
      const f = featuresOf(p);
      if (!f) return false;
      const v = limitValue(f, limit);
      return unlimited(v) || (!unlimited(currentMax) && v > currentMax);
    }) ?? null
  );
};

/** Precio del plan por mes en su moneda ("$ 8.000"). */
export const formatPlanPrice = (plan: Pick<SubscriptionPlanInfo, 'price' | 'currency'>): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: plan.currency || 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: plan.currency && plan.currency !== 'ARS' && Math.round(plan.price) !== plan.price ? 2 : 0,
  }).format(plan.price);

/** Texto de un tope: "Ilimitadas" con -1. */
export const formatLimit = (n: number, unlimitedLabel = 'Ilimitadas') => (unlimited(n) ? unlimitedLabel : num(n));

// Cache de /subscription/plans para la sesión: lo usan la página de planes, el diálogo de límite y el dashboard.
let plansPromise: Promise<SubscriptionPlanInfo[]> | null = null;

export const loadPlans = (): Promise<SubscriptionPlanInfo[]> => {
  if (!plansPromise) {
    plansPromise = subscriptionApi
      .plans()
      .then((list) => (Array.isArray(list) && list.length > 0 ? sortOfferedPlans(list) : FALLBACK_PLANS))
      .catch(() => {
        plansPromise = null;
        return FALLBACK_PLANS;
      });
  }
  return plansPromise;
};

/** Planes ofrecidos, ordenados. Arranca con el catálogo de respaldo y se reemplaza con lo del backend. */
export const usePlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlanInfo[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    loadPlans().then((list) => {
      if (cancelled) return;
      setPlans(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { plans, loading };
};

/** El primer plan pago (en orden) que incluye una feature: para "Incluido en Plus" en los add-ons. */
export const firstPlanWith = (
  ordered: SubscriptionPlanInfo[],
  includes: (f: PlanFeatures) => boolean,
): SubscriptionPlanInfo | null =>
  ordered.find((p) => {
    const f = featuresOf(p);
    return p.price > 0 && !!f && includes(f);
  }) ?? null;

/**
 * GET /subscription/usage. Se vuelve a pedir cuando el backend avisa que se tocó un límite (PLAN_LIMIT_EVENT)
 * y cuando alguien dispara PLAN_USAGE_REFRESH_EVENT (ej. después de crear una reserva).
 */
export const PLAN_USAGE_REFRESH_EVENT = 'plan-usage-refresh';

export const usePlanUsage = (enabled = true) => {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () =>
      subscriptionApi
        .usage()
        .then((u) => { if (!cancelled) setUsage(u); })
        .catch(() => { /* sin datos de uso: no se muestra nada */ });
    load();
    window.addEventListener(PLAN_LIMIT_EVENT, load);
    window.addEventListener(PLAN_USAGE_REFRESH_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(PLAN_LIMIT_EVENT, load);
      window.removeEventListener(PLAN_USAGE_REFRESH_EVENT, load);
    };
  }, [enabled]);
  return usage;
};

/** Porcentaje usado de un tope (0 si es ilimitado). */
export const usedPercent = (used: number, max: number) => (max < 0 ? 0 : max === 0 ? 100 : Math.min(100, (used / max) * 100));

/**
 * Abre el diálogo de "pasate de plan" sin pasar por el backend: para las features que se muestran con candado
 * (ej. "Repetir" en una reserva nueva) y que conviene vender antes de que el usuario choque con un 403.
 */
export const openPlanUpsell = (limit: PlanLimitKind, planCode: string, planName: string, max = 0, used = 0) => {
  const detail: PlanLimitError = { code: 'PLAN_LIMIT', limit, max, used, planCode, planName, message: null };
  try {
    window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail }));
  } catch { /* sin CustomEvent: no se muestra */ }
};

/** Las features nuevas que se venden en el dashboard, los menús y los paywalls. */
export interface NewFeatureInfo {
  key: 'recurring' | 'custom_fields' | 'coupons' | 'customer_history' | 'tracking';
  title: string;
  pitch: string;
  path: string;
  limit: PlanLimitKind;
  includes: (f: PlanFeatures) => boolean;
}

export const NEW_FEATURES: NewFeatureInfo[] = [
  {
    key: 'recurring', title: 'Turnos fijos', path: '/recurring-bookings', limit: 'recurring_bookings',
    pitch: 'Agendá de una vez al cliente que viene todas las semanas.',
    includes: (f) => f.maxRecurringBookings !== 0,
  },
  {
    key: 'custom_fields', title: 'Campos del formulario', path: '/booking-form-fields', limit: 'custom_fields',
    pitch: 'Pedí los datos que necesitás al reservar (obra social, patente, edad…).',
    includes: (f) => f.maxCustomFields !== 0,
  },
  {
    key: 'coupons', title: 'Cupones de descuento', path: '/coupons', limit: 'coupons',
    pitch: 'Creá códigos de descuento para llenar los huecos de la agenda.',
    includes: (f) => f.allowCoupons,
  },
  {
    key: 'customer_history', title: 'Ficha de clientes', path: '/customers', limit: 'customer_history',
    pitch: 'Todo el historial de cada cliente: visitas, gasto y preferencias.',
    includes: (f) => f.allowCustomerHistory,
  },
  {
    key: 'tracking', title: 'Píxel y Analytics', path: '/settings/tracking', limit: 'tracking_pixels',
    pitch: 'Medí tus campañas con el Píxel de Meta y Google Analytics.',
    includes: (f) => f.allowTrackingPixels,
  },
];
