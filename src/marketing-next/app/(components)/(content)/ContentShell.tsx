'use client';
import type { ReactNode } from 'react';
import { SignupModalProvider } from '../(sections)/SignupModal';
import Header from '../Header';
import Footer from '../Footer';

/**
 * Cascarón compartido para páginas de contenido (verticales, blog):
 * mismo header, footer y modal de registro que la home.
 */
export default function ContentShell({ children }: { children: ReactNode }) {
  return (
    <SignupModalProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </SignupModalProvider>
  );
}
