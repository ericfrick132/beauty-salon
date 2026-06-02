/**
 * /completar-perfil — post-register onboarding wizard page wrapper.
 *
 * Injects the landing's fonts (Fraunces / Space Grotesk / JetBrains Mono) so
 * the wizard typography matches the marketing site exactly, runs the shared
 * OnboardingWizard with TurnosPro config, and submits to the backend on step 5.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import OnboardingWizard, {
  OnboardingPayload,
} from '../components/onboarding/OnboardingWizard';
import turnosProOnboardingConfig from '../config/onboardingConfig';

// Preload the landing's fonts by injecting <link> tags if not already present.
// next/font isn't available in CRA so we use Google Fonts CSS directly. The
// Fraunces axes (opsz, SOFT) must be loaded with the `axes=opsz,SOFT` query.
// Fraunces exposes `SOFT`, `WONK`, `opsz`, `wght` axes. We request opsz + SOFT
// + wght because the wizard's display text applies `font-variation-settings:
// "opsz" 144, "SOFT" 30`. If SOFT isn't loaded the browser silently ignores it.
const FONT_HREFS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,SOFT,wght@0,9..144,0..100,300..700;1,9..144,0..100,300..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
];

function ensureFontsLoaded() {
  if (typeof document === 'undefined') return;
  for (const href of FONT_HREFS) {
    const exists = document.querySelector(`link[href="${href}"]`);
    if (!exists) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

interface GoogleIdPayload {
  name?: string;
  email?: string;
  picture?: string;
}

/** Decode a Google ID token (JWT) without verifying — only used for prefill. */
function decodeGoogleIdToken(token: string | null): GoogleIdPayload | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Placeholder business name set by the WhatsApp signup — never prefill the
// wizard with it, the user must type their real one.
const PLACEHOLDER_BUSINESS_NAME = 'Mi negocio';

const CompletarPerfil: React.FC = () => {
  const navigate = useNavigate();
  const [tenantPhone, setTenantPhone] = useState<string | undefined>(undefined);
  const [tenantOwnerName, setTenantOwnerName] = useState<string | undefined>(undefined);
  const [tenantBusinessName, setTenantBusinessName] = useState<string | undefined>(undefined);
  const [tenantInfoLoaded, setTenantInfoLoaded] = useState(false);

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  // Fetch phone + ownerName captured during signup so we don't ask the user
  // for them again here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/Tenant/info');
        if (!cancelled) {
          const phone = res?.data?.phone;
          if (phone && typeof phone === 'string') setTenantPhone(phone);
          const ownerName = res?.data?.ownerName;
          if (ownerName && typeof ownerName === 'string') setTenantOwnerName(ownerName);
          const businessName = res?.data?.businessName;
          if (businessName && typeof businessName === 'string' && businessName !== PLACEHOLDER_BUSINESS_NAME) {
            setTenantBusinessName(businessName);
          }
        }
      } catch {
        // Non-fatal — the wizard still works without the prefill.
      } finally {
        if (!cancelled) setTenantInfoLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill name + avatar from a cached Google ID token (set during register),
  // falling back to the ownerName captured by the marketing signup flow.
  const prefill = useMemo(() => {
    const stored = localStorage.getItem('googleIdTokenForOnboarding');
    const payload = decodeGoogleIdToken(stored);
    if (!payload && !tenantPhone && !tenantOwnerName && !tenantBusinessName) return undefined;
    return {
      name: payload?.name ?? tenantOwnerName,
      businessName: tenantBusinessName,
      email: payload?.email,
      avatarUrl: payload?.picture,
      phone: tenantPhone,
    };
  }, [tenantPhone, tenantOwnerName, tenantBusinessName]);

  const config = useMemo(
    () => ({
      ...turnosProOnboardingConfig,
      prefill,
    }),
    [prefill]
  );

  const handleLogoUpload = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    // Axios 1.x auto-computes the proper `multipart/form-data; boundary=...`
    // header when it sees a FormData body — we just need to NOT send the
    // default `application/json` header. Passing the raw FormData is enough.
    const res = await api.post('/tenants/current/logo', fd);
    return res.data?.url ?? '';
  };

  const handleComplete = async (payload: OnboardingPayload) => {
    let logoUrl: string | undefined;
    try {
      if (payload.logoFile) {
        logoUrl = await handleLogoUpload(payload.logoFile);
      }
    } catch (e) {
      // Non-fatal: the rest of the onboarding still submits without the logo.
      // eslint-disable-next-line no-console
      console.warn('Logo upload failed, continuing without it.', e);
    }

    const email = (payload.email ?? '').trim();
    const password = payload.password ?? '';
    const body = {
      ownerName: payload.ownerName,
      businessName: payload.businessName,
      ownerBirthday: payload.ownerBirthday,
      ownerPhone: payload.ownerPhone,
      ownerInstagram: payload.ownerInstagram,
      ownerWeb: payload.ownerWeb,
      businessKind: payload.activity,
      businessVolume: payload.volume,
      businessWorkMode: payload.workMode,
      themeCode: payload.themeCode,
      primaryColor: payload.primaryColor,
      secondaryColor: payload.secondaryColor,
      logoUrl,
      // Only sent when the user opted in to web login credentials.
      ...(email && password ? { email, password } : {}),
    };

    const res = await api.patch('/tenants/current/onboarding', body);

    // Clear any cached Google ID token — single-use.
    localStorage.removeItem('googleIdTokenForOnboarding');

    // If the business name changed the subdomain, the backend returns a redirectUrl
    // pointing at the new host with a fresh loginToken (localStorage is per-origin, so
    // the current token can't follow us across subdomains). Otherwise just reload the
    // dashboard so App re-fetches config with the new onboardingCompletedAt.
    const redirectUrl: string | undefined = res?.data?.redirectUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/dashboard';
    }
  };

  // NOTE: we intentionally do NOT pass `onLogoUpload` — the upload is done
  // once inside `handleComplete` so the URL can be included in the PATCH body.
  // Passing both callbacks would cause a double-upload.
  //
  // Render the wizard only after the tenant info fetch resolves: the wizard
  // captures `prefill` into its initial state once on mount, so showing it
  // before the fetch lands would render the phone field even when we already
  // have the number from signup.
  if (!tenantInfoLoaded) return null;
  return <OnboardingWizard config={config} onComplete={handleComplete} />;
};

export default CompletarPerfil;
