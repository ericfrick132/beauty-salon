import CountryPage, { countryMetadata } from '@/app/(components)/(content)/countryPage';

export const metadata = countryMetadata('UY');

export default function Page() {
  return <CountryPage code="UY" />;
}
