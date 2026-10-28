'use client';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import { palette } from '@/app/(lib)/theme';

// Línea de ventas 2669 (la atiende el bot de sales-hub). No es el WhatsApp de soporte de brand.ts.
const SALES_WA = '5491126693551';
const MESSAGE = 'Hola! Vengo de la web de TurnosPro y quiero saber cómo funciona';
export const SALES_WA_URL = `https://wa.me/${SALES_WA}?text=${encodeURIComponent(MESSAGE)}`;

// Las demos interactivas tienen sus propias barras y botones fijos abajo: ahí no va.
const HIDDEN_PREFIXES = ['/demo-admin', '/demo-app'];

function WhatsAppGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Botón flotante de WhatsApp de las páginas públicas (home, rubros, países, curso).
 * Sin tracking propio: el sitio no dispara hoy ningún evento de contacto (fbq/gtag) que replicar.
 */
export default function WhatsAppFloat() {
  const pathname = usePathname() || '/';
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <Box
      component="a"
      href={SALES_WA_URL}
      target="_blank"
      rel="noopener"
      aria-label="Hablá con nosotros por WhatsApp"
      sx={{
        position: 'fixed',
        right: { xs: 20, md: 28 },
        bottom: { xs: 'calc(20px + env(safe-area-inset-bottom))', md: 'calc(28px + env(safe-area-inset-bottom))' },
        zIndex: 1250, // debajo de los modales de MUI (1300)
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        width: { xs: 56, md: 'auto' },
        height: 56,
        px: { xs: 0, md: 2.5 },
        borderRadius: 999,
        bgcolor: palette.forest,
        color: '#fff',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter), var(--font-grotesk), system-ui, sans-serif',
        fontWeight: 600,
        fontSize: '0.95rem',
        letterSpacing: '-0.01em',
        boxShadow: '0 10px 28px -8px rgba(23,20,16,0.45)',
        transition: 'transform 160ms ease, background-color 160ms ease',
        '&:hover': { transform: 'translateY(-2px)', bgcolor: palette.forestDeep },
        '&:focus-visible': { outline: `2px solid ${palette.ink}`, outlineOffset: 3 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
      }}
    >
      <WhatsAppGlyph />
      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
        Hablá con nosotros
      </Box>
    </Box>
  );
}
