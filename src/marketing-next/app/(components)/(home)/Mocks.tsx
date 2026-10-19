'use client';
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { home, sans } from './ui';

/**
 * Mocks HTML/CSS de la UI real de TurnosPro (nada de imágenes): página de reservas (/book),
 * ticket con seña de Mercado Pago, WhatsApp de confirmación, asistente por menú y agenda semanal.
 * Los datos son de ejemplo y se ven como ejemplo (Estudio Lila).
 */

const mono = 'var(--font-mono), ui-monospace, monospace';

function Window({ url, children, sx }: { url: string; children: ReactNode; sx?: object }) {
  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: '18px', boxShadow: home.shadow, border: `1px solid ${home.line}`, overflow: 'hidden', ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 1.1, borderBottom: `1px solid ${home.line}`, bgcolor: '#FAFAF8' }}>
        <Box sx={{ display: 'flex', gap: 0.6 }} aria-hidden>
          {['#F26B5B', '#F4C038', '#5DBB63'].map((c) => (
            <Box key={c} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, mx: 1, px: 1.5, py: 0.4, borderRadius: 999, bgcolor: 'rgba(23,20,16,0.05)', fontFamily: mono, fontSize: '0.7rem', color: home.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          🔒 {url}
        </Box>
      </Box>
      {children}
    </Box>
  );
}

/** Página de reservas del negocio: servicio → día → horario. */
export function BookingPageMock() {
  const days = [
    { d: 'Lun', n: 20 },
    { d: 'Mar', n: 21, active: true },
    { d: 'Mié', n: 22 },
    { d: 'Jue', n: 23 },
    { d: 'Vie', n: 24 },
  ];
  const slots = ['10:00', '11:30', '13:00', '15:30', '17:00', '18:30'];
  return (
    <Window url="estudiolila.turnos-pro.com/book">
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: home.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, color: home.ink }}>EL</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.02em', color: home.ink }}>Estudio Lila</Typography>
            <Typography sx={{ fontFamily: sans, fontSize: '0.78rem', color: home.inkSoft }}>Peluquería · Palermo</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
          {[
            { s: 'Corte y brushing', t: '45 min', p: '$12.000', sel: true },
            { s: 'Color completo', t: '2 h', p: '$38.000' },
          ].map((x) => (
            <Box key={x.s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, py: 1.1, borderRadius: '12px', border: `1.5px solid ${x.sel ? home.forest : home.line}`, bgcolor: x.sel ? home.forestSoft : '#fff' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: sans, fontSize: '0.88rem', fontWeight: 600, color: home.ink }}>{x.s}</Typography>
                <Typography sx={{ fontFamily: sans, fontSize: '0.74rem', color: home.inkSoft }}>{x.t}</Typography>
              </Box>
              <Typography sx={{ fontFamily: sans, fontSize: '0.88rem', fontWeight: 600, color: home.ink }}>{x.p}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.75, mb: 1.5 }}>
          {days.map((x) => (
            <Box key={x.n} sx={{ textAlign: 'center', py: 0.9, borderRadius: '12px', bgcolor: x.active ? home.ink : 'rgba(23,20,16,0.04)', color: x.active ? home.paper : home.ink }}>
              <Typography sx={{ fontFamily: sans, fontSize: '0.68rem', opacity: 0.75 }}>{x.d}</Typography>
              <Typography sx={{ fontFamily: sans, fontSize: '0.95rem', fontWeight: 600 }}>{x.n}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75, mb: 2 }}>
          {slots.map((s) => (
            <Box key={s} sx={{ textAlign: 'center', py: 0.8, borderRadius: '10px', border: `1px solid ${s === '15:30' ? home.forest : home.line}`, bgcolor: s === '15:30' ? home.forest : '#fff', color: s === '15:30' ? home.paper : home.ink, fontFamily: sans, fontSize: '0.82rem', fontWeight: 600 }}>
              {s}
            </Box>
          ))}
        </Box>
        <Box sx={{ textAlign: 'center', py: 1.25, borderRadius: 999, bgcolor: home.forest, color: home.paper, fontFamily: sans, fontWeight: 600, fontSize: '0.92rem' }}>
          Reservar martes 21 · 15:30
        </Box>
      </Box>
    </Window>
  );
}

