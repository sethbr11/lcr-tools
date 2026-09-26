import { Dom, Constants, Regex, Types } from '../types';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Returns the most recent Sunday Date instance for default date picking.
 *
 * @returns Date object initialized to the most recent Sunday.
 */
export function getMostRecentSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mostRecent = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  mostRecent.setDate(mostRecent.getDate() - dayOfWeek);
  return mostRecent;
}

/**
 * Discovers the LCR class/quorum dropdown, preserves original DOM order
 * with Adult Sunday School prioritized first, and marks specified non-class
 * entries as non-selectable section headers.
 *
 * @returns List of formatted and ordered class options.
 */
export function parseClassQuorumOptions(): Types.ClassOption[] {
  const allSelects = Array.from(document.querySelectorAll<HTMLSelectElement>(Dom.SELECT_CONTROL));

  // Find class select (has multiple options and is not the month dropdown)
  const classSelect = allSelects.find((s) => {
    if (!s.options || s.options.length <= 1) return false;
    return !Array.from(s.options).some((opt) => {
      const text = (opt.textContent || '').trim().toLowerCase();
      return (
        (Constants.FULL_MONTH_NAMES as readonly string[]).includes(text) ||
        Regex.YEAR_MONTH_VALUE.test(opt.value)
      );
    });
  });

  if (!classSelect || !classSelect.options || classSelect.options.length === 0) {
    return getDefaultClassOptions();
  }

  const rawOptions: Types.ClassOption[] = [];
  const hasOptGroups = classSelect.querySelector(Dom.OPTGROUP) !== null;

  if (hasOptGroups) {
    for (const child of Array.from(classSelect.children)) {
      if (child instanceof HTMLOptGroupElement) {
        if (child.label) {
          rawOptions.push({
            value: '',
            text: child.label.trim(),
            selected: false,
            isHeader: true,
          });
        }
        for (const opt of Array.from(child.children)) {
          if (opt instanceof HTMLOptionElement) {
            const parsed = toClassOption(opt);
            if (parsed) rawOptions.push(parsed);
          }
        }
      } else if (child instanceof HTMLOptionElement) {
        const parsed = toClassOption(child);
        if (parsed) rawOptions.push(parsed);
      }
    }
  } else {
    for (const opt of Array.from(classSelect.options)) {
      const parsed = toClassOption(opt);
      if (parsed) rawOptions.push(parsed);
    }
  }

  if (rawOptions.length === 0) {
    return getDefaultClassOptions();
  }

  // Identify Adult Sunday School (must be selectable, not a header)
  // prettier-ignore
  const adultIndex = rawOptions.findIndex((opt) => !opt.isHeader && Regex.ADULT_SUNDAY_SCHOOL_CLASS.test(opt.text));

  let prioritized: Types.ClassOption[] = [];
  if (adultIndex !== -1) {
    const [adultOption] = rawOptions.splice(adultIndex, 1);
    prioritized.push({ ...adultOption, selected: true });
  }

  // Preserves original order from LCR without alphabetical sorting
  if (prioritized.length === 0) {
    const firstSelectable = rawOptions.find((opt) => !opt.isHeader);
    if (firstSelectable) {
      firstSelectable.selected = true;
    }
  }

  return [...prioritized, ...rawOptions];
}

/**
 * Determines which visitor category inputs should be visible and tracked based
 * on the specific class or organization chosen.
 *
 * @param className - Display name of the selected class.
 * @returns Array of applicable visitor categories.
 */
