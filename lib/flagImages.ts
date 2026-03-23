/**
 * Flag image utilities for country flags
 *
 * Uses flagcdn.com CDN with optimized sizing:
 * - w160 (160x120px): Mobile & desktop cards (~2-3KB)
 * - Serves via global CDN for fast loading
 * - Automatic format negotiation (WebP where supported, PNG fallback)
 *
 * To self-host in Supabase later:
 * 1. Download from flagcdn.com/w160 for optimal size
 * 2. Upload to `flags` bucket
 * 3. Uncomment Supabase code in getFlagImageUrl()
 */

// Map country names to ISO 3166-1 alpha-2 country codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  Tunisia: "tn",
  France: "fr",
  Germany: "de",
  Italy: "it",
  Spain: "es",
  Poland: "pl",
  Netherlands: "nl",
  Belgium: "be",
  Sweden: "se",
  Portugal: "pt",
  Austria: "at",
  "Czech Republic": "cz",
  Denmark: "dk",
  Finland: "fi",
  Greece: "gr",
  Hungary: "hu",
  Ireland: "ie",
  Luxembourg: "lu",
  Romania: "ro",
  Slovakia: "sk",
  Slovenia: "si",
  Bulgaria: "bg",
  Croatia: "hr",
  Cyprus: "cy",
  Estonia: "ee",
  Latvia: "lv",
  Lithuania: "lt",
  Malta: "mt",
  "United Kingdom": "gb",
  Norway: "no",
  Switzerland: "ch",
  Iceland: "is",
  Ukraine: "ua",
};

/**
 * Get flag image URL from Supabase storage
 * Falls back to flagcdn.com CDN if image not found in storage
 */
/**
 * Get optimized flag image URL
 *
 * Image sizes:
 * - w160: 160x120px (~2-3KB) - optimal for mobile/web apps
 * - w320: 320x240px (~3-5KB) - high quality for larger displays
 * - w640: 640x480px (~8-12KB) - print quality
 *
 * Currently using w160 for best performance on mobile cards
 */
// Map ISO alpha-2 codes to flag emoji
const FLAG_EMOJI: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_MAP).map(([name, code]) => [
    name,
    code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0))),
  ])
);

export const getCountryFlag = (country: string): string => FLAG_EMOJI[country] ?? '🌍';

export const getFlagImageUrl = (country: string): string => {
  const countryCode = COUNTRY_CODE_MAP[country];

  if (!countryCode) {
    console.warn(`No flag image mapping for country: ${country}`);
    return ""; // Return empty string if country not found
  }

  const code = countryCode.toLowerCase();

  // Use flagcdn.com with optimized w160 size (~2-3KB per image)
  // flagcdn.com automatically serves WebP on supported browsers, PNG fallback
  return `https://flagcdn.com/w640/${code}.png`;

  // To use Supabase storage instead, uncomment below and comment above:
  // const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  // const bucket = 'flags';
  // if (supabaseUrl) {
  //   return `${supabaseUrl}/storage/v1/object/public/${bucket}/${code}.png`;
  // }
  // return `https://flagcdn.com/w160/${code}.png`;
};

/**
 * Recommended flag image sources for download:
 * 1. flagcdn.com - High quality, optimized (PNG, 320x240px, ~3-5KB each)
 * 2. countryflagsapi.com - Good quality alternatives
 * 3. Wikimedia Commons - High quality SVGs (can convert to PNG)
 *
 * Compression tips:
 * - Target: 64x48px at 96 DPI (mobile optimal)
 * - File size: <10KB per image for fast loading
 * - Format: PNG with optimization (use pngquant or similar)
 *
 * Upload script example:
 * const fs = require('fs');
 * const path = require('path');
 * const { createClient } = require('@supabase/supabase-js');
 *
 * const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 *
 * const flagsDir = './flags'; // Directory with flag images
 * const files = fs.readdirSync(flagsDir);
 *
 * for (const file of files) {
 *   const filePath = path.join(flagsDir, file);
 *   const fileBuffer = fs.readFileSync(filePath);
 *
 *   await supabase.storage
 *     .from('flags')
 *     .upload(file, fileBuffer, { upsert: true });
 * }
 */
