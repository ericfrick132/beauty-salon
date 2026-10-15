/**
 * Embudo de alta en Microsoft Clarity + GA4 (Lead → CompleteRegistration → StartTrial).
 *
 * Clarity y GA4 se cargan desde public/index.html SOLO en el dominio principal y en rutas
 * públicas (ver isPublicAnalyticsPath, que tiene que coincidir con la lista del index.html).
 * En los subdominios de los negocios no hay Clarity nunca (datos de clientes): ahí las llamadas
 * a window.clarity son no-op.
 */

export const GA4_ID = 'G-X6HH01MKRW';

export type FunnelEvent = 'Lead' | 'CompleteRegistration' | 'StartTrial';

const FUNNEL_EVENTS: ReadonlySet<string> = new Set<FunnelEvent>(['Lead', 'CompleteRegistration', 'StartTrial']);

type AnalyticsWindow = Window & {
  clarity?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  [key: string]: unknown;
};

const w = (): AnalyticsWindow | null => (typeof window === 'undefined' ? null : (window as unknown as AnalyticsWindow));

/** Rutas del apex donde se permite Clarity/GA4 (landing, login y los pasos del registro). */
export function isPublicAnalyticsPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/register/');
}

/** Manda el evento del embudo a Clarity y a GA4 (send_to: solo la propiedad, no Google Ads). */
export function trackFunnel(name: FunnelEvent): void {
  const win = w();
  if (!win) return;
  try {
    win.clarity?.('event', name);
    win.gtag?.('event', name, { send_to: GA4_ID });
  } catch {
    /* noop */
  }
}

/** Para los helpers de tracking existentes que reciben cualquier eventType. */
export function trackFunnelIfApplicable(eventType: string): void {
  if (FUNNEL_EVENTS.has(eventType)) trackFunnel(eventType as FunnelEvent);
}

/**
 * Si la SPA navega (sin recargar) a una ruta privada, cortamos la grabación de Clarity y
 * desactivamos GA4 para que no se lleve URLs/títulos del panel.
 */
export function stopAnalyticsIfPrivate(pathname: string): void {
  const win = w();
  if (!win || isPublicAnalyticsPath(pathname)) return;
  try {
    win.clarity?.('stop');
    win[`ga-disable-${GA4_ID}`] = true;
  } catch {
    /* noop */
  }
}

/**
 * StartTrial desde el subdominio del negocio: la prueba queda activa recién cuando Mercado Pago
 * autoriza la tarjeta (/subscription/success?flow=trial). Ahí no se carga Clarity ni GA4 como
 * página; solo mandamos este evento suelto a GA4 (send_page_view: false, sin URL de la página
 * más allá del path de éxito) para cerrar el embudo. La cookie _ga es de .turnos-pro.com, así que
 * el evento se une al mismo usuario que hizo el alta en el apex.
 */
export function trackStartTrialFromTenant(): void {
  const win = w();
  if (!win) return;
  try {
    // AnalyticsRouteGuard deshabilita GA4 en rutas no públicas (esta incluida): lo habilitamos
    // solo para este evento; la próxima navegación a una ruta privada lo vuelve a deshabilitar.
    win[`ga-disable-${GA4_ID}`] = false;
    if (!win.gtag) {
      win.dataLayer = win.dataLayer || [];
      // gtag necesita `arguments` (no un array) dentro del dataLayer.
      // eslint-disable-next-line prefer-rest-params
      win.gtag = function gtag() { (win.dataLayer as unknown[]).push(arguments); };
      win.gtag('js', new Date());
      win.gtag('config', GA4_ID, {
        send_page_view: false,
        page_location: `${win.location.origin}/subscription/success`,
        page_title: 'Prueba activa',
      });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
      document.head.appendChild(s);
    }
    trackFunnel('StartTrial');
  } catch {
    /* noop */
  }
}