/** Ticket del turno con la seña cobrada por Mercado Pago. */
export function DepositMock() {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, maxWidth: 420, mx: 'auto' }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: '18px', boxShadow: home.shadow, border: `1px solid ${home.line}`, p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.02em', color: home.ink }}>Turno reservado</Typography>
          <Box sx={{ px: 1.25, py: 0.3, borderRadius: 999, bgcolor: home.forestSoft, color: home.forestDeep, fontFamily: sans, fontSize: '0.74rem', fontWeight: 600 }}>Seña pagada</Box>
        </Box>
        {[
          ['Servicio', 'Corte y brushing'],
          ['Cuándo', 'Martes 21 · 15:30'],
          ['Con', 'Belén'],
        ].map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, fontFamily: sans, fontSize: '0.88rem' }}>
            <Box component="span" sx={{ color: home.inkSoft }}>{k}</Box>
            <Box component="span" sx={{ color: home.ink, fontWeight: 500 }}>{v}</Box>
          </Box>
        ))}
        <Box sx={{ borderTop: `1px dashed ${home.lineStrong}`, my: 1.25 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, fontFamily: sans, fontSize: '0.88rem' }}>
          <Box component="span" sx={{ color: home.inkSoft }}>Seña (30%)</Box>
          <Box component="span" sx={{ color: home.forest, fontWeight: 700 }}>$3.600</Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, fontFamily: sans, fontSize: '0.88rem' }}>
          <Box component="span" sx={{ color: home.inkSoft }}>Saldo en el local</Box>
          <Box component="span" sx={{ color: home.ink, fontWeight: 500 }}>$8.400</Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#fff', borderRadius: '14px', border: `1px solid ${home.line}`, px: 2, py: 1.25, boxShadow: home.shadow }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#009EE3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: '0.72rem', flex: '0 0 34px' }}>MP</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: sans, fontSize: '0.86rem', fontWeight: 600, color: home.ink }}>Recibiste $3.600</Typography>
          <Typography sx={{ fontFamily: sans, fontSize: '0.76rem', color: home.inkSoft }}>Mercado Pago · en tu propia cuenta</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function Bubble({ from, children, time }: { from: 'biz' | 'client'; children: ReactNode; time: string }) {
  const biz = from === 'biz';
  return (
    <Box sx={{ display: 'flex', justifyContent: biz ? 'flex-start' : 'flex-end' }}>
      <Box sx={{ maxWidth: '86%', bgcolor: biz ? '#fff' : '#D9FDD3', borderRadius: biz ? '4px 14px 14px 14px' : '14px 4px 14px 14px', px: 1.5, py: 1, boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
        <Typography component="div" sx={{ fontFamily: sans, fontSize: '0.84rem', color: '#111B21', lineHeight: 1.45, whiteSpace: 'pre-line' }}>{children}</Typography>
        <Typography sx={{ fontFamily: sans, fontSize: '0.64rem', color: '#667781', textAlign: 'right', mt: 0.25 }}>{time}</Typography>
      </Box>
    </Box>
  );
}

function Phone({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 380, mx: 'auto', borderRadius: '24px', overflow: 'hidden', boxShadow: home.shadow, border: `1px solid ${home.line}` }}>
      <Box sx={{ bgcolor: '#075E54', color: '#fff', px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: home.rose, color: home.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, fontSize: '0.8rem' }}>EL</Box>
        <Box>
          <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '0.92rem' }}>{title}</Typography>
          <Typography sx={{ fontFamily: sans, fontSize: '0.7rem', opacity: 0.8 }}>{subtitle}</Typography>
        </Box>
      </Box>
      <Box sx={{ bgcolor: '#EFE7DD', p: 1.5, display: 'grid', gap: 1 }}>{children}</Box>
    </Box>
  );
}

