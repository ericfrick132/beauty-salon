'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { verticalLinks } from '@/app/(lib)/vertical-links';
import { AssistantMock, BookingPageMock, DepositMock, WeekAgendaMock, WhatsAppReminderMock } from './Mocks';
import { Accent, CheckList, PlusBadge, ProductCard, Section, SectionHead, Wrap, home, sans, titleSx } from './ui';

/** Sección de función: H2 + una línea + bullets a un lado, producto en card al otro. */
function FeatureBlock({
  id,
  title,
  line,
  bullets,
  badge,
  mock,
  reverse,
  tone = 'card',
}: {
  id: string;
  title: ReactNode;
  line: ReactNode;
  bullets: ReactNode[];
  badge?: ReactNode;
  mock: ReactNode;
  reverse?: boolean;
  tone?: 'card' | 'alt' | 'forest';
}) {
  return (
    <Section id={id}>
      <Wrap>
        <Box sx={{ display: 'grid', gap: { xs: 4, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'center' }}>
          <Box sx={{ order: { xs: 0, md: reverse ? 1 : 0 } }}>
            {badge && <Box sx={{ mb: 2 }}>{badge}</Box>}
            <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '2rem', sm: '2.4rem', md: '2.9rem' } }}>
              {title}
            </Typography>
            <Typography sx={{ mt: 2, mb: 3, fontFamily: sans, fontSize: { xs: '1.02rem', md: '1.12rem' }, color: home.inkSoft, lineHeight: 1.55, maxWidth: 480 }}>
              {line}
            </Typography>
            <CheckList items={bullets} />
          </Box>
          <ProductCard tone={tone}>{mock}</ProductCard>
        </Box>
      </Wrap>
    </Section>
  );
}

export function BookingLinkSection() {
  return (
    <FeatureBlock
      id="reservas"
      title={<>¿Te escriben para pedir turno? <Accent>Mandales tu link.</Accent></>}
      line="Tus clientes eligen servicio, profesional y horario desde el celular, a cualquier hora."
      bullets={[
        'Tu página propia: tunegocio.turnos-pro.com',
        'Solo muestra los horarios libres de cada profesional',
        'Para compartir en Instagram, WhatsApp o Google',
      ]}
      mock={<BookingPageMock />}
    />
  );
}

export function DepositSection() {
  return (
    <FeatureBlock
      id="senas"
      reverse
      tone="alt"
      title={<>Cobrá la seña <Accent>antes de que vengan.</Accent></>}
      line="Pedí un porcentaje al reservar y la plata entra a tu cuenta de Mercado Pago."
      bullets={[
        'Seña por servicio: vos elegís el porcentaje',
        'Cobrás con tu propia cuenta de Mercado Pago',
        'Efectivo y transferencia también, sin comisión',
      ]}
      mock={<DepositMock />}
    />
  );
}

export function ReminderSection() {
  return (
    <FeatureBlock
      id="recordatorios"
      badge={<PlusBadge />}
      title={<>¿Clientes que no avisan? <Accent>Recordatorio por WhatsApp.</Accent></>}
      line="Antes de cada turno le llega un WhatsApp al cliente para confirmar o cancelar."
      bullets={[
        'Sale del número de WhatsApp de tu negocio',
        'Responde 1 o 2 y tu agenda se actualiza sola',
        'Si cancela, el horario vuelve a quedar libre',
      ]}
      mock={<WhatsAppReminderMock />}
    />
  );
}

export function AssistantSection() {
  return (
    <FeatureBlock
      id="asistente"
      reverse
      tone="forest"
      badge={<PlusBadge label="Desde Plus · add-on" />}
      title={<>Un asistente que <Accent>contesta por vos.</Accent></>}
      line="Por WhatsApp, tus clientes reservan, consultan y cancelan turnos solos, con un menú simple."
      bullets={[
        'Reservar, ver y cancelar turnos sin escribirte',
        'Servicios y precios al instante, a cualquier hora',
        'Si piden hablar con vos, se pausa y respondés vos',
      ]}
      mock={<AssistantMock />}
    />
  );
}

export function AgendaSection() {
  return (
    <Section id="agenda">
      <Wrap>
        <SectionHead
          title={<>Tu semana entera, <Accent>en una pantalla.</Accent></>}
          line="Todos tus turnos por día o por semana, con un color por profesional."
        />
        <ProductCard tone="alt" sx={{ p: { xs: 1.5, sm: 3, md: 5 } }}>
          <WeekAgendaMock />
        </ProductCard>
        <Box sx={{ mt: { xs: 3, md: 4 }, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {['Bloqueos de horario por profesional', 'Turnos que entran solos desde tu link', 'Panel de métricas en todos los planes'].map((t) => (
            <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 2, borderRadius: home.radiusSm, bgcolor: home.card, border: `1px solid ${home.line}`, fontFamily: sans, fontSize: '0.98rem', color: home.ink }}>
              <Box component="span" aria-hidden sx={{ color: home.forest, fontWeight: 700 }}>✓</Box>
              {t}
            </Box>
          ))}
        </Box>
      </Wrap>
    </Section>
  );
}

