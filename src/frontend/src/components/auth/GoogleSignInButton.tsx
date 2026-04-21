import React from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Alert, Box } from '@mui/material';

interface Props {
  onSuccess: (idToken: string) => void;
  onError?: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const GoogleSignInButton: React.FC<Props> = ({ onSuccess, onError, text = 'continue_with' }) => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Alert severity="warning" sx={{ my: 1 }}>
        Google Sign-In no configurado. Falta <code>REACT_APP_GOOGLE_CLIENT_ID</code> en el <code>.env</code>.
      </Alert>
    );
  }

  const handle = (response: CredentialResponse) => {
    if (response.credential) {
      onSuccess(response.credential);
    } else if (onError) {
      onError('No se recibió credential de Google');
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
        <GoogleLogin
          onSuccess={handle}
          onError={() => onError && onError('Error al autenticar con Google')}
          theme="outline"
          shape="pill"
          size="large"
          text={text}
          locale="es"
          width="320"
        />
      </Box>
    </GoogleOAuthProvider>
  );
};

export default GoogleSignInButton;
