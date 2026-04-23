/**
 * /completar-perfil — post-register onboarding wizard page wrapper.
 *
 * Injects the landing's fonts (Fraunces / Space Grotesk / JetBrains Mono) so
 * the wizard typography matches the marketing site exactly, runs the shared
 * OnboardingWizard with TurnosPro config, and submits to the backend on step 5.
 */

import React, { useEffect, useMemo } from 'react';
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

const CompletarPerfil: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  // Prefill name + avatar from a cached Google ID token (set during register).
  const prefill = useMemo(() => {
    const stored = localStorage.getItem('googleIdTokenForOnboarding');
    const payload = decodeGoogleIdToken(stored);
    if (!payload) return undefined;
    return {
      name: payload.name,
      email: payload.email,
      avatarUrl: payload.picture,
    };
  }, []);

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

    const body = {
      ownerName: payload.ownerName,
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
    };

    await api.patch('/tenants/current/onboarding', body);

    // Clear any cached Google ID token — single-use.
    localStorage.removeItem('googleIdTokenForOnboarding');

    // Hard reload so App re-fetches tenant config with the new
    // onboardingCompletedAt — otherwise AdminLayout's guard sees the stale
    // `null` value and bounces us right back to /completar-perfil.
    window.location.href = '/dashboard';
  };

  // NOTE: we intentionally do NOT pass `onLogoUpload` — the upload is done
  // once inside `handleComplete` so the URL can be included in the PATCH body.
  // Passing both callbacks would cause a double-upload.
  return <OnboardingWizard config={config} onComplete={handleComplete} />;
};

export default CompletarPerfil;
