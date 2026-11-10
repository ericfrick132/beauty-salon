'use client';

import { installTurnstile } from '@/app/(lib)/turnstile';

// Captcha de Cloudflare en logins y altas (ver (lib)/turnstile): se instala apenas carga el bundle del
// cliente, antes de que nadie pueda mandar un formulario.
if (typeof window !== 'undefined') installTurnstile();

export default function TurnstileInstaller() {
  return null;
}
