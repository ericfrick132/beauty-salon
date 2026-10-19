/**
 * /register (dominio principal) — alta y login por código de email.
 *
 * Paso 'form': nombre del negocio + email + WhatsApp → POST /registration/email/start
 *   (manda el código de 6 dígitos y guarda nombre y teléfono en la fila de verificación).
 * Paso 'code': el código → POST /registration/email/verify → redirige al panel del tenant
 *   (cuenta nueva con onboarding, o login directo si el email ya tenía cuenta).
 *
 * Se llega acá de tres formas:
 *   - /register              → paso 'form'.
 *   - /register?s=<state>    → paso 'code': el state es el token opaco de la transacción que
 *                              devolvió email/start (desde el formulario de la landing o desde
 *                              el link del mail). La página pide GET email/state/{s} para saber
 *                              el email y si la cuenta ya existía. El email no viaja en la URL.
 *   - /register?email=x      → fallback para mails viejos: paso 'code' con el email fijo.
 *   - "Cambiar" en 'code'    → vuelve a 'form' con el email cargado.
 *
 * Usa la misma AuthShell que /login para que el salto landing → app se sienta continuo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import api, { registrationApi } from '../services/api';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';
import { underlineFieldSx, PillCTA, InlineLink, WhatsAppOptInCheckbox } from '../components/auth/authFormKit';
import { slugify } from '../utils/slug';
import { trackFunnel, trackFunnelIfApplicable } from '../utils/funnelTracking';
import { countryFromPhone, getCountry } from '../utils/intl';
import { getWording } from '../utils/wording';

const PHONE_COUNTRIES = [
  { dial: '+54', label: 'Argentina (+54)', placeholder: '11 2345 6789' },
  { dial: '+598', label: 'Uruguay (+598)', placeholder: '99 123 456' },
  { dial: '+56', label: 'Chile (+56)', placeholder: '9 1234 5678' },
  { dial: '+55', label: 'Brasil (+55)', placeholder: '11 91234 5678' },
  { dial: '+52', label: 'México (+52)', placeholder: '55 1234 5678' },
  { dial: '+34', label: 'España (+34)', placeholder: '612 34 56 78' },
  { dial: '+1', label: 'Estados Unidos (+1)', placeholder: '305 123 4567' },
];

type Step = 'form' | 'code';

const emailValid = (v: string) => /\S+@\S+\.\S+/.test(v);

/**
 * Atribución del anuncio (utm_* + utm_content + fbclid + cookie _fbp). La landing la deja en
 * sessionStorage al aterrizar; como /register vive en el mismo origen, la leemos de ahí.
 */
function getAttribution(): Record<string, string | undefined> {
  try {
    const params = new URLSearchParams(window.location.search);
    const read = (k: string) => params.get(k) || sessionStorage.getItem(k) || undefined;
    const cookie = (name: string) => {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : undefined;
    };
    let fbclid = read('fbclid');
    const fbc = cookie('_fbc');
    if (!fbclid && fbc) {
      const parts = fbc.split('.');
      if (parts.length >= 4) fbclid = parts.slice(3).join('.');
    }
    return {
      utmSource: read('utm_source'),
      utmMedium: read('utm_medium'),
      utmCampaign: read('utm_campaign'),
      utmContent: read('utm_content'),
      fbclid,
      fbp: cookie('_fbp'),
    };
  } catch {
    return {};
  }
}

/**
 * Mismo evento de tracking que dispara la landing (misma sesión: sessionStorage compartido).
 * Los pasos del embudo (Lead, CompleteRegistration) van además a Clarity y GA4.
 */
function sendTrackingEvent(eventType: string, extra: Record<string, unknown> = {}) {
  trackFunnelIfApplicable(eventType);
  try {
    const ss = window.sessionStorage;
    api
      .post('/tracking/event', {
        eventType,
        url: window.location.href,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        sessionId: ss.getItem('_track_sid') || '',
        utmSource: ss.getItem('utm_source') || undefined,
        utmMedium: ss.getItem('utm_medium') || undefined,
        utmCampaign: ss.getItem('utm_campaign') || undefined,
        referrer: document.referrer || undefined,
        pageTitle: document.title,
        language: navigator.language,
        ...extra,
      })
      .catch(() => {});
  } catch {
    /* noop */
  }
}

const kickerSx = {
  fontFamily: authFonts.mono,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: authPalette.primary,
  mb: 1.25,
} as const;

const titleSx = {
  fontFamily: authFonts.display,
  fontWeight: 500,
  fontSize: { xs: 32, sm: 38 },
  lineHeight: 1.08,
  letterSpacing: '-0.02em',
  color: authPalette.ink,
  mb: 1,
  fontVariationSettings: '"opsz" 144, "SOFT" 30',
} as const;

