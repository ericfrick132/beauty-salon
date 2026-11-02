'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { DemoForm, DEMO_SENT_KEY } from './DemoRequest';
import { home, sans, titleSx } from './ui';

/** sessionStorage: el popup ya se mostró en esta visita. */
const SHOWN_KEY = 'tp_exit_shown';
/** Rutas donde nunca aparece (demos, login y alta). */
const BLOCKED = /^\/(demo-admin|demo-app|login|register|registro|signup|alta|onboarding)(\/|$)/;

function read(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function mark(key: string) {
  try { sessionStorage.setItem(key, '1'); } catch { /* modo privado */ }
}

/**
 * Intención real de irse (ajuste del 02/11/2026: antes salía "random", con un timer de 45 s en mobile).
 *  - Nunca en los primeros 10 s en la página.
 *  - Escritorio (puntero fino): el cursor sale de la ventana por arriba (pestañas, barra, cerrar) y
 *    solo si ya scrolleó al menos 30% del alto del viewport (o sea, ya leyó algo).
 *  - Táctil (pointer: coarse): sin timer. Si ya llegó al 40% del alto scrolleable y después sube
 *    rápido (≥ 60% del viewport en ≤ 600 ms), el gesto típico antes de ir a la barra o volver atrás.
 * Llama a onExit una sola vez y devuelve la función que saca los listeners.
 */
function watchExitIntent(onExit: () => void): () => void {
  const MIN_MS = 10_000;
  const start = Date.now();
  let maxY = window.scrollY;
  let fired = false;
  const samples: { y: number; t: number }[] = [];
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const fire = () => {
    if (fired || Date.now() - start < MIN_MS) return;
    fired = true;
    onExit();
  };
  const onScroll = () => {
    const y = window.scrollY;
    const t = Date.now();
    if (y > maxY) maxY = y;
    if (!coarse) return;
    samples.push({ y, t });
    while (samples.length && t - samples[0].t > 600) samples.shift();
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0 || maxY < scrollable * 0.4) return;
    const peak = Math.max(...samples.map((s) => s.y));
    if (peak - y >= window.innerHeight * 0.6) fire();
  };
  const onMouseOut = (e: MouseEvent) => {
    if (e.relatedTarget || e.clientY > 0) return;
    if (maxY < window.innerHeight * 0.3) return;
    fire();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  if (!coarse) document.addEventListener('mouseout', onMouseOut);
  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mouseout', onMouseOut);
  };
}

/**
 * Popup de salida "¿Antes de irte?" (card #22): una vez por sesión, ofrece la demo con el mismo
 * formulario de la sección de precios. Solo con intención real de irse (ver watchExitIntent), nunca
 * si ya pidió la demo o tocó un formulario.
 */
export default function ExitIntent() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState('');
  const touchedForm = useRef(false);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (BLOCKED.test(window.location.pathname)) return;
    if (read(SHOWN_KEY) || read(DEMO_SENT_KEY)) return;

    const show = () => {
      if (read(SHOWN_KEY) || read(DEMO_SENT_KEY)) return;
      // Si hay otro diálogo abierto (alta, etc.) no se pisa.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      mark(SHOWN_KEY);
      setOpen(true);
    };

    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('form')) touchedForm.current = true;
    };
    document.addEventListener('focusin', onFocusIn);

    const stop = watchExitIntent(() => { if (!touchedForm.current) show(); });

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      stop();
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="salida-titulo"
      PaperProps={{ ref: paperRef, sx: { borderRadius: home.radius, bgcolor: home.card, m: { xs: 2, sm: 4 }, width: { xs: 'calc(100% - 32px)', sm: undefined } } }}
      TransitionProps={{
        onEntered: () => paperRef.current?.querySelector<HTMLInputElement>('form input:not([name="website"])')?.focus(),
      }}
    >
      <Box sx={{ position: 'relative', p: { xs: 2.5, sm: 4 } }}>
        <IconButton aria-label="Cerrar" onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 10, right: 10, color: home.inkSoft }}>
          <CloseRoundedIcon />
        </IconButton>
        <Typography id="salida-titulo" component="h2" sx={{ ...titleSx, fontSize: { xs: '1.7rem', sm: '2.1rem' }, pr: 5 }}>
          ¿Antes de irte?
        </Typography>
        <Typography sx={{ mt: 1, mb: 3, fontFamily: sans, fontSize: '1.02rem', color: home.inkSoft, lineHeight: 1.5 }}>
          Te llamamos dentro de los próximos 10 minutos.
        </Typography>
        <DemoForm plan={plan} onPlanChange={setPlan} pageSuffix="#salida" variant="callback" />
      </Box>
    </Dialog>
  );
}
