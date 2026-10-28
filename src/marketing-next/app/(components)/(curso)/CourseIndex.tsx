'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { LECCIONES, MODULOS, totalesDelCurso, type LeccionNumerada } from '@/app/(lib)/curso';
import { Wrap, home, sans, titleSx } from '../(home)/ui';
import { useCourseProgress } from './useCourseProgress';

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matches(l: LeccionNumerada, q: string) {
  if (!q) return true;
  const hay = normalize([l.titulo, l.descripcion, ...l.sinonimos, l.modulo.titulo].join(' '));
  return normalize(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export function Check({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        flex: `0 0 ${size}px`,
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${on ? home.forest : home.lineStrong}`,
        bgcolor: on ? home.forest : 'transparent',
        color: home.paper,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.55,
        fontWeight: 700,
      }}
    >
      {on ? '✓' : ''}
    </Box>
  );
}

export function ProgressCard({ seen, nextSlug }: { seen: Set<string>; nextSlug: string | null }) {
  const total = LECCIONES.length;
  const done = LECCIONES.filter((l) => seen.has(l.slug)).length;
  const pct = Math.round((done / total) * 100);
  const started = done > 0;
  return (
    <Box sx={{ bgcolor: home.card, border: `1px solid ${home.line}`, borderRadius: home.radius, p: 3 }}>
      <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem', color: home.ink, letterSpacing: '-0.02em' }}>Tu progreso</Typography>
      <Typography sx={{ mt: 0.5, fontFamily: sans, fontSize: '0.92rem', color: home.inkSoft }}>
        {done} de {total} lecciones
      </Typography>
      <Box role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Lecciones vistas" sx={{ mt: 1.5, height: 8, borderRadius: 999, bgcolor: 'rgba(23,20,16,0.08)', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: home.forest, borderRadius: 999, transition: 'width 300ms ease' }} />
      </Box>
      {nextSlug ? (
        <Box
          component={Link}
          href={`/ayuda/${nextSlug}`}
          sx={{ mt: 2.5, display: 'flex', justifyContent: 'center', px: 2.5, py: 1.3, borderRadius: 999, bgcolor: home.forest, color: home.paperSoft, fontFamily: sans, fontWeight: 600, textDecoration: 'none', '&:hover': { bgcolor: home.forestDeep } }}
        >
          {started ? 'Seguir donde quedé →' : 'Empezar el curso →'}
        </Box>
      ) : (
        <Typography sx={{ mt: 2.5, fontFamily: sans, fontWeight: 600, color: home.forest }}>¡Terminaste el curso! 🎉</Typography>
      )}
      <Typography sx={{ mt: 1.5, fontFamily: sans, fontSize: '0.78rem', color: home.inkMute }}>El progreso se guarda en este navegador.</Typography>
    </Box>
  );
}

export function nextPending(seen: Set<string>) {
  return LECCIONES.find((l) => !seen.has(l.slug))?.slug ?? null;
}

export default function CourseIndex() {
  const { seen } = useCourseProgress();
  const [q, setQ] = useState('');
  const totals = totalesDelCurso();
  const next = nextPending(seen);
  const filtered = useMemo(() => LECCIONES.filter((l) => matches(l, q.trim())), [q]);

  return (
    <Box sx={{ pb: { xs: 8, md: 12 } }}>
      <Box component="section" sx={{ pt: { xs: 5, md: 8 }, pb: { xs: 4, md: 6 } }}>
        <Wrap>
          <Typography sx={{ fontFamily: sans, fontSize: '0.88rem', fontWeight: 600, color: home.coralDeep }}>Centro de ayuda · Curso</Typography>
          <Typography component="h1" sx={{ ...titleSx, mt: 1.5, fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' }, maxWidth: 820 }}>
            Aprendé TurnosPro de principio a fin.
          </Typography>
          <Box component="dl" sx={{ m: 0, mt: 3, display: 'flex', gap: { xs: 3, md: 5 }, flexWrap: 'wrap' }}>
            {[
              [totals.modulos, 'módulos'],
              [totals.lecciones, 'lecciones'],
              ...(totals.minutos !== null ? [[totals.minutos, 'minutos']] : []),
            ].map(([n, label]) => (
              <Box key={String(label)} sx={{ display: 'flex', flexDirection: 'column-reverse' }}>
                <Box component="dt" sx={{ fontFamily: sans, fontSize: '0.85rem', color: home.inkSoft }}>{label}</Box>
                <Box component="dd" sx={{ m: 0, fontFamily: sans, fontWeight: 650, fontSize: '2rem', letterSpacing: '-0.03em', color: home.ink, lineHeight: 1.1 }}>{n}</Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 4, maxWidth: 620 }}>
            <Box component="label" htmlFor="curso-buscar" sx={{ display: 'block', fontFamily: sans, fontWeight: 600, fontSize: '0.95rem', color: home.ink, mb: 1 }}>
              ¿Qué querés hacer?
            </Box>
            <Box
              component="input"
              id="curso-buscar"
              type="search"
              value={q}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              placeholder="Ej: seña, bloquear un día, recordatorios"
              autoComplete="off"
              sx={{ width: '100%', px: 2.25, py: 1.6, borderRadius: 999, border: `1px solid ${home.lineStrong}`, bgcolor: '#fff', fontFamily: sans, fontSize: '1rem', color: home.ink, outline: 'none', '&:focus': { borderColor: home.forest, boxShadow: `0 0 0 3px ${home.forestSoft}` } }}
            />
            {q.trim() && (
              <Typography aria-live="polite" sx={{ mt: 1, fontFamily: sans, fontSize: '0.85rem', color: home.inkSoft }}>
                {filtered.length === 0 ? 'No encontramos lecciones con eso. Probá con otra palabra o escribinos por WhatsApp.' : `${filtered.length} ${filtered.length === 1 ? 'lección' : 'lecciones'}`}
              </Typography>
            )}
          </Box>
        </Wrap>
      </Box>

      <Wrap>
        <Box sx={{ display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, alignItems: 'start' }}>
          <Box sx={{ order: { xs: 1, md: 0 }, display: 'grid', gap: 3 }}>
            {MODULOS.map((m, mi) => {
              const items = filtered.filter((l) => l.modulo.slug === m.slug);
              if (items.length === 0) return null;
              const seenCount = m.lecciones.filter((l) => seen.has(l.slug)).length;
              return (
                <Box key={m.slug} component="section" aria-labelledby={`mod-${m.slug}`} sx={{ bgcolor: home.card, border: `1px solid ${home.line}`, borderRadius: home.radius, p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ fontFamily: sans, fontSize: '0.8rem', fontWeight: 600, color: home.coralDeep }}>Módulo {mi + 1}</Typography>
                      <Typography id={`mod-${m.slug}`} component="h2" sx={{ ...titleSx, fontSize: { xs: '1.45rem', md: '1.7rem' }, mt: 0.25 }}>{m.titulo}</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: sans, fontSize: '0.85rem', color: home.inkSoft }}>{seenCount} de {m.lecciones.length} vistas</Typography>
                  </Box>
                  <Typography sx={{ mt: 0.75, fontFamily: sans, fontSize: '0.95rem', color: home.inkSoft }}>{m.descripcion}</Typography>
                  <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 2, p: 0, display: 'grid', gap: 0.75 }}>
                    {items.map((l) => {
                      const on = seen.has(l.slug);
                      const isNext = l.slug === next;
                      return (
                        <Box component="li" key={l.slug}>
                          <Box
                            component={Link}
                            href={`/ayuda/${l.slug}`}
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: { xs: 1.25, sm: 1.75 }, py: 1.4, borderRadius: home.radiusSm, textDecoration: 'none', color: home.ink, bgcolor: isNext ? home.forestSoft : '#fff', border: `1px solid ${isNext ? home.forest : home.line}`, '&:hover': { borderColor: home.forest } }}
                          >
                            <Check on={on} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                <Box component="span" sx={{ fontFamily: sans, fontSize: '0.82rem', color: home.inkMute, fontVariantNumeric: 'tabular-nums' }}>{l.numero}.</Box>
                                <Box component="span" sx={{ fontFamily: sans, fontWeight: 600, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>{l.titulo}</Box>
                                {isNext && <Box component="span" sx={{ fontFamily: sans, fontSize: '0.74rem', fontWeight: 700, color: home.forestDeep }}>Sigue acá</Box>}
                              </Box>
                              <Box sx={{ mt: 0.25, fontFamily: sans, fontSize: '0.86rem', color: home.inkSoft, lineHeight: 1.45 }}>{l.descripcion}</Box>
                              {(l.plan || l.para === 'cliente') && (
                                <Box sx={{ mt: 0.5, display: 'flex', gap: 1, fontFamily: sans, fontSize: '0.74rem', fontWeight: 600 }}>
                                  {l.para === 'cliente' && <Box component="span" sx={{ color: home.inkSoft }}>Para tu cliente</Box>}
                                  {l.plan && <Box component="span" sx={{ color: home.coralDeep }}>{l.plan}</Box>}
                                </Box>
                              )}
                            </Box>
                            {l.video && <Box component="span" sx={{ fontFamily: sans, fontSize: '0.82rem', color: home.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{l.video.duracion}</Box>}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ order: { xs: 0, md: 1 }, position: { md: 'sticky' }, top: { md: 96 } }}>
            <ProgressCard seen={seen} nextSlug={next} />
          </Box>
        </Box>
      </Wrap>
    </Box>
  );
}
