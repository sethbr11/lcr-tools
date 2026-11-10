import * as Base from '@/types';

/* ==========================================================================
   REGULAR EXPRESSIONS
   ========================================================================== */

export const Regex = {
  ...Base.Regex,
  /** Context: Column headers identifying member name columns. */
  NAME_HEADER: /name|member/i,
  /** Context: Column headers identifying member address columns. */
  ADDRESS_HEADER: /address|street|location/i,
  /** Context: USPS two-letter state code. */
  STATE_CODE: /\b[A-Z]{2}\b/,
  /** Context: Two or three letter state, province, or territory abbreviation (US, CA, AU). */
  REGION_OR_STATE_CODE: /\b[A-Z]{2,3}\b/,
  /** Context: International postal code formats (Canada, UK, Australia, Europe, etc.). */
  POSTAL_CODE_INTL:
    /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b\d{4,6}\b/i,
  /** Context: Global match for US or international postal codes to support stripping variants. */
  POSTAL_CODE_GLOBAL:
    /\b\d{5}(?:-\d{4})?\b|\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b\d{4,6}\b/gi,
  /** Context: International country name tokens found in residential addresses. */
  COUNTRY_NAME:
    /\b(?:Canada|UK|United Kingdom|Australia|New Zealand|France|Germany|Spain|Mexico|Japan|Brazil|Philippines|England|Scotland|Wales)\b/i,
  /** Context: ZIP+4 hyphenated postal code for shortening. */
  ZIP_PLUS_FOUR: /\b(\d{5})-\d{4}\b/g,
  /** Context: Five-digit ZIP with optional plus-four. */
  ZIP_CODE: /\b\d{5}(?:-\d{4})?\b/g,
  /** Context: Surrounding double quotes on an address string. */
  SURROUNDING_QUOTES: /^"+|"+$/g,
  /** Context: Address that does not begin with a street number. */
  LEADING_STREET_NUMBER: /^\d+/,
  /** Context: Address that is only a street number. */
  INCOMPLETE_STREET: /^\d+\s*$/,
  /** Context: Street number and name before a trailing state code. */
  NUMBER_STREET_ONLY: /^(\d+\s+[^\d,]+?)(?:\s+[A-Z]{2}\b.*)?$/,
  /** Context: Glued unit designator attached to preceding street text without whitespace. */
  GLUED_UNIT:
    /([a-zA-Z0-9])((?:Ste|Apt|Unit|#|Suite|Bldg|Rm|Room|Floor|Fl|Spc|Space|Lot|Trlr|Trailer)\.?\s*\d+)/gi,
  /** Context: Glued unit designator attached to following unit number without whitespace. */
  GLUED_UNIT_DIGIT:
    /((?:Ste|Apt|Unit|#|Suite|Bldg|Rm|Room|Floor|Fl|Spc|Space|Lot|Trlr|Trailer)\.?)(\d+)/gi,
  /** Context: Glued number attached to following word without whitespace. */
  GLUED_NUMBER_WORD: /(\d+)([A-Z][a-z]+)/g,
  /** Context: Glued two-letter state code attached to five-digit ZIP code without whitespace. */
  GLUED_STATE_ZIP: /\b([A-Z]{2})(\d{5})\b/g,
  /** Context: Parsing a #rrggbb cluster color into red, green, and blue hex pairs. */
  HEX_COLOR: /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i,
  /** Context: Report columns checked by default in the PDF column chooser. */
  PDF_DEFAULT_FIELD: /name|address|phone/i,
} as const;
