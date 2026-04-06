import type { Metadata } from 'next';
import Script from 'next/script';
import { brand } from '@/app/(lib)/brand';
import ThemeRegistry from '@/app/(components)/ThemeRegistry';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/(lib)/theme';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' });
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
        {pixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img height="1" width="1" style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} alt="" />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}

