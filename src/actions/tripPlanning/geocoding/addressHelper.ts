import { Regex, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Normalizes and inserts missing spaces into glued address segments.
 *
 * @param raw - Raw or glued address string.
 * @returns Cleaned address with properly spaced components.
 */
export function formatCleanAddress(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(Regex.SURROUNDING_QUOTES, '')
    .replace(Regex.GLUED_UNIT, '$1 $2')
    .replace(Regex.GLUED_UNIT_DIGIT, '$1 $2')
    .replace(Regex.GLUED_NUMBER_WORD, '$1 $2')
    .replace(Regex.GLUED_STATE_ZIP, '$1 $2')
    .replace(Regex.MULTIPLE_SPACES, ' ')
    .trim();
}

/**
 * Builds ordered address lookup variants used when geocoding a street string.
 *
 * @param raw - Original residential address.
 * @returns Original string plus de-duplicated normalized variants.
 */
export function advancedNormalizeAddress(raw: string): Types.AddressVariants {
  if (!raw) return { original: raw, variants: [] };

  const base = formatCleanAddress(raw);
  const shortenZip4 = (value: string): string => value.replace(Regex.ZIP_PLUS_FOUR, '$1');
  const stripZip = (value: string): string =>
    value.replace(Regex.ZIP_CODE, '').replace(Regex.MULTIPLE_SPACES, ' ').trim();
  const stripIntlPostal = (value: string): string =>
    value.replace(Regex.POSTAL_CODE_GLOBAL, '').replace(Regex.MULTIPLE_SPACES, ' ').trim();
  const noUnit = base.replace(Regex.UNIT_DESIGNATOR, '').replace(Regex.MULTIPLE_SPACES, ' ').trim();
  const noCommas = base.replace(Regex.COMMA_GLOBAL, ' ').replace(Regex.MULTIPLE_SPACES, ' ').trim();
  const compact = noUnit
    .replace(Regex.COMMA_GLOBAL, ' ')
    .replace(Regex.MULTIPLE_SPACES, ' ')
    .trim();
  const streetCityState = stripZip(base.replace(Regex.COMMA_GLOBAL, ' '));
  const streetCityStateIntl = stripIntlPostal(base.replace(Regex.COMMA_GLOBAL, ' '));
  const numberStreetMatch = base.match(Regex.NUMBER_STREET_ONLY);
  const numberStreetOnly = numberStreetMatch ? numberStreetMatch[1].trim() : base;

  const variants = [
    base,
    shortenZip4(base),
    stripZip(base),
    stripIntlPostal(base),
    noUnit,
    noCommas,
    compact,
    streetCityState,
    streetCityStateIntl,
    numberStreetOnly,
  ].filter((variant, index, all) => variant && all.indexOf(variant) === index);

  return { original: raw, variants };
}
