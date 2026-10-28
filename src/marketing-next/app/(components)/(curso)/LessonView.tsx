'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { LECCIONES, leccionPorSlug } from '@/app/(lib)/curso';
import { Wrap, home, sans, titleSx } from '../(home)/ui';
import { useCourseProgress } from './useCourseProgress';
import { Check } from './CourseIndex';

const SALES_WA = '5491126693551';

const AUTO_NEXT_SECONDS = 5;

export default function LessonView({ slug }: { slug: string }) {
  const l = leccionPorSlug(slug)!;
  const router = useRouter();
  const { seen, markSeen, toggle } = useCourseProgress();
  const idx = LECCIONES.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? LECCIONES[idx - 1] : null;
  const next = idx < LECCIONES.length - 1 ? LECCIONES[idx + 1] : null;
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  const stopCountdown = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
  };

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  // Al terminar el video: vista y aviso cancelable de 5 s antes de pasar a la próxima.
  const onVideoEnded = () => {
    markSeen(l.slug);
    if (!next) return;
    setCountdown(AUTO_NEXT_SECONDS);
    timer.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          if (timer.current) window.clearInterval(timer.current);
          timer.current = null;
          router.push(`/ayuda/${next.slug}`);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const markAndContinue = () => {
    markSeen(l.slug);
    router.push(next ? `/ayuda/${next.slug}` : '/ayuda');
  };

  const isSeen = seen.has(l.slug);
  const waHref = `https://wa.me/${SALES_WA}?text=${encodeURIComponent(`Hola! Tengo una duda con TurnosPro: ${l.titulo.toLowerCase()}`)}`;

  return (
    <Box sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 8, md: 12 } }}>
      <Wrap max={860}>
        <Box component="nav" aria-label="Migas" sx={{ fontFamily: sans, fontSize: '0.85rem', color: home.inkSoft, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Box component={Link} href="/ayuda" sx={{ color: home.inkSoft, '&:hover': { color: home.ink } }}>Curso de TurnosPro</Box>
          <span aria-hidden>/</span>
          <span>Módulo {l.moduloNumero} · {l.modulo.titulo}</span>
        </Box>
        <Typography sx={{ mt: 2, fontFamily: sans, fontSize: '0.85rem', fontWeight: 600, color: home.coralDeep }}>
          Lección {l.numero} de {LECCIONES.length}
          {l.plan ? ` · ${l.plan}` : ''}
          {l.para === 'cliente' ? ' · Para tu cliente' : ''}
        </Typography>
        <Typography component="h1" sx={{ ...titleSx, mt: 1, fontSize: { xs: '2.1rem', sm: '2.6rem', md: '3.1rem' } }}>{l.titulo}</Typography>
        <Typography sx={{ mt: 1.5, fontFamily: sans, fontSize: { xs: '1.05rem', md: '1.15rem' }, color: home.inkSoft, lineHeight: 1.55 }}>{l.descripcion}</Typography>
        <Typography sx={{ mt: 1.5, fontFamily: sans, fontSize: '0.88rem', color: home.inkMute }}>
          También sirve si buscás: {l.sinonimos.join(', ')}.
        </Typography>

        {/* Video (fase 2). Hasta que exista, placeholder con el mismo tamaño. */}
        <Box sx={{ mt: 3.5, position: 'relative', aspectRatio: '16 / 9', borderRadius: home.radius, overflow: 'hidden', bgcolor: home.ink, border: `1px solid ${home.line}` }}>
          {l.video ? (
            <Box
              component="video"
              src={`/ayuda/${l.slug}.mp4`}
              poster={`/ayuda/${l.slug}.jpg`}
              controls
              playsInline
              preload="metadata"
              onEnded={onVideoEnded}
              sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', bgcolor: '#000' }}
            />
          ) : (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'rgba(244,239,230,0.85)', textAlign: 'center', px: 2 }}>
              <Box aria-hidden sx={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid rgba(244,239,230,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>▶</Box>
              <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem' }}>Video en preparación</Typography>
              <Typography sx={{ fontFamily: sans, fontSize: '0.88rem', color: 'rgba(244,239,230,0.6)' }}>Mientras tanto, seguí el paso a paso de abajo.</Typography>
            </Box>
          )}
        </Box>

        {countdown !== null && next && (
          <Box role="status" sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', px: 2.5, py: 1.5, borderRadius: home.radiusSm, bgcolor: home.forestSoft, border: `1px solid ${home.forest}`, fontFamily: sans }}>
            <span>Sigue «{next.titulo}» en {countdown} s</span>
            <Box component="button" type="button" onClick={stopCountdown} sx={{ border: 'none', bgcolor: 'transparent', color: home.forestDeep, fontFamily: sans, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
              Cancelar
            </Box>
          </Box>
        )}

        <Box component="section" aria-labelledby="paso-a-paso" sx={{ mt: 5 }}>
          <Typography id="paso-a-paso" component="h2" sx={{ ...titleSx, fontSize: { xs: '1.6rem', md: '1.9rem' } }}>Paso a paso</Typography>
          <Typography sx={{ mt: 0.75, fontFamily: sans, color: home.inkSoft }}>Con los nombres de los botones tal cual los ves en TurnosPro.</Typography>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, display: 'grid', gap: 1.25 }}>
            {l.pasos.map((p, i) => (
              <Box component="li" key={i} id={`paso-${i + 1}`} sx={{ scrollMarginTop: 96, display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, borderRadius: home.radiusSm, bgcolor: home.card, border: `1px solid ${home.line}` }}>
                <Box aria-hidden sx={{ flex: '0 0 28px', height: 28, borderRadius: '50%', bgcolor: home.ink, color: home.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, fontSize: '0.85rem' }}>{i + 1}</Box>
                <Typography sx={{ fontFamily: sans, fontSize: '1rem', color: home.ink, lineHeight: 1.55, pt: '2px' }}>{p}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {!l.video && (
            <Box component="button" type="button" onClick={markAndContinue} sx={{ px: 3, py: 1.4, borderRadius: 999, border: 'none', cursor: 'pointer', bgcolor: home.forest, color: home.paperSoft, fontFamily: sans, fontWeight: 600, fontSize: '1rem', '&:hover': { bgcolor: home.forestDeep } }}>
              {next ? 'Marcar como vista y seguir →' : 'Marcar como vista y volver al curso'}
            </Box>
          )}
          <Box component="button" type="button" onClick={() => toggle(l.slug)} aria-pressed={isSeen} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1.2, borderRadius: 999, border: `1px solid ${home.lineStrong}`, bgcolor: 'transparent', cursor: 'pointer', fontFamily: sans, fontSize: '0.92rem', color: home.ink }}>
            <Check on={isSeen} size={18} /> {isSeen ? 'Vista' : 'Marcar como vista'}
          </Box>
        </Box>

        {l.pdf && (
          <Box component="section" sx={{ mt: 5, p: 3, borderRadius: home.radius, bgcolor: home.cardAlt, border: `1px solid ${home.line}` }}>
            <Typography component="h2" sx={{ ...titleSx, fontSize: '1.35rem' }}>Para tener al lado</Typography>
            <Typography sx={{ mt: 0.75, fontFamily: sans, color: home.inkSoft }}>El manual con cada paso y la pantalla donde se toca, para imprimir.</Typography>
            <Box component="a" href={`/ayuda/${l.slug}.pdf`} download sx={{ display: 'inline-block', mt: 2, fontFamily: sans, fontWeight: 600, color: home.forest }}>Bajar el manual en PDF</Box>
          </Box>
        )}

        <Box component="section" sx={{ mt: 5, p: 3, borderRadius: home.radius, bgcolor: home.card, border: `1px solid ${home.line}` }}>
          <Typography component="h2" sx={{ ...titleSx, fontSize: '1.35rem' }}>¿Te quedó alguna duda?</Typography>
          <Typography sx={{ mt: 0.75, fontFamily: sans, color: home.inkSoft }}>Escribinos por WhatsApp y te ayudamos a resolverlo.</Typography>
          <Box component="a" href={waHref} target="_blank" rel="noopener" sx={{ display: 'inline-flex', mt: 2, px: 2.5, py: 1.2, borderRadius: 999, bgcolor: home.forest, color: home.paperSoft, fontFamily: sans, fontWeight: 600, textDecoration: 'none', '&:hover': { bgcolor: home.forestDeep } }}>
            Escribinos por WhatsApp
          </Box>
        </Box>

        <Box component="nav" aria-label="Lecciones" sx={{ mt: 5, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {prev ? (
            <Box component={Link} href={`/ayuda/${prev.slug}`} sx={{ p: 2, borderRadius: home.radiusSm, border: `1px solid ${home.line}`, textDecoration: 'none', color: home.ink, '&:hover': { borderColor: home.forest } }}>
              <Box sx={{ fontFamily: sans, fontSize: '0.8rem', color: home.inkSoft }}>← Anterior</Box>
              <Box sx={{ fontFamily: sans, fontWeight: 600 }}>{prev.titulo}</Box>
            </Box>
          ) : <span />}
          {next ? (
            <Box component={Link} href={`/ayuda/${next.slug}`} sx={{ p: 2, borderRadius: home.radiusSm, border: `1px solid ${home.line}`, textDecoration: 'none', color: home.ink, textAlign: { sm: 'right' }, '&:hover': { borderColor: home.forest } }}>
              <Box sx={{ fontFamily: sans, fontSize: '0.8rem', color: home.inkSoft }}>Siguiente →</Box>
              <Box sx={{ fontFamily: sans, fontWeight: 600 }}>{next.titulo}</Box>
            </Box>
          ) : (
            <Box component={Link} href="/ayuda" sx={{ p: 2, borderRadius: home.radiusSm, border: `1px solid ${home.line}`, textDecoration: 'none', color: home.ink, textAlign: { sm: 'right' } }}>
              <Box sx={{ fontFamily: sans, fontSize: '0.8rem', color: home.inkSoft }}>Fin del curso</Box>
              <Box sx={{ fontFamily: sans, fontWeight: 600 }}>Volver al índice</Box>
            </Box>
          )}
        </Box>
      </Wrap>
    </Box>
  );
}
