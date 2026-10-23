import React from 'react';
import { Box, Link } from '@mui/material';
import { Instagram, LocationOn, Phone, Public } from '@mui/icons-material';

export interface BusinessContact {
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
}

/** "@negocio", "instagram.com/negocio/" o "negocio" → "negocio". */
const instagramHandle = (raw: string) =>
  raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');

const websiteHref = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
const websiteLabel = (raw: string) => raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/**
 * Ficha del negocio debajo del nombre en la página de reservas: dirección (abre Maps),
 * teléfono, Instagram y web. Se carga en Configuración → General; lo vacío no se muestra.
 */
const BusinessContactBar: React.FC<{ info: BusinessContact; color: string; align?: 'left' | 'center' }> = ({
  info,
  color,
  align = 'left',
}) => {
  const items: { key: string; icon: React.ReactNode; label: string; href: string }[] = [];
  const address = info.address?.trim();
  const phone = info.phone?.trim();
  const ig = info.instagram ? instagramHandle(info.instagram) : '';
  const web = info.website?.trim();

  if (address) {
    items.push({
      key: 'address',
      icon: <LocationOn fontSize="inherit" />,
      label: address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });
  }
  if (phone) {
    items.push({ key: 'phone', icon: <Phone fontSize="inherit" />, label: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` });
  }
  if (ig) {
    items.push({ key: 'ig', icon: <Instagram fontSize="inherit" />, label: `@${ig}`, href: `https://instagram.com/${ig}` });
  }
  if (web) {
    items.push({ key: 'web', icon: <Public fontSize="inherit" />, label: websiteLabel(web), href: websiteHref(web) });
  }
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: 2.5,
        rowGap: 0.75,
        mb: { xs: 2, md: 3 },
        mt: { xs: -0.5, md: -1 },
      }}
    >
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          target={it.key === 'phone' ? undefined : '_blank'}
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            color,
            fontSize: '0.9rem',
            minWidth: 0,
            maxWidth: '100%',
            '& svg': { fontSize: '1.05rem', flexShrink: 0, opacity: 0.8 },
          }}
        >
          {it.icon}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {it.label}
          </Box>
        </Link>
      ))}
    </Box>
  );
};

export default BusinessContactBar;
