"use client";
import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';

function createEmotionCache() {
  const cache = createCache({ key: 'css', prepend: true });
  cache.compat = true;
  return cache;
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(createEmotionCache);

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys((cache as any).inserted).join(' ')}`}
      dangerouslySetInnerHTML={{ __html: (Object.values((cache as any).inserted) as string[]).join(' ') }}
    />
  ));

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

