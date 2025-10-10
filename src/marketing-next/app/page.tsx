import { redirect } from 'next/navigation';
import { brand } from '@/app/(lib)/brand';

export const dynamic = 'force-static';

export default function Page() {
  // Redirige la home a la landing de marketing
  redirect(brand.marketing_path);
}

