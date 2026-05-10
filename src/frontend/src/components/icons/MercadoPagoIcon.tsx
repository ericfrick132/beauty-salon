import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

// Renders the real MercadoPago brand logo from /public. Sized to match MUI
// icon sizing conventions (~24px) so it can sit alongside `<Settings />`,
// `<Group />` etc. in the sidebar without throwing off vertical rhythm.
//
// Intentionally does NOT extend BoxProps — MUI's BoxProps types `fontSize` as
// the union from the sx system (FontSize<...> values), which collides with
// the simple "small" | "medium" | "large" string literals that callers pass
// (mirroring `SvgIconProps.fontSize`). Keeping the prop surface small avoids
// that conflict entirely.

type IconSize = 'small' | 'medium' | 'large';

interface Props {
  fontSize?: IconSize;
  sx?: SxProps<Theme>;
  alt?: string;
}

const SIZE_PX: Record<IconSize, number> = {
  small: 20,
  medium: 24,
  large: 32,
};

const MercadoPagoIcon: React.FC<Props> = ({ fontSize = 'medium', sx, alt = 'MercadoPago' }) => {
  const size = SIZE_PX[fontSize];
  return (
    <Box
      component="img"
      src="/mercadopago-logo.png"
      alt={alt}
      sx={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...sx,
      }}
    />
  );
};

export default MercadoPagoIcon;