export function getVisitorCategoriesForClass(className: string): Types.VisitorCategory[] {
  const normalized = (className || '').trim();

  // 1. Adult Sunday School: Men and Women
  if (Regex.ADULT_SUNDAY_SCHOOL_CLASS.test(normalized)) {
    return ['Men', 'Women'];
  }

  // 2. Youth Sunday School (Course 11, 12, etc.): Young Men and Young Women
  if (Regex.YOUTH_COURSE_CLASS.test(normalized)) {
    return ['Young Men', 'Young Women'];
  }

  // 3. Primary classes (Valiant, CTR, Sunbeam, Nursery): Children only
  if (Regex.PRIMARY_CLASSES.test(normalized)) {
    return ['Children'];
  }

  // 4. Young Women classes (Gatherers of Light, Messengers of Hope, Builders of Faith, Young Women): Young Women only
  if (Regex.YOUNG_WOMEN_CLASSES.test(normalized)) {
    return ['Young Women'];
  }

  // 5. Aaronic Priesthood quorums (Priests, Teachers, Deacons): Young Men only
  if (Regex.AARONIC_QUORUMS.test(normalized)) {
    return ['Young Men'];
  }

  // 6. Elders Quorum: Men only
  if (Regex.ELDERS_QUORUM_CLASS.test(normalized)) {
    return ['Men'];
  }

  // 7. Relief Society: Women only
  if (Regex.RELIEF_SOCIETY_CLASS.test(normalized)) {
    return ['Women'];
  }

  // Keyword fallbacks
  const lower = normalized.toLowerCase();
  if (lower.includes('primary') || lower.includes('child')) return ['Children'];
  if (lower.includes('young women') || lower.includes('yw')) return ['Young Women'];
  if (lower.includes('young men') || lower.includes('ym') || lower.includes('aaronic')) {
    return ['Young Men'];
  }
  if (lower.includes('women') || lower.includes('relief')) return ['Women'];
  if (lower.includes('men') || lower.includes('elders')) return ['Men'];

  return ['Men', 'Women'];
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Returns true when an option text/value is a non-selectable class category header. */
function isClassSectionHeader(text: string, value: string): boolean {
  const norm = text.trim().toLowerCase();
  if (value === 'ALL' || norm === 'all classes' || norm === 'all classes and quorums') {
    return true;
  }
  return (Constants.CLASS_SECTION_HEADERS as readonly string[]).some(
    (header) => header.toLowerCase() === norm
  );
}

/** Converts an HTML option element into a standardized ClassOption object. */
function toClassOption(opt: HTMLOptionElement): Types.ClassOption | null {
  const text = (opt.textContent || '').trim();
  if (!text) return null;
  const isHeader = isClassSectionHeader(text, opt.value);
  return {
    value: isHeader ? '' : opt.value,
    text,
    selected: false,
    isHeader,
  };
}

/** Returns default fallback classes if LCR dropdown is not yet rendered. */
function getDefaultClassOptions(): Types.ClassOption[] {
  return [
    { value: 'SUNDAY_SCHOOL', text: Constants.ADULT_SUNDAY_SCHOOL_LABEL, selected: true },
    { value: 'ELDERS_QUORUM', text: 'Elders Quorum', selected: false },
    { value: 'RELIEF_SOCIETY', text: 'Relief Society', selected: false },
    { value: '', text: 'Aaronic Priesthood Quorums', selected: false, isHeader: true },
    { value: 'AARONIC_DEACONS', text: 'Deacons Quorum', selected: false },
    { value: 'AARONIC_TEACHERS', text: 'Teachers Quorum', selected: false },
    { value: 'AARONIC_PRIESTS', text: 'Priests Quorum', selected: false },
    { value: '', text: 'Young Women', selected: false, isHeader: true },
    { value: 'YW_GATHERERS', text: 'Gatherers of Light', selected: false },
    { value: 'YW_MESSENGERS', text: 'Messengers of Hope', selected: false },
    { value: 'YW_BUILDERS', text: 'Builders of Faith', selected: false },
    { value: '', text: 'Sunday School', selected: false, isHeader: true },
    { value: 'COURSE_14', text: 'Course 14', selected: false },
    { value: '', text: 'Primary', selected: false, isHeader: true },
    { value: 'PRIMARY_VALIANT', text: 'Valiant 8', selected: false },
  ];
}
