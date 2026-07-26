/**
 * Flag utilities for country flags.
 *
 * Flags are bundled locally as inline SVG markup (see lib/flags/flagSvgData.generated.ts)
 * and rendered via <FlagIcon> (components/shared/ui/primitives/FlagIcon.tsx) using
 * react-native-svg's SvgXml. This replaces the previous flagcdn.com raster-PNG approach,
 * which distorted/pixelated on web when the fixed-size PNG was stretched to fit card
 * layouts (resizeMode="cover" forcing a different aspect ratio per card).
 *
 * Benefits of the local SVG approach:
 * - Vector scaling: no distortion/pixelation at any card size
 * - No network dependency / third-party request per page view
 * - No flakiness if flagcdn.com is slow or unreachable
 *
 * Source SVGs: assets/flags/*.svg, downloaded from flagcdn.com (MIT-licensed flag-icons
 * project). To refresh a flag or add a new country, download assets/flags/<code>.svg and
 * regenerate lib/flags/flagSvgData.generated.ts.
 */
import { FLAG_SVG } from './flags/flagSvgData.generated';

// Map country names to ISO 3166-1 alpha-2 country codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  Tunisia: 'tn',
  France: 'fr',
  Germany: 'de',
  Italy: 'it',
  Spain: 'es',
  Poland: 'pl',
  Netherlands: 'nl',
  Belgium: 'be',
  Sweden: 'se',
  Portugal: 'pt',
  Austria: 'at',
  'Czech Republic': 'cz',
  Denmark: 'dk',
  Finland: 'fi',
  Greece: 'gr',
  Hungary: 'hu',
  Ireland: 'ie',
  Luxembourg: 'lu',
  Romania: 'ro',
  Slovakia: 'sk',
  Slovenia: 'si',
  Bulgaria: 'bg',
  Croatia: 'hr',
  Cyprus: 'cy',
  Estonia: 'ee',
  Latvia: 'lv',
  Lithuania: 'lt',
  Malta: 'mt',
  'United Kingdom': 'gb',
  Norway: 'no',
  Switzerland: 'ch',
  Iceland: 'is',
  Ukraine: 'ua',
};

// Map ISO alpha-2 codes to flag emoji (lightweight fallback for text-only UI)
const FLAG_EMOJI: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_MAP).map(([name, code]) => [
    name,
    code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0))),
  ])
);

export const getCountryFlag = (country: string): string => FLAG_EMOJI[country] ?? '🌍';

/**
 * Get the raw SVG markup for a country's flag, for rendering via <FlagIcon> / SvgXml.
 * Returns null if the country has no local flag asset.
 */
export const getFlagSvg = (country: string): string | null => {
  const countryCode = COUNTRY_CODE_MAP[country];
  if (!countryCode) {
    return null;
  }
  return FLAG_SVG[countryCode] ?? null;
};
