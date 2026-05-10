import React, { useEffect, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Alert } from '@mui/material';

// We bypass the @react-oauth/google `<GoogleLogin>` component and call the
// underlying GSI library directly so we can pass the `context` option to
// `google.accounts.id.initialize()`. Without it, signed-in users see the
// personalized button as "Iniciar sesión como X" even on /register —
// `context: 'signup'` makes Google render it as "Registrarse como X".
// The `<GoogleLogin>` component does not forward `context`.

interface Props {
  onSuccess: (idToken: string) => void;
  onError?: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  context?: 'signin' | 'signup' | 'use';
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const GsiButton: React.FC<Props> = ({
  onSuccess,
  onError,
  text = 'continue_with',
  context = 'signin',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onSuccess, onError });
  callbacksRef.current = { onSuccess, onError };

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const g = (window as any).google;
      if (!g?.accounts?.id) {
        window.setTimeout(init, 80);
        return;
      }
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        context,
        callback: (resp: { credential?: string }) => {
          if (resp?.credential) callbacksRef.current.onSuccess(resp.credential);
          else callbacksRef.current.onError?.('No se recibió credential de Google');
        },
      });
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        g.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          locale: 'es',
          width: 320,
        });
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [context, text]);

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}
    />
  );
};

const GoogleSignInButton: React.FC<Props> = (props) => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Alert severity="warning" sx={{ my: 1 }}>
        Google Sign-In no configurado. Falta <code>REACT_APP_GOOGLE_CLIENT_ID</code> en el <code>.env</code>.
      </Alert>
    );
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GsiButton {...props} />
    </GoogleOAuthProvider>
  );
};

export default GoogleSignInButton;
