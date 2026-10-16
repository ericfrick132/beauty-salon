'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Box } from '@mui/material';

// Piloto automático de las demos: un cursor falso que recorre la UI real haciendo clic y tipeando,
// así la demo "se mueve sola". Se corta apenas el visitante hace clic o tipea dentro de la demo.

class Aborted extends Error {}

export type Query = string | HTMLElement | (() => HTMLElement | null | undefined);

export type Pilot = {
  sleep: (ms: number) => Promise<void>;
  caption: (text: string) => void;
  find: (q: Query, timeout?: number) => Promise<HTMLElement>;
  exists: (q: Query) => HTMLElement | null;
  all: (selector: string) => HTMLElement[];
  move: (q: Query) => Promise<HTMLElement>;
  tap: (q: Query) => Promise<HTMLElement>;
  type: (q: Query, text: string) => Promise<void>;
  pick: (label: string, option: string | number) => Promise<void>;
  scrollWindow: (top: number) => Promise<void>;
};

type Cursor = { x: number; y: number; visible: boolean; pressed: number };

const visible = (el: Element) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]');

export function useAutopilot({
  overlay,
  root,
  script,
  windowScroll = false,
}: {
  overlay: RefObject<HTMLElement>;
  root: RefObject<HTMLElement>;
  script: (p: Pilot, round: number) => Promise<void>;
  windowScroll?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [caption, setCaption] = useState('');
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0, visible: false, pressed: 0 });
  const token = useRef(0);
  const scriptRef = useRef(script);
  scriptRef.current = script;

  const stop = useCallback(() => {
    token.current++;
    setRunning(false);
    setCursor((c) => ({ ...c, visible: false }));
  }, []);

  const start = useCallback(() => {
    const my = ++token.current;
    setRunning(true);
    const alive = () => { if (token.current !== my) throw new Aborted(); };
    const sleep = (ms: number) => new Promise<void>((resolve, reject) => {
      window.setTimeout(() => (token.current === my ? resolve() : reject(new Aborted())), ms);
    });

    const resolveQ = (q: Query): HTMLElement | null => {
      const el = typeof q === 'string'
        ? Array.from(document.querySelectorAll<HTMLElement>(q)).find(visible) ?? null
        : q instanceof HTMLElement ? q : q() ?? null;
      return el && visible(el) ? el : null;
    };

    const find = async (q: Query, timeout = 4000) => {
      const until = Date.now() + timeout;
      for (;;) {
        alive();
        const el = resolveQ(q);
        if (el) return el;
        if (Date.now() > until) throw new Error(`autopilot: no encontré ${typeof q === 'string' ? q : 'el elemento'}`);
        await sleep(120);
      }
    };

    // Lleva el elemento a la vista: primero dentro de sus contenedores con scroll, después la ventana.
    const reveal = async (el: HTMLElement) => {
      let scrolled = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const st = getComputedStyle(p);
        if (!/(auto|scroll)/.test(st.overflowY) || p.scrollHeight <= p.clientHeight + 1) continue;
        const pr = p.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (er.top < pr.top + 8 || er.bottom > pr.bottom - 8) {
          p.scrollTo({ top: p.scrollTop + (er.top - pr.top) - pr.height / 2 + er.height / 2, behavior: 'smooth' });
          scrolled = true;
        }
      }
      if (windowScroll) {
        const er = el.getBoundingClientRect();
        if (er.top < 130 || er.bottom > window.innerHeight - 220) {
          window.scrollTo({ top: window.scrollY + er.top - window.innerHeight * 0.38, behavior: 'smooth' });
          scrolled = true;
        }
      }
      if (scrolled) await sleep(550);
    };

    const move = async (q: Query) => {
      const el = await find(q);
      await reveal(el);
      const o = overlay.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!o) throw new Aborted();
      setCursor((c) => ({ ...c, visible: true, x: r.left - o.left + Math.min(r.width / 2, 60), y: r.top - o.top + r.height / 2 }));
      await sleep(720);
      return el;
    };

    const press = async () => {
      setCursor((c) => ({ ...c, pressed: c.pressed + 1 }));
      await sleep(160);
    };

    const tap = async (q: Query) => {
      const el = await move(q);
      await press();
      alive();
      el.click();
      await sleep(260);
      return el;
    };

    const type = async (q: Query, text: string) => {
      const el = (await tap(q)) as HTMLInputElement;
      const input = (el.matches('input, textarea') ? el : el.querySelector('input, textarea')) as HTMLInputElement;
      const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const set = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
      input.focus({ preventScroll: true });
      set.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      for (const ch of text) {
        alive();
        set.call(input, input.value + ch);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(38 + Math.random() * 45);
      }
      input.blur();
      await sleep(250);
    };

    // Select de MUI: abre con mousedown sobre el combobox y elige la opción del listbox.
    const pick = async (label: string, option: string | number) => {
      const combo = await find(() => {
        const lbl = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] label, main label')).find((l) => visible(l) && l.textContent?.replace('*', '').trim() === label);
        return lbl?.closest('.MuiFormControl-root')?.querySelector<HTMLElement>('[role="combobox"], [aria-haspopup="listbox"]');
      });
      await move(combo);
      await press();
      combo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      await sleep(450);
      const opt = await find(() => {
        const opts = Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"] [role="option"]'));
        return typeof option === 'number' ? opts[option] : opts.find((o) => o.textContent?.includes(option));
      });
      await tap(opt);
      await sleep(250);
    };

    const scrollWindowTo = async (top: number) => {
      window.scrollTo({ top, behavior: 'smooth' });
      await sleep(900);
    };

    const pilot: Pilot = {
      sleep,
      caption: (t) => { alive(); setCaption(t); },
      find,
      exists: resolveQ,
      all: (sel) => Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(visible),
      move,
      tap,
      type,
      pick,
      scrollWindow: scrollWindowTo,
    };

    (async () => {
      for (let round = 0; token.current === my; round++) {
        try {
          await scriptRef.current(pilot, round);
        } catch (e) {
          if (e instanceof Aborted) return;
          // Si algo de la UI no apareció, se reintenta desde el principio en vez de quedar trabado.
          console.warn(e);
          try { await sleep(800); } catch { return; }
        }
      }
    })();
  }, [overlay, windowScroll]);

  // El visitante toma el control con cualquier clic o tecla real dentro de la demo.
  useEffect(() => {
    if (!running) return;
    const onUser = (e: Event) => {
      if (!e.isTrusted) return;
      const target = e.target as Element | null;
      if (target?.closest?.('[data-autopilot-ui]')) return;
      if (root.current && target && !root.current.contains(target) && !target.closest?.('.MuiPopover-root, .MuiDialog-root, .MuiModal-root')) return;
      stop();
    };
    document.addEventListener('click', onUser, true);
    document.addEventListener('keydown', onUser, true);
    return () => {
      document.removeEventListener('click', onUser, true);
      document.removeEventListener('keydown', onUser, true);
    };
  }, [running, root, stop]);

  useEffect(() => () => { token.current++; }, []);

  return { running, caption, cursor, start, stop };
}

