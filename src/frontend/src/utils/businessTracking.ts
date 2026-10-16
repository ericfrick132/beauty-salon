/**
 * Meta Pixel y GA4 DEL NEGOCIO en su página pública de reservas (los IDs vienen de /public/tenant-info y
 * solo llegan si el plan del negocio incluye tracking). No tiene nada que ver con el GA/Clarity de la
 * plataforma (utils/funnelTracking.ts): los eventos de GA4 van con send_to al ID del negocio.
 *
 * Los IDs se validan en el backend, pero igual solo se interpolan si pasan un regex estricto.
 * Cada script se inyecta una sola vez por página (guardas a nivel módulo + en window, así React
 * StrictMode y los re-renders no duplican el init ni el PageView).
 */

const META_PIXEL_RE = /^\d{5,20}$/;
const GA4_RE = /^G-[A-Z0-9]{4,15}$/;

type TrackingWindow = Window & {
  fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  __tpBusinessTracking?: { pixel?: string; ga?: string };
};

let pixelId: string | null = null;
let gaId: string | null = null;

const win = (): TrackingWindow | null => (typeof window === 'undefined' ? null : (window as unknown as TrackingWindow));

const safe = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* el tracking nunca rompe la reserva */
  }
};

function initMetaPixel(id: string) {
  const w = win();
  if (!w) return;
  const state = (w.__tpBusinessTracking ??= {});
  if (state.pixel === id) {
    pixelId = id;
    return;
  }
  // Snippet oficial de Meta (fbevents.js), sin el <noscript>.
  if (!w.fbq) {
    const n: any = function (...args: unknown[]) {
      // eslint-disable-next-line prefer-spread
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    w.fbq = n;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  w.fbq!('init', id);
  w.fbq!('trackSingle', id, 'PageView');
  state.pixel = id;
  pixelId = id;
}

function initGa4(id: string) {
  const w = win();
  if (!w) return;
  const state = (w.__tpBusinessTracking ??= {});
  if (state.ga === id) {
    gaId = id;
    return;
  }
  // Snippet oficial de gtag.js. Si la plataforma ya cargó gtag (apex), se reusa y solo se suma la config.
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function gtag() {
      // gtag necesita el objeto arguments, no un array.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag('js', new Date());
  }
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  w.gtag('config', id);
  state.ga = id;
  gaId = id;
}

/** Inyecta los snippets del negocio (idempotente). IDs inválidos se ignoran. */
export function initBusinessTracking(ids: { metaPixelId?: string | null; googleAnalyticsId?: string | null }) {
  const pixel = (ids.metaPixelId || '').trim();
  const ga = (ids.googleAnalyticsId || '').trim().toUpperCase();
  if (pixel && META_PIXEL_RE.test(pixel)) safe(() => initMetaPixel(pixel));
  if (ga && GA4_RE.test(ga)) safe(() => initGa4(ga));
}

const fbqTrack = (event: string, params?: Record<string, unknown>) => {
  const w = win();
  if (!pixelId || !w?.fbq) return;
  // trackSingle: solo al píxel del negocio, por si la página tuviera otro píxel cargado.
  safe(() => w.fbq!('trackSingle', pixelId, event, params ?? {}));
};

const gaEvent = (event: string, params?: Record<string, unknown>) => {
  const w = win();
  if (!gaId || !w?.gtag) return;
  safe(() => w.gtag!('event', event, { ...(params ?? {}), send_to: gaId }));
};

export interface TrackedBooking {
  serviceName?: string;
  serviceId?: string;
  /** Precio del turno (con cupón, si hay). */
  value?: number;
  currency?: string;
  bookingId?: string;
}

const items = (b: TrackedBooking) =>
  b.serviceId || b.serviceName ? [{ item_id: b.serviceId, item_name: b.serviceName, price: b.value, quantity: 1 }] : undefined;

/** Reserva creada (con o sin seña pendiente). */
export function trackBookingCreated(b: TrackedBooking) {
  fbqTrack('Schedule', { content_name: b.serviceName, value: b.value, currency: b.currency });
  gaEvent('generate_lead', { value: b.value, currency: b.currency, items: items(b) });
}

/** El cliente sale a pagar la seña. */
export function trackDepositCheckout(b: TrackedBooking & { depositAmount?: number }) {
  fbqTrack('InitiateCheckout', { content_name: b.serviceName, value: b.depositAmount, currency: b.currency });
  gaEvent('begin_checkout', { value: b.depositAmount, currency: b.currency, items: items(b) });
}

/** La seña quedó paga (la página vio el turno confirmado después de ir a pagar). */
export function trackDepositPaid(b: TrackedBooking & { depositAmount?: number }) {
  fbqTrack('Purchase', { content_name: b.serviceName, value: b.depositAmount ?? 0, currency: b.currency || 'ARS' });
  gaEvent('purchase', {
    transaction_id: b.bookingId,
    value: b.depositAmount ?? 0,
    currency: b.currency || 'ARS',
    items: items(b),
  });
}
