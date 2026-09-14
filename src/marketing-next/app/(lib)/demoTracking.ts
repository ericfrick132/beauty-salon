// Visita a una demo interactiva (/demo-admin, /demo-app). El PageView (pixel + /api/tracking/event)
// ya lo dispara el script del layout; acá sumamos ViewContent para armar audiencias de remarketing.
export function trackDemoView(name: string) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { fbq?: (...args: unknown[]) => void };
  const isBot = /bot|crawler|spider|headless|lighthouse|playwright|puppeteer/i.test(navigator.userAgent)
    || (navigator as Navigator & { webdriver?: boolean }).webdriver === true;
  if (isBot) return;
  const send = () => {
    if (!w.fbq) return false;
    try {
      const sid = sessionStorage.getItem('_track_sid');
      w.fbq('track', 'ViewContent', { content_name: name }, sid ? { eventID: `${sid}-ViewContent-${name}` } : undefined);
    } catch {}
    return true;
  };
  // El pixel carga afterInteractive: si todavía no está, reintentamos una vez.
  if (!send()) window.setTimeout(send, 3000);
}
