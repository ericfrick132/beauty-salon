// Captcha de Cloudflare (Turnstile, widget "efcloud-logins", modo Managed) en los logins y altas web.
// Engancha XMLHttpRequest (axios) y fetch: antes de mandar un pedido a un endpoint protegido pide un
// token y lo manda en X-Turnstile-Token. A casi todos no les muestra nada; si Cloudflare sospecha
// (bots, navegadores automatizados) aparece el desafío abajo al centro. El backend decide
// (RequireTurnstileAttribute): las apps nativas no pasan por acá.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAF7yFj73h-75IpvQ';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const HEADER = 'X-Turnstile-Token';

// Rutas (final del path) que exigen token. Mantener en sincronía con [RequireTurnstile] del backend.
const PROTECTED = [
  '/auth/login', '/auth/google-login', '/auth/forgot-password',
  '/registration/email/start', '/registration/quick',
  '/registration/start', '/registration/complete', '/registration/google-register',
  '/super-admin/auth/login',
];

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

export function isTurnstileProtected(url: string): boolean {
  try {
    const path = new URL(url, window.location.href).pathname.replace(/\/+$/, '').toLowerCase();
    if (!path.includes('/api/')) return false;
    return PROTECTED.some((p) => path.endsWith(p));
  } catch {
    return false;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as unknown as { turnstile?: TurnstileApi };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile no cargó')));
      s.onerror = () => reject(new Error('turnstile no cargó'));
      document.head.appendChild(s);
    }).catch((e) => {
      scriptPromise = null; // reintentar en el próximo pedido
      throw e;
    });
  }
  return scriptPromise;
}

/** Token de un solo uso (vale 5 min). null si no se pudo obtener: el backend responde captcha_required. */
export async function getTurnstileToken(): Promise<string | null> {
  try {
    const ts = await loadTurnstile();
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;';
    document.body.appendChild(host);
    return await new Promise<string | null>((resolve) => {
      let id: string | null = null;
      const done = (token: string | null) => {
        clearTimeout(timer);
        try { if (id) ts.remove(id); } catch { /* ya removido */ }
        host.remove();
        resolve(token);
      };
      // Si hay desafío interactivo le damos tiempo a la persona para resolverlo.
      const timer = setTimeout(() => done(null), 120000);
      id = ts.render(host, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        callback: (t: string) => done(t),
        'error-callback': () => done(null),
        'timeout-callback': () => done(null),
      });
    });
  } catch {
    return null;
  }
}

let installed = false;
export function installTurnstile(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // axios en el navegador usa XMLHttpRequest: demoramos el send hasta tener el token.
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;
  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    (this as unknown as { __tsUrl?: string }).__tsUrl = String(url);
    return (origOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof proto.open;
  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const url = (this as unknown as { __tsUrl?: string }).__tsUrl;
    if (!url || !isTurnstileProtected(url)) return origSend.call(this, body);
    getTurnstileToken().then((token) => {
      if (token) { try { this.setRequestHeader(HEADER, token); } catch { /* ya enviado */ } }
      origSend.call(this, body);
    });
  };

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isTurnstileProtected(url)) return origFetch(input, init);
    const token = await getTurnstileToken();
    if (!token) return origFetch(input, init);
    // Objeto plano, no Headers: otros wrappers de fetch (si se agregan) hacen {...init.headers}.
    // Se conserva el nombre original de cada header (si no, "Content-Type" + "content-type" se suman).
    const src = init?.headers ?? (input instanceof Request ? input.headers : undefined);
    const headers: Record<string, string> = {};
    if (src instanceof Headers) src.forEach((v, k) => { headers[k] = v; });
    else if (Array.isArray(src)) src.forEach(([k, v]) => { headers[k] = v; });
    else if (src) Object.assign(headers, src);
    headers[HEADER] = token;
    return origFetch(input, { ...init, headers });
  };
}
