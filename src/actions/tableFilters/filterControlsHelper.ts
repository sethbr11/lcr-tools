import {
  detectDefaultMonth,
  escapeHtml,
  getColumnFilterOptions,
  getRelevantHeaderCells,
  getTableDisplayName,
  inferColumnFilterType,
  isCategoricalColumn,
  isPersonalColumn,
} from './utils';
import { Constants, Dom, Regex, Types } from './types';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Discovers column headers and builds filter control UI representations for target table(s).
 *
 * @param tableOrTables - Single target table element or array of tables on page.
 * @param savedRules - Optional map of previously configured filter rules.
 * @returns Object containing map of filter rules and combined HTML control markup.
 */
export function buildTableFilterControls(
  tableOrTables: HTMLTableElement | HTMLTableElement[],
  savedRules?: Map<number, Types.FilterRule>
): Types.FilterControlsBuildResult {
  const isMulti = Array.isArray(tableOrTables);
  const tables = isMulti ? tableOrTables : [tableOrTables];
  const rules = new Map<number, Types.FilterRule>();
  const controlsHtmlParts: string[] = [];

  // Check for vacant calling positions
  const hasVacancies = tables.some((t) =>
    Array.from(t.querySelectorAll('tbody tr')).some((r) =>
      Regex.VACANT_CALLING_TEXT.test(r.textContent || '')
    )
  );
  if (hasVacancies) {
    const vacancyRuleIdx = Constants.VACANCY_RULE_INDEX;
    const savedVacancyRule = savedRules?.get(vacancyRuleIdx);
    const vacancyRule: Types.FilterRule = {
      columnIndex: vacancyRuleIdx,
      columnName: Constants.VACANCY_FILTER_LABEL,
      selectedValue: savedVacancyRule?.selectedValue || '',
      type: 'vacancy',
    };
    controlsHtmlParts.push(
      Templates.vacancyFilterContainer(Dom.VACANCY_FILTER_ID, vacancyRule.selectedValue)
    );
    rules.set(vacancyRuleIdx, vacancyRule);
  }

  if (isMulti) {
    buildMultiTableFilterControls(tables, savedRules, rules, controlsHtmlParts);
  } else {
    buildSingleTableFilterControls(tables[0], savedRules, rules, controlsHtmlParts);
  }

  return { rules, controlsHtml: controlsHtmlParts.join('') };
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Aggregates column definitions and builds filter controls across multiple tables. */
function buildMultiTableFilterControls(
  tables: HTMLTableElement[],
  savedRules: Map<number, Types.FilterRule> | undefined,
  rules: Map<number, Types.FilterRule>,
  controlsHtmlParts: string[]
): void {
  const colDefs = new Map<
    string,
    {
      columnName: string;
      options: Set<string>;
      types: Set<Types.FilterType>;
      tableIndices: Set<number>;
    }
  >();

  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const table = tables[tIdx];
    const { headers, indices } = getRelevantHeaderCells(table);
    for (let i = 0; i < headers.length; i++) {
      const colName = headers[i];
      if (isPersonalColumn(colName)) continue;

      let def = colDefs.get(colName);
      if (!def) {
        def = {
          columnName: colName,
          options: new Set<string>(),
          types: new Set<Types.FilterType>(),
          tableIndices: new Set<number>(),
        };
        colDefs.set(colName, def);
      }

      def.tableIndices.add(tIdx);
      const opts = getColumnFilterOptions(table, indices[i]);
      opts.forEach((opt) => def?.options.add(opt));
      const fType = inferColumnFilterType(colName, opts, table, indices[i]);
      def.types.add(fType);
    }
  }

  let ruleIdx = 0;
  for (const def of colDefs.values()) {
    const colName = def.columnName;
    const filterType = resolveFilterType(def.types);
    const options = Array.from(def.options);
    normalizeFilterOptions(options, filterType);

    if (shouldSkipColumn(colName, filterType, options)) continue;

    let badgeHtml = '';
    if (def.tableIndices.size < tables.length) {
      if (def.tableIndices.size === 1) {
        const soleIdx = Array.from(def.tableIndices)[0];
        const soleTable = tables[soleIdx];
        const soleName =
          soleTable.getAttribute('data-table-name') || getTableDisplayName(soleTable, soleIdx);
        badgeHtml = Templates.scopeBadge(`${soleName} only`);
      } else {
        badgeHtml = Templates.scopeBadge(`${def.tableIndices.size} of ${tables.length} tables`);
      }
    }

    const savedRule = savedRules?.get(ruleIdx);
    const rule = createFilterRule(ruleIdx, colName, filterType, savedRule);
    const html = renderFilterControlMarkup(ruleIdx, colName, filterType, options, rule, badgeHtml);

    controlsHtmlParts.push(html);
    rules.set(ruleIdx, rule);
    ruleIdx++;
  }
}