const demos = [
  {
    href: '/demo-admin',
    tag: 'Tu panel',
    title: 'Entrá al panel y tocá todo',
    text: 'Agenda, señas, recordatorios y métricas con datos de ejemplo.',
  },
  {
    href: '/demo-app',
    tag: 'Lo que ve tu cliente',
    title: 'Reservá como si fueras tu cliente',
    text: 'Servicio, profesional, horario y seña desde el celular.',
  },
];

export function DemoSection() {
  return (
    <Section id="demo">
      <Wrap>
        <SectionHead title={<>Probalo por dentro <Accent>antes de registrarte.</Accent></>} line="Sin cuenta y sin dejar tu email. Con datos de ejemplo." />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          {demos.map((d) => (
            <Box
              key={d.href}
              component={Link}
              href={d.href}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                p: { xs: 3, md: 4 },
                borderRadius: home.radius,
                bgcolor: home.card,
                border: `1px solid ${home.line}`,
                textDecoration: 'none',
                color: home.ink,
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: home.shadow },
              }}
            >
              <Box sx={{ fontFamily: sans, fontSize: '0.82rem', fontWeight: 600, color: home.coralDeep }}>Demo · {d.tag}</Box>
              <Typography sx={{ ...titleSx, fontSize: { xs: '1.5rem', md: '1.8rem' } }}>{d.title} →</Typography>
              <Typography sx={{ fontFamily: sans, color: home.inkSoft, lineHeight: 1.55 }}>{d.text}</Typography>
            </Box>
          ))}
        </Box>
      </Wrap>
    </Section>
  );
}

/** Links a las landings por rubro (SEO interno). */
export function RubrosSection() {
  return (
    <Section id="rubros" py={{ xs: 5, md: 8 }}>
      <Wrap>
        <SectionHead title={<>Hecho para <Accent>tu rubro.</Accent></>} line="Servicios, duraciones y señas pensados para cada tipo de negocio." />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, justifyContent: 'center' }}>
          {verticalLinks.map((v) => (
            <Box
              key={v.path}
              component={Link}
              href={v.path}
              sx={{ px: 2.5, py: 1.4, borderRadius: 999, bgcolor: home.card, border: `1px solid ${home.line}`, fontFamily: sans, fontSize: '0.98rem', fontWeight: 500, color: home.ink, textDecoration: 'none', '&:hover': { borderColor: home.forest, color: home.forest } }}
            >
              Turnos para {v.label.toLowerCase()} →
            </Box>
          ))}
        </Box>
      </Wrap>
    </Section>
  );
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/turnospro/id6775843253';

export function AppSection() {
  return (
    <Section id="app-movil" py={{ xs: 5, md: 8 }}>
      <Wrap>
        <ProductCard tone="alt" sx={{ p: { xs: 3, md: 6 } }}>
          <Box sx={{ display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'center' }}>
            <Box>
              <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
                Tu agenda, <Accent>también en el bolsillo.</Accent>
              </Typography>
              <Typography sx={{ mt: 2, mb: 3, fontFamily: sans, fontSize: { xs: '1rem', md: '1.1rem' }, color: home.inkSoft, lineHeight: 1.55, maxWidth: 520 }}>
                Mirá los turnos del día, tus clientes y tu caja desde la app para iPhone.
              </Typography>
              <Box component="a" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Descargar TurnosPro en el App Store" sx={{ display: 'inline-block', lineHeight: 0 }}>
                <Box component="img" src="/landing/assets/img/app-store-badge.svg" alt="Consíguelo en el App Store" sx={{ height: 52, width: 'auto', display: 'block' }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Box component="img" src="/landing/assets/img/app-turnospro-1.png" alt="App TurnosPro: agenda del día en iPhone" loading="lazy" sx={{ width: { xs: 130, md: 170 }, height: 'auto', borderRadius: '22px', boxShadow: home.shadow }} />
              <Box component="img" src="/landing/assets/img/app-turnospro-2.png" alt="App TurnosPro: clientes en iPhone" loading="lazy" sx={{ width: { xs: 130, md: 170 }, height: 'auto', borderRadius: '22px', boxShadow: home.shadow, mt: { xs: 3, md: 4 } }} />
            </Box>
          </Box>
        </ProductCard>
      </Wrap>
    </Section>
  );
}
