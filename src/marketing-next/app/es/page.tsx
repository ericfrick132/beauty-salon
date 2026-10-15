import CountryPage, { countryMetadata } from '@/app/(components)/(content)/countryPage';

export const metadata = countryMetadata('ES');

export default function Page() {
  return <CountryPage code="ES" />;
}
