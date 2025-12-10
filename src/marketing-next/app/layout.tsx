import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';
import ThemeRegistry from '@/app/(components)/ThemeRegistry';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/(lib)/theme';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(brand.brand_domain),
  alternates: { languages: { [brand.lang]: `${brand.brand_domain}${brand.marketing_path}` } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={brand.lang}>
      <body className={spaceGrotesk.className}>
        <ThemeRegistry>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}

