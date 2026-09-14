'use client';

import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { mono, ui } from './adminTheme';
import { STATUS_COLOR, STATUS_LABEL, type BookingStatus } from './data';

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: ui.text, fontSize: { xs: '1.35rem', md: '1.6rem' } }}>{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{ color: ui.textMute, mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  );
}

export function Section({ title, action, children, sx }: { title?: ReactNode; action?: ReactNode; children: ReactNode; sx?: object }) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
            {title && <Typography variant="h6" sx={{ fontWeight: 600, color: ui.text }}>{title}</Typography>}
            {action}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status }: { status: BookingStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <Chip
      size="small"
      label={STATUS_LABEL[status]}
      sx={{ bgcolor: `${color}1F`, color: status === 'no_show' ? '#616161' : color, fontWeight: 600, fontSize: '0.72rem', height: 22 }}
    />
  );
}

export function Kpi({ icon, title, value, change, color }: { icon: ReactNode; title: string; value: ReactNode; change?: string; color: string }) {
  const negative = change?.startsWith('-');
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}15`, color, display: 'grid', placeItems: 'center' }}>{icon}</Box>
          {change && (
            <Chip size="small" label={change} sx={{ bgcolor: negative ? '#FEE2E2' : '#DCFCE7', color: negative ? ui.error : ui.success, fontWeight: 600 }} />
          )}
        </Box>
        <Typography sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 700, color: ui.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
        <Typography variant="body2" sx={{ color: ui.textMute, mt: 0.5 }}>{title}</Typography>
      </CardContent>
    </Card>
  );
}

// Barras verticales de una sola serie (mismo color que el BarChart del panel real).
export function Bars({ data, format, label }: { data: { label: string; value: number; highlight?: boolean }[]; format: (n: number) => string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  return (
    <Box role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`} sx={{ position: 'relative', display: 'flex', alignItems: 'stretch', gap: '6px', height: 220, pt: 3 }}>
      <Box aria-hidden sx={{ position: 'absolute', inset: '24px 0 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
        {[0, 1, 2, 3].map((i) => <Box key={i} sx={{ borderTop: `1px dashed ${ui.line}` }} />)}
      </Box>
      {data.map((d) => (
        <Box
          key={d.label}
          tabIndex={0}
          sx={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, outline: 'none', position: 'relative',
            '&:hover .tp-tip, &:focus-visible .tp-tip': { opacity: 1 },
            '&:hover .tp-bar, &:focus-visible .tp-bar': { opacity: 0.85 },
          }}
        >
          <Box sx={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
            <Box className="tp-tip" sx={{ position: 'absolute', top: -22, px: 1, py: 0.25, borderRadius: 1, bgcolor: ui.navbar, color: '#fff', fontSize: 11, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 120ms', zIndex: 1, fontFamily: mono }}>
              {format(d.value)}
            </Box>
            <Box className="tp-bar" sx={{ width: 'min(36px, 70%)', height: `${(d.value / max) * 100}%`, bgcolor: ui.primary, opacity: d.highlight === false ? 0.45 : 1, borderRadius: '8px 8px 0 0', transition: 'opacity 160ms' }} />
          </Box>
          <Typography sx={{ fontSize: 12, color: ui.textMute, height: 18 }}>{d.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export function BarList({ rows, format }: { rows: { label: string; value: number; color?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rows.map((r) => (
        <Box key={r.label}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: ui.textSoft }}>{r.label}</Typography>
            <Typography variant="body2" sx={{ color: ui.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{format(r.value)}</Typography>
          </Box>
          <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${(r.value / max) * 100}%`, bgcolor: r.color ?? ui.primary, borderRadius: 4 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export type ChatMsg = { from: 'business' | 'client'; text: string; time: string };

// Teléfono con el chat de WhatsApp (mismo look que las vistas previas del Bot y del Agente IA).
export function WhatsAppPhone({ name, messages, footer }: { name: string; messages: ChatMsg[]; footer?: ReactNode }) {
  return (
    <Box sx={{ border: `1px solid ${ui.border}`, borderRadius: '22px', overflow: 'hidden', bgcolor: '#efeae2', maxWidth: 380, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1.25, bgcolor: ui.whatsappDeep, color: '#fff' }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#fff', color: ui.whatsappDeep, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>EN</Box>
        <Box sx={{ lineHeight: 1.2 }}>
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{name}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>cuenta de empresa</Typography>
        </Box>
      </Box>
      <Box sx={{ px: 1.5, py: 2, minHeight: 260, display: 'flex', flexDirection: 'column', gap: 1, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: m.from === 'client' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', px: 1.25, pt: 0.75, pb: 2.25, position: 'relative',
              bgcolor: m.from === 'client' ? '#d9fdd3' : '#fff',
              borderRadius: m.from === 'client' ? '10px 0 10px 10px' : '0 10px 10px 10px',
              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)', fontSize: 14, color: '#111b21', whiteSpace: 'pre-line', wordBreak: 'break-word',
              animation: 'tpPop 240ms ease', '@keyframes tpPop': { from: { opacity: 0, transform: 'translateY(6px) scale(0.97)' } },
            }}
          >
            {m.text}
            <Box component="span" sx={{ position: 'absolute', right: 8, bottom: 3, fontSize: 10.5, color: '#667781' }}>
              {m.time}{m.time && m.from !== 'client' ? ' ✓✓' : ''}
            </Box>
          </Box>
        ))}
      </Box>
      {footer && <Box sx={{ p: 1.5, bgcolor: '#f0f2f5', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{footer}</Box>}
    </Box>
  );
}
