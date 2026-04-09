import type { Metadata } from 'next';
import Script from 'next/script';
import { brand } from '@/app/(lib)/brand';
import ThemeRegistry from '@/app/(components)/ThemeRegistry';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/(lib)/theme';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' });
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(brand.brand_domain),
  alternates: { languages: { [brand.lang]: `${brand.brand_domain}${brand.marketing_path}` } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={brand.lang}>
      <body className={spaceGrotesk.className}>
        <ThemeRegistry>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </ThemeRegistry>
        {pixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');

                // Track PageView in our DB
                try {
                  var p = new URLSearchParams(window.location.search);
                  var utms = {};
                  if (p.get('utm_source')) { utms.utmSource = p.get('utm_source'); sessionStorage.setItem('utm_source', p.get('utm_source')); }
                  if (p.get('utm_medium')) { utms.utmMedium = p.get('utm_medium'); sessionStorage.setItem('utm_medium', p.get('utm_medium')); }
                  if (p.get('utm_campaign')) { utms.utmCampaign = p.get('utm_campaign'); sessionStorage.setItem('utm_campaign', p.get('utm_campaign')); }
                  var fbclid = p.get('fbclid'); if (fbclid) sessionStorage.setItem('fbclid', fbclid);
                  var sid = sessionStorage.getItem('_track_sid');
                  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('_track_sid', sid); }

                  // Browser pixel PageView with eventID matching MetaCapiService backend format
                  // ({sessionId}-{eventType}). Meta dedupes the pixel hit with the CAPI hit
                  // within 48h instead of double-counting.
                  fbq('track', 'PageView', {}, { eventID: sid + '-PageView' });
                  fetch('/api/tracking/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.assign({ eventType: 'PageView', url: window.location.href, device: window.innerWidth < 768 ? 'mobile' : 'desktop', referrer: document.referrer || undefined, sessionId: sid, fbclid: fbclid || sessionStorage.getItem('fbclid') || undefined, screenResolution: window.screen.width+'x'+window.screen.height, language: navigator.language, pageTitle: document.title }, utms))
                  }).catch(function(){});
                } catch(e) {}

                // Session interaction tracking
                try {
                  var _sess = { start: Date.now(), maxScroll: 0, clicks: [], sections: {} };
                  var _sessSent = false;
                  window.addEventListener('scroll', function() {
                    var pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                    if (pct > _sess.maxScroll) _sess.maxScroll = pct;
                    document.querySelectorAll('section[id]').forEach(function(el) {
                      var r = el.getBoundingClientRect();
                      if (r.top < window.innerHeight && r.bottom > 0) _sess.sections[el.id] = 1;
                    });
                  }, { passive: true });
                  document.addEventListener('click', function(e) {
                    var el = e.target.closest('button, a, .faq-item');
                    if (!el) return;
                    var label = el.matches('button') ? 'CTA: ' + (el.textContent || '').trim().slice(0,30) : el.matches('a') ? 'Link: ' + (el.textContent || '').trim().slice(0,25) : (el.textContent || '').trim().slice(0,30);
                    if (label && _sess.clicks.indexOf(label) === -1) _sess.clicks.push(label);
                  });
                  function _sendExit() {
                    if (_sessSent) return; _sessSent = true;
                    var dur = Math.round((Date.now() - _sess.start) / 1000);
                    if (dur < 3) return;
                    var sects = Object.keys(_sess.sections).join(', ') || 'Solo hero';
                    var clicks = _sess.clicks.length > 0 ? _sess.clicks.slice(0,5).join(' | ') : 'Ninguno';
                    var summary = dur + 's | Scroll ' + _sess.maxScroll + '% | Vio: ' + sects + ' | Clicks: ' + clicks;
                    var sid = sessionStorage.getItem('_track_sid') || '';
                    navigator.sendBeacon('/api/tracking/event', new Blob([JSON.stringify({
                      eventType: 'SessionExit', url: window.location.href, name: summary,
                      device: window.innerWidth < 768 ? 'mobile' : 'desktop', sessionId: sid,
                      utmSource: sessionStorage.getItem('utm_source') || undefined,
                      utmMedium: sessionStorage.getItem('utm_medium') || undefined,
                      utmCampaign: sessionStorage.getItem('utm_campaign') || undefined,
                      referrer: document.referrer || undefined
                    })], { type: 'application/json' }));
                  }
                  window.addEventListener('beforeunload', _sendExit);
                  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') _sendExit(); });
                } catch(e) {}
              `}
            </Script>
            <noscript>
              <img height="1" width="1" style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} alt="" />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}

