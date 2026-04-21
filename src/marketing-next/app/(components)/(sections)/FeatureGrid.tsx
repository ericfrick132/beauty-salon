'use client';
import { Box, Container, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { features } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';
import type { SvgIconComponent } from '@mui/icons-material';

const iconMap: Record<string, SvgIconComponent> = {
  Storefront: StorefrontIcon,
  MenuBook: MenuBookIcon,
  EventAvailable: EventAvailableIcon,
  Payment: PaymentIcon,
  NotificationsActive: NotificationsActiveIcon,
  People: PeopleIcon,
};

interface CardProps {
  index: number;
  title: string;
  description: string;
  Icon: SvgIconComponent;
  variant: 'default' | 'hero' | 'tinted';
  gridArea?: string;
}

function FeatureCard({ index, title, description, Icon, variant, gridArea }: CardProps) {
  const isHero = variant === 'hero';
  const isTinted = variant === 'tinted';

  return (
    <AnimatedSection delay={index * 0.07}>
      <Box
        sx={{
          gridArea,
          height: '100%',
          minHeight: { xs: 220, md: isHero ? 360 : 240 },
          position: 'relative',
          p: { xs: 3, md: 3.5 },
          border: `1.5px solid ${palette.ink}`,
          borderRadius: 2,
          bgcolor: isHero ? palette.coral : isTinted ? palette.amber : palette.paperSoft,
          color: isHero ? palette.paperSoft : palette.ink,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 220ms ease, box-shadow 220ms ease',
          cursor: 'default',
          '&:hover': {
            transform: 'translate(-2px,-2px) rotate(-0.4deg)',
            boxShadow: `6px 6px 0 ${palette.ink}`,
          },
        }}
      >
        {/* Index marker */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 4, md: 5 },
          }}
        >
          <Box
            sx={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.16em',
              color: isHero ? 'rgba(255,255,255,0.8)' : palette.inkSoft,
            }}
          >
            {String(index + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `1.5px solid ${isHero ? palette.paperSoft : palette.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isHero ? 'rgba(255,255,255,0.15)' : palette.paper,
            }}
          >
            <Icon
              sx={{
                fontSize: 22,
                color: isHero ? palette.paperSoft : palette.ink,
              }}
            />
          </Box>
        </Box>

        <Typography
          sx={{
            fontFamily: 'var(--font-fraunces), serif',
            fontWeight: 500,
            fontVariationSettings: '"opsz" 144',
            fontSize: { xs: '1.4rem', md: isHero ? '2.4rem' : '1.55rem' },
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            mb: 1.5,
            color: 'inherit',
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '0.95rem', md: isHero ? '1.05rem' : '0.96rem' },
            lineHeight: 1.55,
            color: isHero ? 'rgba(255,255,255,0.92)' : palette.inkSoft,
            mt: 'auto',
            maxWidth: isHero ? 380 : undefined,
          }}
        >
          {description}
        </Typography>

        {/* Hero card decoration: receipt-style stub at bottom */}
        {isHero && (
          <Box
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: `1.5px dashed ${palette.paperSoft}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <Box>Mercado Pago</Box>
            <Box>Seña automática · 30%</Box>
          </Box>
        )}
      </Box>
    </AnimatedSection>
  );
}

export default function FeatureGrid() {
  // Bento layout. "Cobros anticipados" (index 3) is the hero card spanning
  // 2 cols × 2 rows on the right; "Recordatorios" (index 4) is amber-tinted.
  // Desktop areas map:
  //   a b b
  //   c b b
  //   d e f
  // We map by feature index to area key (preserving the content.ts order).
  const HERO_INDEX = 3;
  const TINTED_INDEX = 4;
  const indexToArea: Record<number, string> = {
    0: 'a', // Sitio de reservas (top-left)
    1: 'c', // Catálogo de servicios (mid-left)
    2: 'd', // Agenda inteligente (bottom-left)
    3: 'b', // Cobros anticipados (HERO, right side)
    4: 'e', // Recordatorios automáticos (bottom-mid, amber)
    5: 'f', // Gestión de clientes (bottom-right)
  };

  return (
    <Box id="beneficios" component="section" sx={{ py: { xs: 9, md: 14 }, bgcolor: palette.paperDeep }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="02" label="Funcionalidades" />
        </AnimatedSection>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' },
            gap: { xs: 4, md: 6 },
            mb: { xs: 6, md: 8 },
            alignItems: 'flex-end',
          }}
        >
          <AnimatedSection>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2.2rem', md: '3.4rem', lg: '4rem' },
                fontVariationSettings: '"opsz" 144',
                color: palette.ink,
                gridColumn: { md: 'span 4' },
                maxWidth: 720,
              }}
            >
              Todo lo que necesitás{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: palette.forest }}>
                en un solo lugar.
              </Box>
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <Typography
              sx={{
                fontSize: '1.02rem',
                color: palette.inkSoft,
                lineHeight: 1.65,
                gridColumn: { md: 'span 2' },
                borderLeft: `2px solid ${palette.ink}`,
                pl: 2.5,
                maxWidth: 360,
              }}
            >
              Las herramientas que necesitás para gestionar tu negocio de turnos,
              integradas en una sola plataforma.
            </Typography>
          </AnimatedSection>
        </Box>

        {/* Bento grid */}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2.5, md: 3 },
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gridAutoRows: { md: 'minmax(220px, auto)' },
            gridTemplateAreas: {
              md: '"a b b" "c b b" "d e f"',
            },
          }}
        >
          {features.map((feat, i) => {
            const Icon = iconMap[feat.icon];
            const variant: CardProps['variant'] =
              i === HERO_INDEX ? 'hero' : i === TINTED_INDEX ? 'tinted' : 'default';
            return (
              <FeatureCard
                key={feat.title}
                index={i}
                title={feat.title}
                description={feat.description}
                Icon={Icon}
                variant={variant}
                gridArea={indexToArea[i]}
              />
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