const subtitleSx = {
  fontFamily: authFonts.body,
  fontSize: 15,
  lineHeight: 1.5,
  color: authPalette.inkSoft,
} as const;

const finePrintSx = {
  fontFamily: authFonts.body,
  fontSize: 13,
  lineHeight: 1.5,
  color: authPalette.inkSoft,
  textAlign: 'center',
} as const;

const textButtonSx = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: authFonts.body,
  fontSize: 14,
  fontWeight: 600,
  color: authPalette.primary,
  '&:hover': { textDecoration: 'underline' },
  '&:disabled': { color: authPalette.inkFaint, cursor: 'default', textDecoration: 'none' },
} as const;

const RegisterCode: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateParam = (searchParams.get('s') || '').trim();
  const emailParam = (searchParams.get('email') || '').trim();
  // País que eligió en la landing (/uy, /mx, /es o ?pais=): preselecciona el código del teléfono y el tono.
  const [countryParam] = useState(() => {
    const raw = (searchParams.get('country') || searchParams.get('pais') || '').trim().toUpperCase();
    return raw && getCountry(raw).code === raw ? raw : '';
  });

  const [step, setStep] = useState<Step>(stateParam || emailValid(emailParam) ? 'code' : 'form');
  // Token opaco de la transacción (email/start lo devuelve; el mail y la landing lo traen en ?s=).
  const [stateToken, setStateToken] = useState(stateParam);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [dial, setDial] = useState(() => (countryParam ? `+${getCountry(countryParam).dialCode}` : PHONE_COUNTRIES[0].dial));
  const [mobile, setMobile] = useState('');
  // Consentimiento de marketing por WhatsApp: tildado por defecto, no es obligatorio.
  const [whatsAppOptIn, setWhatsAppOptIn] = useState(true);
  const [code, setCode] = useState('');
  // null = llegamos con ?email= y todavía no sabemos si la cuenta existe.
  const [isExisting, setIsExisting] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // Con ?s= resolvemos la transacción: email para mostrar y si la cuenta ya existía.
  useEffect(() => {
    if (!stateParam) return;
    let cancelled = false;
    (async () => {
      try {
        const body = await registrationApi.emailState(stateParam);
        if (cancelled) return;
        if (body?.success && body.email) {
          setEmail(body.email);
          setIsExisting(!!body.isExisting);
          if (body.businessName) setBusinessName(body.businessName);
          if (body.expired) setInfo(w.t('El código venció. Pedí uno nuevo con "Reenviar código".', 'El código venció. Pide uno nuevo con "Reenviar código".'));
        } else {
          setError(w.t('Este link ya no es válido. Pedí un código nuevo.', 'Este enlace ya no es válido. Pide un código nuevo.'));
          setStateToken('');
          setStep('form');
          setSearchParams({}, { replace: true });
        }
      } catch {
        if (cancelled) return;
        setError(w.t('Este link ya no es válido. Pedí un código nuevo.', 'Este enlace ya no es válido. Pide un código nuevo.'));
        setStateToken('');
        setStep('form');
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar con el ?s= inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phoneDigits = mobile.replace(/[^0-9]/g, '');
  const fullPhone = phoneDigits ? `${dial} ${mobile.trim()}` : '';
  const country = PHONE_COUNTRIES.find((c) => c.dial === dial) ?? PHONE_COUNTRIES[0];
  // Tú para México/España (por la landing o el código del teléfono); voseo para el resto, como siempre.
  const businessCountry = countryFromPhone(`${dial} 1`)?.code || countryParam || undefined;
  const w = getWording(businessCountry);
  const slug = useMemo(() => slugify(businessName) || 'tunegocio', [businessName]);

  const formValid = businessName.trim().length >= 2 && emailValid(email.trim()) && phoneDigits.length >= 8;
  const codeValid = code.length >= 4;

  const requestCode = async (opts: { resend?: boolean } = {}) => {
    if (loading) return;
    if (!opts.resend && !formValid) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const body = await registrationApi.emailStart(
        opts.resend && stateToken
          ? { state: stateToken }
          : {
              email: email.trim(),
              businessName: businessName.trim() || undefined,
              phone: fullPhone || undefined,
              // País del negocio por el código del teléfono (AR/UY/MX/ES); el resto queda en Argentina.
              country: countryFromPhone(fullPhone)?.code || countryParam || undefined,
              whatsAppMarketingOptIn: whatsAppOptIn,
              whatsAppMarketingOptInSource: 'web',
              ...getAttribution(),
            },
      );
      if (!body?.success) throw new Error(body?.message || w.t('No pudimos enviar el código. Intentá de nuevo.', 'No pudimos enviar el código. Inténtalo de nuevo.'));
      setIsExisting(!!body.isExisting);
      if (body.email) setEmail(body.email);
      // Lead solo cuando el formulario se completó acá y la cuenta es nueva: si vinimos desde
      // la landing, ella ya lo disparó.
      if (!opts.resend && !body.isExisting) {
        sendTrackingEvent('Lead', { name: businessName.trim(), email: email.trim(), phone: fullPhone });
      }
      setInfo(body.devCode ? `Código (dev): ${body.devCode}` : opts.resend ? 'Te reenviamos el código.' : '');
      const nextState: string = body.state || stateToken;
      setStateToken(nextState);
      const keepCountry: Record<string, string> = countryParam ? { country: countryParam } : {};
      setSearchParams(nextState ? { s: nextState, ...keepCountry } : { email: email.trim(), ...keepCountry }, { replace: true });
      setCode('');
      setStep('code');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || w.t('No pudimos enviar el código. Intentá de nuevo.', 'No pudimos enviar el código. Inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!codeValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const body = await registrationApi.emailVerify({
        ...(stateToken ? { state: stateToken } : { email: email.trim() }),
        code: code.trim(),
        ...getAttribution(),
      });
      if (!body?.success) throw new Error(body?.message || 'Código incorrecto.');
      if (!body.isExisting) {
        sendTrackingEvent('CompleteRegistration', { email: email.trim() });
        // La cuenta nace en el plan Gratuito. El evento se sigue llamando StartTrial a propósito: las
        // campañas optimizan sobre ese nombre. Solo a Clarity/GA4 (el backend ya lo manda a Meta por CAPI).
        trackFunnel('StartTrial');
      }
      if (body.redirectUrl) {
        window.location.href = body.redirectUrl;
        return; // dejamos loading en true: la página se está yendo
      }
      setError(w.t('Cuenta creada pero no pudimos redirigirte. Iniciá sesión.', 'Cuenta creada pero no pudimos redirigirte. Inicia sesión.'));
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Código incorrecto.');
      setLoading(false);
    }
  };

  const backToForm = () => {
    setStep('form');
    setCode('');
    setError('');
    setInfo('');
    setIsExisting(null);
    setStateToken('');
    setSearchParams({}, { replace: true });
  };

  // Aparición escalonada del formulario (igual que /login).
  const item = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
        };

  const alerts = (
    <>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 1.5 }}>
          {error}
        </Alert>
      )}
      {info && !error && (
        <Alert severity="info" onClose={() => setInfo('')} sx={{ mb: 2, borderRadius: 1.5 }}>
          {info}
        </Alert>
      )}
    </>
  );

  if (step === 'code') {
    return (
      <AuthShell>
        <Box component={motion.div} {...item(0.2)} key="code-head" sx={{ mb: 3.5 }}>
          <Typography sx={kickerSx}>{w.t('Confirmá tu email', 'Confirma tu email')}</Typography>
          <Typography component="h1" sx={titleSx}>
            {isExisting ? '¡Hola de nuevo!' : w.t('Ingresá el código', 'Introduce el código')}
          </Typography>
          <Typography sx={subtitleSx}>
            {isExisting
              ? w.t('Ya tenés una cuenta con este email. Te mandamos un código para entrar. ', 'Ya tienes una cuenta con este email. Te enviamos un código para entrar. ')
              : w.t('Te mandamos un código de 6 dígitos por email. ', 'Te enviamos un código de 6 dígitos por email. ')}
            {w.t('Si no lo ves, revisá spam o promociones.', 'Si no lo ves, revisa spam o promociones.')}
          </Typography>
        </Box>

        {alerts}

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
        >
          {/* Email fijo: el que pidió el código. "Cambiar" vuelve al formulario. */}
          <Box
            component={motion.div}
            {...item(0.26)}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 2,
              pb: 1,
              mb: 2.5,
              borderBottom: `1px solid ${authPalette.rule}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...kickerSx, mb: 0.4, color: authPalette.inkFaint }}>Email</Typography>
              <Typography
                sx={{
                  fontFamily: authFonts.body,
                  fontSize: 16,
                  color: authPalette.ink,
                  overflowWrap: 'anywhere',
                }}
              >
                {email || '…'}
              </Typography>
            </Box>
            <Box component="button" type="button" onClick={backToForm} disabled={loading} sx={textButtonSx}>
              Cambiar
            </Box>
          </Box>

          <Box component={motion.div} {...item(0.32)} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              variant="filled"
              name="code"
              label="Código de 6 dígitos"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="123456"
              required
              autoFocus
              disabled={loading}
              inputProps={{
                inputMode: 'numeric',
                autoComplete: 'one-time-code',
                style: { letterSpacing: '0.4em', fontSize: 22, textAlign: 'center' },
              }}
              sx={underlineFieldSx}
            />
          </Box>

          <Box component={motion.div} {...item(0.4)}>
            <PillCTA type="submit" disabled={!codeValid || loading} loading={loading}>
              Entrar a mi cuenta
            </PillCTA>
          </Box>

          <Box component={motion.div} {...item(0.48)} sx={{ textAlign: 'center', mt: 2.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => requestCode({ resend: true })}
              disabled={loading}
              sx={textButtonSx}
            >
              Reenviar código
            </Box>
          </Box>

          <Box component={motion.div} {...item(0.54)} sx={{ mt: 3 }}>
            <Typography sx={finePrintSx}>
              {isExisting
                ? w.t('Con el código entrás directo a tu panel.', 'Con el código entras directo a tu panel.')
                : w.t('Con el código entrás directo y armás tu agenda. Gratis para siempre, sin tarjeta.', 'Con el código entras directo y armas tu agenda. Gratis para siempre, sin tarjeta.')}
            </Typography>
          </Box>
        </Box>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Box component={motion.div} {...item(0.2)} key="form-head" sx={{ mb: 3.5 }}>
        <Typography sx={kickerSx}>Crear cuenta gratis</Typography>
        <Typography component="h1" sx={titleSx}>
          {w.t('Empezá gratis con tu propia agenda', 'Empieza gratis con tu propia agenda')}
        </Typography>
        <Typography sx={subtitleSx}>
          {w.t('Sin contraseña: te mandamos un código por email y entrás directo. Gratis para siempre · Sin tarjeta.', 'Sin contraseña: te enviamos un código por email y entras directo. Gratis para siempre · Sin tarjeta.')}
        </Typography>
      </Box>

      {alerts}

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          requestCode();
        }}
      >
        <Box component={motion.div} {...item(0.26)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            name="businessName"
            label="¿Cómo se llama tu negocio?"
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              setError('');
            }}
            placeholder="Ej: Estudio Lila"
            required
            autoFocus
            disabled={loading}
            autoComplete="organization"
            sx={underlineFieldSx}
          />
          <Typography
            sx={{
              fontFamily: authFonts.mono,
              fontSize: 12,
              color: authPalette.inkSoft,
              mt: 0.75,
              opacity: businessName ? 1 : 0,
              transition: 'opacity 200ms',
            }}
          >
            🌐 {slug}.turnos-pro.com
          </Typography>
        </Box>

        <Box component={motion.div} {...item(0.32)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            name="email"
            type="email"
            label="Tu email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="tu@email.com"
            required
            disabled={loading}
            autoComplete="email"
            inputProps={{ inputMode: 'email' }}
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.38)} sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
          <TextField
            select
            variant="filled"
            name="dial"
            label="País"
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            disabled={loading}
            SelectProps={{ renderValue: (v) => String(v) }}
            sx={{ ...underlineFieldSx, minWidth: 110, flexShrink: 0 }}
          >
            {PHONE_COUNTRIES.map((c) => (
              <MenuItem key={c.dial} value={c.dial} sx={{ fontFamily: authFonts.body }}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            variant="filled"
            name="mobile"
            type="tel"
            label="Tu WhatsApp"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setError('');
            }}
            placeholder={country.placeholder}
            required
            disabled={loading}
            autoComplete="tel-national"
            inputProps={{ inputMode: 'tel' }}
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.41)} sx={{ mb: 3 }}>
          <WhatsAppOptInCheckbox checked={whatsAppOptIn} onChange={setWhatsAppOptIn} disabled={loading} />
        </Box>

        <Box component={motion.div} {...item(0.44)}>
          <PillCTA type="submit" disabled={!formValid || loading} loading={loading}>
            Crear cuenta gratis
          </PillCTA>
        </Box>

        <Box component={motion.div} {...item(0.5)} sx={{ mt: 2 }}>
          <Typography sx={finePrintSx}>
            {w.t('Te mandamos un código de 6 dígitos a tu email para confirmar y armás tu agenda: rubro, servicios y horarios. No te pedimos tarjeta.', 'Te enviamos un código de 6 dígitos a tu email para confirmar y armas tu agenda: rubro, servicios y horarios. No te pedimos tarjeta.')}
          </Typography>
        </Box>

        <Box component={motion.div} {...item(0.56)} sx={{ textAlign: 'center', mt: 3 }}>
          <Typography sx={{ fontFamily: authFonts.body, fontSize: 14, color: authPalette.inkSoft }}>
            {w.t('¿Ya tenés cuenta?', '¿Ya tienes cuenta?')} <InlineLink href="/login">{w.t('Iniciá sesión →', 'Inicia sesión →')}</InlineLink>
          </Typography>
        </Box>
      </Box>
    </AuthShell>
  );
};

export default RegisterCode;
