import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { brand } from '@/app/(lib)/brand';
import ThemeRegistry from '@/app/(components)/ThemeRegistry';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/(lib)/theme';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(brand.brand_domain),
  alternates: { languages: { [brand.lang]: `${brand.brand_domain}${brand.marketing_path}` } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={brand.lang}>
      <body className={inter.className}>
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