/** Pedido de confirmación por WhatsApp (bot de confirmación, desde Plus). */
export function WhatsAppReminderMock() {
  return (
    <Phone title="Estudio Lila" subtitle="WhatsApp del negocio">
      <Bubble from="biz" time="10:00">
        {'Hola Sofi! Te escribimos de Estudio Lila por tu turno de Corte y brushing mañana a las 15:30.\n\nRespondé 1 para confirmar ✅ o 2 para cancelar ❌'}
      </Bubble>
      <Bubble from="client" time="10:04">1</Bubble>
      <Bubble from="biz" time="10:04">¡Gracias Sofi! Tu turno quedó confirmado. Te esperamos 😊</Bubble>
      <Box sx={{ justifySelf: 'center', mt: 0.5, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.85)', fontFamily: sans, fontSize: '0.72rem', color: home.forestDeep, fontWeight: 600 }}>
        ✓ Confirmado en tu agenda
      </Box>
    </Phone>
  );
}

/** Asistente de WhatsApp por menú (add-on, desde Plus): reserva, consulta y cancela turnos. */
export function AssistantMock() {
  return (
    <Phone title="Estudio Lila" subtitle="Asistente · responde al instante">
      <Bubble from="client" time="23:12">Hola! quiero un turno</Bubble>
      <Bubble from="biz" time="23:12">
        {'¡Hola Sofi! 👋 Soy el asistente de Estudio Lila.\n¿Qué querés hacer?\n\n1️⃣ Reservar un turno\n2️⃣ Ver mis turnos\n3️⃣ Cancelar un turno\n4️⃣ Servicios y precios\n5️⃣ Hablar con el negocio'}
      </Bubble>
      <Bubble from="client" time="23:12">1</Bubble>
      <Bubble from="biz" time="23:13">{'¿Qué servicio querés?\n1. Corte y brushing · $12.000\n2. Color completo · $38.000'}</Bubble>
    </Phone>
  );
}

/** Agenda semanal del panel, con un color por profesional. */
export function WeekAgendaMock() {
  const days = ['Lun 20', 'Mar 21', 'Mié 22', 'Jue 23', 'Vie 24', 'Sáb 25'];
  const hours = ['10', '11', '12', '13', '14', '15', '16', '17'];
  // [día, hora inicio (índice), duración en horas, profesional]
  const blocks: [number, number, number, 'b' | 'm' | 'c', string][] = [
    [0, 0, 1, 'b', 'Corte'],
    [0, 3, 2, 'm', 'Color'],
    [1, 1, 1, 'c', 'Barba'],
    [1, 5, 1, 'b', 'Corte'],
    [2, 0, 2, 'm', 'Mechas'],
    [2, 4, 1, 'c', 'Corte'],
    [3, 2, 1, 'b', 'Brushing'],
    [3, 5, 2, 'm', 'Color'],
    [4, 0, 1, 'c', 'Corte'],
    [4, 1, 1, 'b', 'Corte'],
    [4, 6, 1, 'b', 'Peinado'],
    [5, 0, 2, 'm', 'Color'],
    [5, 2, 1, 'c', 'Barba'],
    [5, 4, 1, 'b', 'Corte'],
  ];
  const colors = { b: home.forest, m: home.coral, c: '#3E6FB0' } as const;
  const names = { b: 'Belén', m: 'Mica', c: 'Caro' } as const;
  const row = 30;
  return (
    <Window url="estudiolila.turnos-pro.com/admin/agenda">
      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.02em', color: home.ink }}>Semana del 20 al 25</Typography>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            {(Object.keys(names) as (keyof typeof names)[]).map((k) => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: sans, fontSize: '0.72rem', color: home.inkSoft }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors[k] }} />
                {names[k]}
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: `28px repeat(${days.length}, minmax(0, 1fr))`, columnGap: { xs: 0.4, sm: 0.75 } }}>
          <Box />
          {days.map((d) => (
            <Typography key={d} sx={{ fontFamily: sans, fontSize: { xs: '0.6rem', sm: '0.7rem' }, color: home.inkSoft, textAlign: 'center', pb: 0.75, whiteSpace: 'nowrap', overflow: 'hidden' }}>{d}</Typography>
          ))}
          <Box sx={{ position: 'relative' }}>
            {hours.map((h) => (
              <Typography key={h} sx={{ height: row, fontFamily: mono, fontSize: '0.6rem', color: home.inkMute }}>{h}</Typography>
            ))}
          </Box>
          {days.map((d, di) => (
            <Box key={d} sx={{ position: 'relative', height: row * hours.length, borderRadius: '8px', bgcolor: 'rgba(23,20,16,0.03)', backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${row - 1}px, ${home.line} ${row - 1}px, ${home.line} ${row}px)` }}>
              {blocks.filter((b) => b[0] === di).map(([, start, dur, who, label], i) => (
                <Box key={i} sx={{ position: 'absolute', left: 2, right: 2, top: start * row + 2, height: dur * row - 4, borderRadius: '6px', bgcolor: colors[who], color: '#fff', px: 0.6, py: 0.3, overflow: 'hidden' }}>
                  <Typography sx={{ fontFamily: sans, fontSize: { xs: '0.55rem', sm: '0.66rem' }, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Window>
  );
}