// Cursor: dedo (círculo) para el celular, flecha para el panel. El "pressed" cambia en cada clic y relanza el pulso.
export function AutopilotCursor({ cursor, variant }: { cursor: Cursor; variant: 'touch' | 'mouse' }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 1,
        transform: `translate(${cursor.x}px, ${cursor.y}px)`,
        transition: 'transform 680ms cubic-bezier(.45,.05,.25,1), opacity 300ms ease',
        opacity: cursor.visible ? 1 : 0,
      }}
    >
      <Box
        key={cursor.pressed}
        sx={{
          position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: '50%',
          border: '2px solid rgba(37,99,235,0.85)', opacity: 0,
          animation: cursor.pressed ? 'tpPulse 520ms ease-out' : 'none',
          '@keyframes tpPulse': { from: { opacity: 1, transform: 'scale(0.35)' }, to: { opacity: 0, transform: 'scale(1.25)' } },
        }}
      />
      {variant === 'touch' ? (
        <Box
          key={`f${cursor.pressed}`}
          sx={{
            position: 'absolute', left: -15, top: -15, width: 30, height: 30, borderRadius: '50%',
            bgcolor: 'rgba(23,20,16,0.28)', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            animation: cursor.pressed ? 'tpPress 300ms ease' : 'none',
            '@keyframes tpPress': { '50%': { transform: 'scale(0.78)' } },
          }}
        />
      ) : (
        <Box
          component="svg"
          viewBox="0 0 24 24"
          key={`m${cursor.pressed}`}
          sx={{
            position: 'absolute', left: -4, top: -3, width: 26, height: 26, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))',
            animation: cursor.pressed ? 'tpClick 260ms ease' : 'none',
            '@keyframes tpClick': { '50%': { transform: 'scale(0.86)' } },
          }}
        >
          <path d="M4 2.5l15.5 9.2-6.9 1.3 3.9 7.4-2.9 1.5-3.9-7.4L4.6 19z" fill="#111827" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </Box>
      )}
    </Box>
  );
}
