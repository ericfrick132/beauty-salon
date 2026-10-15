import CountryPage, { countryMetadata } from '@/app/(components)/(content)/countryPage';

export const metadata = countryMetadata('MX');

export default function Page() {
  return <CountryPage code="MX" />;
}
