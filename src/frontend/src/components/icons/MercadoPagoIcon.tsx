import React from 'react';
import { Box, BoxProps } from '@mui/material';

// Renders the real MercadoPago brand logo from /public. Sized to match MUI
// icon sizing conventions (~24px) so it can sit alongside `<Settings />`,
// `<Group />` etc. in the sidebar without throwing off vertical rhythm.
type Props = Omit<BoxProps<'img'>, 'component' | 'src'> & {
  fontSize?: 'small' | 'medium' | 'large';
};

const SIZE: Record<NonNullable<Props['fontSize']>, number> = {
  small: 20,
  medium: 24,
  large: 32,
};

const MercadoPagoIcon: React.FC<Props> = ({ fontSize = 'medium', sx, ...rest }) => {
  const size = SIZE[fontSize];
  return (
    <Box
      component="img"
      src="/mercadopago-logo.png"
      alt="MercadoPago"
      sx={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...sx,
      }}
      {...rest}
    />
  );
};

export default MercadoPagoIcon;
