import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const MercadoPagoIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon viewBox="0 0 32 32" {...props}>
    <circle cx="16" cy="16" r="15" fill="#00B1EA" />
    <path
      d="M7 18.2c2.4-2.6 4.8-3.7 7-3.7 2.5 0 3.6 1.4 4 2.4.5 1 .8 1.6 1.7 1.6 1.2 0 2-1 2-2.4 0-2.5-2-5.5-6-6.5-3.5-.9-7 .3-9.4 2.7-.7.7-1.5 1.6-2 2.4l2.7 3.5z"
      fill="#FFE600"
    />
    <circle cx="14.6" cy="16.2" r="1.4" fill="#00B1EA" />
  </SvgIcon>
);

export default MercadoPagoIcon;
