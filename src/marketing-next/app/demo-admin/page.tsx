'use client';

import { SignupModalProvider } from '@/app/(components)/(sections)/SignupModal';
import DemoAdmin from './DemoAdmin';

export default function DemoAdminPage() {
  return (
    <SignupModalProvider>
      <DemoAdmin />
    </SignupModalProvider>
  );
}
