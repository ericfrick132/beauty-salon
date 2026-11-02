'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { DemoForm, DEMO_SENT_KEY } from './DemoRequest';
import { home, sans, titleSx } from './ui';

/** sessionStorage: el popup ya se mostró en esta visita. */
const SHOWN_KEY = 'tp_exit_shown';
/** En mobile no hay "mouse que sale": se ofrece a los 45 s si no tocó ningún formulario. */
const MOBILE_DELAY_MS = 45_000;
/** Rutas donde nunca aparece (demos, login y alta). */
const BLOCKED = /^\/(demo-admin|demo-app|login|register|registro|signup|alta|onboarding)(\/|$)/;

function read(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function mark(key: string) {
  try { sessionStorage.setItem(key, '1'); } catch { /* modo privado */ }
}

/**
 * Popup de salida "¿Antes de irte?" (card #22): una vez por sesión, ofrece la demo con el mismo
 * formulario de la sección de precios. Escritorio: cuando el mouse sale por arriba de la ventana.
 * Mobile: a los 45 s, salvo que ya haya tocado un formulario. Nunca si ya pidió la demo.
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

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let timer: number | undefined;
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) show();
    };
    if (finePointer) {
      document.addEventListener('mouseout', onMouseOut);
    } else {
      timer = window.setTimeout(() => {
        if (!touchedForm.current) show();
      }, MOBILE_DELAY_MS);
    }

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('mouseout', onMouseOut);
      if (timer) window.clearTimeout(timer);
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
          Te mostramos TurnosPro con tu caso, en una demo corta.
        </Typography>
        <DemoForm plan={plan} onPlanChange={setPlan} pageSuffix="#salida" />
      </Box>
    </Dialog>
  );
}
