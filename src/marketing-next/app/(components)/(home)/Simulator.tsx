'use client';
import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { SIM_CASES, SIM_GROUPS, type SimCase, type SimMsg } from './simulatorCases';
import { Section, SectionHead, Wrap, home, sans } from './ui';

const WA = {
  header: '#075E54',
  bg: '#EFE7DD',
  out: '#D9FDD3',
  text: '#111B21',
  meta: '#667781',
  tick: '#53BDEB',
};

/** *negrita* y _cursiva_ de WhatsApp. */
function waFormat(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok[0] === '*' ? <strong key={k++}>{tok.slice(1, -1)}</strong> : <em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Ticks() {
  return (
    <Box component="svg" viewBox="0 0 16 11" aria-label="Leído" sx={{ width: 16, height: 11, ml: 0.4, color: WA.tick, flex: '0 0 16px' }}>
      <path fill="currentColor" d="M11.07.65 10.4.05a.4.4 0 0 0-.56.04L4.6 6.4 2.08 4.02a.4.4 0 0 0-.56.01l-.6.62a.4.4 0 0 0 .01.56l3.47 3.27c.16.15.42.14.57-.03L11.1 1.2a.4.4 0 0 0-.03-.55Z" />
      <path fill="currentColor" d="M15.07.65 14.4.05a.4.4 0 0 0-.56.04L8.6 6.4l-.67-.63-.95 1.12 1.37 1.29c.16.15.42.14.57-.03L15.1 1.2a.4.4 0 0 0-.03-.55Z" />
    </Box>
  );
}

const enter = {
  animation: 'simIn 320ms cubic-bezier(.22,1,.36,1) both',
  '@keyframes simIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

function Message({ m }: { m: SimMsg }) {
  if (m.from === 'system') {
    return (
      <Box sx={{ ...enter, justifySelf: 'center', textAlign: 'center', maxWidth: '90%', px: 1.5, py: 0.5, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.88)', fontFamily: sans, fontSize: '0.74rem', color: home.forestDeep, fontWeight: 600, boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
        {m.text}
      </Box>
    );
  }
  if (m.from === 'note') {
    return (
      <Box sx={{ ...enter, justifySelf: 'center', width: '92%', px: 1.5, py: 1, borderRadius: '10px', bgcolor: '#FFF5D6', border: '1px dashed rgba(23,20,16,0.22)', fontFamily: sans }}>
        <Box sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: home.inkSoft }}>Aviso al negocio · app de TurnosPro</Box>
        <Box sx={{ mt: 0.25, fontSize: '0.84rem', fontWeight: 600, color: WA.text }}>{m.title}</Box>
        <Box sx={{ fontSize: '0.8rem', color: home.inkSoft }}>{m.text}</Box>
      </Box>
    );
  }
  const client = m.from === 'client';
  return (
    <Box sx={{ ...enter, display: 'flex', justifyContent: client ? 'flex-end' : 'flex-start' }}>
      <Box sx={{ maxWidth: '86%', bgcolor: client ? WA.out : '#fff', borderRadius: client ? '10px 2px 10px 10px' : '2px 10px 10px 10px', px: 1.25, pt: 0.75, pb: 0.5, boxShadow: '0 1px 1px rgba(0,0,0,0.07)', minWidth: 0 }}>
        {m.from === 'bot' && m.label && (
          <Box sx={{ fontFamily: sans, fontSize: '0.68rem', fontWeight: 700, color: home.forest, mb: 0.25 }}>{m.label}</Box>
        )}
        <Typography component="div" sx={{ fontFamily: sans, fontSize: '0.86rem', color: WA.text, lineHeight: 1.42, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
          {waFormat(m.text)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.1, fontFamily: sans, fontSize: '0.64rem', color: WA.meta }}>
          {m.time}
          {client && <Ticks />}
        </Box>
      </Box>
    </Box>
  );
}

function Typing() {
  return (
    <Box sx={{ ...enter, display: 'flex' }} aria-hidden>
      <Box sx={{ bgcolor: '#fff', borderRadius: '2px 10px 10px 10px', px: 1.5, py: 1.1, boxShadow: '0 1px 1px rgba(0,0,0,0.07)', display: 'flex', gap: 0.5 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: WA.meta,
              animation: 'simDot 1s ease-in-out infinite',
              animationDelay: `${i * 160}ms`,
              '@keyframes simDot': { '0%, 80%, 100%': { opacity: 0.3, transform: 'none' }, '40%': { opacity: 1, transform: 'translateY(-2px)' } },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Reproduce la conversación: "escribiendo…" antes de cada respuesta del asistente. */
function usePlayback(c: SimCase, run: number, active: boolean) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setShown(c.messages.length);
      setTyping(false);
      return;
    }
    setShown(0);
    setTyping(false);
    const timers: number[] = [];
    let t = 350;
    c.messages.forEach((m, i) => {
      if (m.from === 'bot') {
        timers.push(window.setTimeout(() => setTyping(true), t));
        // Más largo el mensaje, un poco más de "escribiendo…" (tope 1,6 s).
        t += Math.min(1600, 700 + m.text.length * 4);
        timers.push(window.setTimeout(() => { setTyping(false); setShown(i + 1); }, t));
        t += 650;
      } else {
        t += m.from === 'client' ? 450 : 250;
        timers.push(window.setTimeout(() => setShown(i + 1), t));
        t += m.from === 'client' ? 450 : 500;
      }
    });
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [c, run, active]);

  return { shown, typing, done: shown >= c.messages.length };
}

function CaseTabs({ current, onPick, variant }: { current: string; onPick: (id: string) => void; variant: 'chips' | 'list' }) {
  const ids = SIM_CASES.map((c) => c.id);
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const i = ids.indexOf(current);
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (next === undefined && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (next ?? 0) + ids.length) % ids.length;
    onPick(ids[j]);
    const el = document.getElementById(`sim-${variant}-${ids[j]}`);
    el?.focus();
  };

  const tab = (c: SimCase) => {
    const selected = c.id === current;
    return {
      id: `sim-${variant}-${c.id}`,
      role: 'tab',
      type: 'button' as const,
      'aria-selected': selected,
      'aria-controls': 'sim-chat',
      tabIndex: selected ? 0 : -1,
      onClick: () => onPick(c.id),
    };
  };

  if (variant === 'chips') {
    return (
      <Box
        role="tablist"
        aria-label="Casos"
        onKeyDown={onKey}
        sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, overflowX: 'auto', mx: -2, px: 2, pb: 1, scrollSnapType: 'x proximity', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {SIM_CASES.map((c) => {
          const selected = c.id === current;
          return (
            <Box
              key={c.id}
              component="button"
              {...tab(c)}
              sx={{ flex: '0 0 auto', scrollSnapAlign: 'start', px: 1.75, py: 1, borderRadius: 999, border: `1px solid ${selected ? home.forest : home.line}`, bgcolor: selected ? home.forest : home.card, color: selected ? home.paperSoft : home.ink, fontFamily: sans, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', '&:focus-visible': { outline: `2px solid ${home.forest}`, outlineOffset: 2 } }}
            >
              {c.title}
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box role="tablist" aria-label="Casos" aria-orientation="vertical" onKeyDown={onKey} sx={{ display: { xs: 'none', md: 'grid' }, gap: 2.5 }}>
      {(Object.keys(SIM_GROUPS) as SimCase['group'][]).map((g) => (
        <Box key={g}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1, px: 0.5 }}>
            <Typography sx={{ fontFamily: sans, fontSize: '0.8rem', fontWeight: 700, color: home.inkSoft, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{SIM_GROUPS[g].title}</Typography>
            <Typography sx={{ fontFamily: sans, fontSize: '0.74rem', fontWeight: 600, color: home.coralDeep }}>{SIM_GROUPS[g].plan}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {SIM_CASES.filter((c) => c.group === g).map((c) => {
              const selected = c.id === current;
              return (
                <Box
                  key={c.id}
                  component="button"
                  {...tab(c)}
                  sx={{ textAlign: 'left', width: '100%', px: 2, py: 1.4, borderRadius: home.radiusSm, border: `1px solid ${selected ? home.forest : home.line}`, bgcolor: selected ? home.forestSoft : home.card, cursor: 'pointer', transition: 'border-color 160ms, background-color 160ms', '&:hover': { borderColor: home.forest }, '&:focus-visible': { outline: `2px solid ${home.forest}`, outlineOffset: 2 } }}
                >
                  <Box sx={{ fontFamily: sans, fontSize: '0.98rem', fontWeight: 600, color: home.ink, letterSpacing: '-0.01em' }}>{c.title}</Box>
                  <Box sx={{ mt: 0.25, fontFamily: sans, fontSize: '0.84rem', color: home.inkSoft, lineHeight: 1.4 }}>{c.line}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function Chat({ c, run, active, onReplay }: { c: SimCase; run: number; active: boolean; onReplay: () => void }) {
  const { shown, typing, done } = usePlayback(c, run, active);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll dentro del chat (no de la página) a medida que entran los mensajes.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [shown, typing]);

  return (
    <Box id="sim-chat" role="tabpanel" aria-label={c.title} sx={{ borderRadius: '24px', overflow: 'hidden', boxShadow: home.shadow, border: `1px solid ${home.line}`, bgcolor: WA.bg }}>
      <Box sx={{ bgcolor: WA.header, color: '#fff', px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box aria-hidden sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: home.rose, color: home.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, fontSize: '0.84rem', flex: '0 0 38px' }}>EL</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.2 }}>Estudio Lila</Typography>
          <Typography sx={{ fontFamily: sans, fontSize: '0.74rem', opacity: 0.85 }} aria-live="polite">
            {typing ? 'escribiendo…' : 'en línea'}
          </Typography>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onReplay}
          disabled={!done}
          sx={{ border: 'none', borderRadius: 999, px: 1.5, py: 0.6, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontFamily: sans, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', opacity: done ? 1 : 0, transition: 'opacity 200ms', '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 } }}
        >
          ↻ Ver de nuevo
        </Box>
      </Box>
      <Box
        ref={bodyRef}
        sx={{ height: { xs: 460, md: 540 }, overflowY: 'auto', p: 1.5, display: 'grid', alignContent: 'start', gap: 0.9, overscrollBehavior: 'contain' }}
      >
        <Box sx={{ justifySelf: 'center', px: 1.25, py: 0.3, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.75)', fontFamily: sans, fontSize: '0.7rem', color: WA.meta }}>
          Datos de ejemplo
        </Box>
        {c.messages.slice(0, shown).map((m, i) => (
          <Fragment key={`${c.id}-${run}-${i}`}>
            <Message m={m} />
          </Fragment>
        ))}
        {typing && <Typing />}
      </Box>
      {/* Barra de escribir de WhatsApp, decorativa. */}
      <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 1, bgcolor: '#F0F2F5' }}>
        <Box sx={{ flex: 1, px: 1.75, py: 1, borderRadius: 999, bgcolor: '#fff', fontFamily: sans, fontSize: '0.84rem', color: WA.meta }}>Mensaje</Box>
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#00A884' }} />
      </Box>
    </Box>
  );
}

/**
 * "Probalo": casos de WhatsApp con los textos reales del bot de confirmación, los recordatorios y el
 * asistente por menú (ver simulatorCases.ts). El chat es lo principal: en mobile va arriba de todo y
 * los casos quedan como chips.
 */
export default function Simulator() {
  const [current, setCurrent] = useState(SIM_CASES[0].id);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const c = SIM_CASES.find((x) => x.id === current) ?? SIM_CASES[0];

  // Arranca cuando la sección entra en pantalla (si no, la animación pasa sin que nadie la vea).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setActive(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setActive(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = useCallback((id: string) => { setCurrent(id); setRun((r) => r + 1); setActive(true); }, []);

  return (
    <Section id="simulador">
      <Wrap>
        <SectionHead
          badge={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: home.forestSoft, color: home.forestDeep, fontFamily: sans, fontSize: '0.8rem', fontWeight: 600 }}>
              <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#25D366' }} />
              En vivo · {SIM_CASES.length} casos
            </Box>
          }
          title="Probalo"
          line="Tocá un caso y mirá cómo responde."
        />
        <Box ref={rootRef} sx={{ display: 'grid', gap: { xs: 1.5, md: 5 }, gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 0.85fr) 1.15fr' }, alignItems: 'start' }}>
          <Box sx={{ order: { xs: 0, md: 0 } }}>
            <CaseTabs current={current} onPick={pick} variant="list" />
            <CaseTabs current={current} onPick={pick} variant="chips" />
            <Typography sx={{ display: { xs: 'block', md: 'none' }, fontFamily: sans, fontSize: '0.88rem', color: home.inkSoft, lineHeight: 1.4, mt: 0.5 }}>
              {c.line} <Box component="span" sx={{ color: home.coralDeep, fontWeight: 600 }}>{SIM_GROUPS[c.group].plan}.</Box>
            </Typography>
          </Box>
          <Chat c={c} run={run} active={active} onReplay={() => setRun((r) => r + 1)} />
        </Box>
        <Typography sx={{ mt: { xs: 2.5, md: 4 }, mx: 'auto', maxWidth: 760, textAlign: 'center', fontFamily: sans, fontSize: '0.86rem', color: home.inkSoft, lineHeight: 1.55 }}>
          Son los mensajes que manda TurnosPro, tal cual: solo cambiamos el negocio, la clienta, las fechas y los precios por datos de ejemplo.
          El plan Gratis no incluye WhatsApp: los recordatorios y la confirmación vienen desde Plus, y el asistente por menú es un add-on desde Plus.
        </Typography>
      </Wrap>
    </Section>
  );
}