/** Builds filter controls for a single table. */
function buildSingleTableFilterControls(
  table: HTMLTableElement,
  savedRules: Map<number, Types.FilterRule> | undefined,
  rules: Map<number, Types.FilterRule>,
  controlsHtmlParts: string[]
): void {
  const { headers, indices } = getRelevantHeaderCells(table);

  for (let i = 0; i < headers.length; i++) {
    const colName = headers[i];
    const colIdx = indices[i];
    if (isPersonalColumn(colName)) continue;

    const options = getColumnFilterOptions(table, colIdx);
    const filterType = inferColumnFilterType(colName, options, table, colIdx);
    normalizeFilterOptions(options, filterType);

    if (shouldSkipColumn(colName, filterType, options)) continue;

    const savedRule = savedRules?.get(colIdx);
    let initialMonth = savedRule?.selectedMonth;
    if (filterType === 'month-day' && initialMonth === undefined) {
      initialMonth = detectDefaultMonth(table, colIdx);
    }

    const rule = createFilterRule(colIdx, colName, filterType, savedRule, initialMonth);
    const html = renderFilterControlMarkup(colIdx, colName, filterType, options, rule);

    controlsHtmlParts.push(html);
    rules.set(colIdx, rule);
  }
}

/** Determines unified filter type from a set of inferred types across tables. */
function resolveFilterType(types: Set<Types.FilterType>): Types.FilterType {
  if (types.has('attendance')) return 'attendance';
  if (types.has('presence')) return 'presence';
  if (types.has('boolean')) return 'boolean';
  if (types.has('month-day')) return 'month-day';
  if (types.has('date')) return 'date';
  if (types.has('number')) return 'number';
  if (types.has('gender')) return 'gender';
  return 'select';
}

/** Normalizes and sorts option values for categorical and boolean filters. */
function normalizeFilterOptions(options: string[], filterType: Types.FilterType): void {
  if (filterType === 'boolean' || filterType === 'presence') {
    if (!options.includes('Yes')) options.push('Yes');
    if (!options.includes('No')) options.push('No');
    options.sort((a, b) => (a === 'Yes' ? -1 : b === 'Yes' ? 1 : 0));
  } else {
    options.sort();
  }
}

/** Checks whether a column exceeds dropdown thresholds or lacks options. */
function shouldSkipColumn(
  colName: string,
  filterType: Types.FilterType,
  options: string[]
): boolean {
  const isRangeBased =
    filterType === 'number' || filterType === 'date' || filterType === 'month-day';
  const maxAllowedValues = isCategoricalColumn(colName)
    ? Constants.MAX_CATEGORY_DROPDOWN_VALUES
    : Constants.MAX_DROPDOWN_UNIQUE_VALUES;

  if (!isRangeBased && options.length > maxAllowedValues) return true;
  if (options.length === 0 && !isRangeBased) return true;
  return false;
}

/** Creates a FilterRule data structure with optional saved values. */
function createFilterRule(
  index: number,
  columnName: string,
  type: Types.FilterType,
  savedRule?: Types.FilterRule,
  defaultMonth?: number
): Types.FilterRule {
  return {
    columnIndex: index,
    columnName,
    selectedValue: savedRule?.selectedValue || '',
    minValue: savedRule?.minValue,
    maxValue: savedRule?.maxValue,
    fromDate: savedRule?.fromDate,
    toDate: savedRule?.toDate,
    selectedMonth: savedRule?.selectedMonth ?? defaultMonth,
    fromDay: savedRule?.fromDay,
    toDay: savedRule?.toDay,
    type,
  };
}

/** Renders HTML markup for a specific filter control type. */
function renderFilterControlMarkup(
  idx: number,
  colName: string,
  filterType: Types.FilterType,
  options: string[],
  rule: Types.FilterRule,
  badgeHtml: string = ''
): string {
  if (filterType === 'number') {
    const minId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_MIN_SUFFIX}`;
    const maxId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_MAX_SUFFIX}`;
    return Templates.numberRangeContainer(
      colName,
      minId,
      maxId,
      rule.minValue,
      rule.maxValue,
      badgeHtml
    );
  }

  if (filterType === 'date') {
    const fromId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_FROM_SUFFIX}`;
    const toId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_TO_SUFFIX}`;
    return Templates.dateRangeContainer(
      colName,
      fromId,
      toId,
      rule.fromDate,
      rule.toDate,
      badgeHtml
    );
  }

  if (filterType === 'month-day') {
    const monthId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_MONTH_SUFFIX}`;
    const fromDayId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_FROM_DAY_SUFFIX}`;
    const toDayId = `${Dom.FILTER_SELECT_PREFIX}${idx}${Dom.FILTER_TO_DAY_SUFFIX}`;
    return Templates.monthDayRangeContainer(
      colName,
      monthId,
      fromDayId,
      toDayId,
      rule.selectedMonth,
      rule.fromDay,
      rule.toDay,
      badgeHtml
    );
  }

  const selectId = `${Dom.FILTER_SELECT_PREFIX}${idx}`;
  const optionsHtml = options
    .map((opt) => {
      const isSelected = rule.selectedValue === opt ? ' selected' : '';
      let displayText = opt;
      if (filterType === 'attendance') {
        if (opt === 'Yes') displayText = 'Yes (Attended)';
        else if (opt === 'No') displayText = 'No (Absent)';
      }
      return `<option value="${escapeHtml(opt)}"${isSelected}>${escapeHtml(displayText)}</option>`;
    })
    .join('');

  return Templates.filterContainer(colName, selectId, optionsHtml, badgeHtml);
}
