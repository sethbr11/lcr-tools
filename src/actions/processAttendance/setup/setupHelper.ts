import { browser } from 'wxt/browser';
import * as Utils from '../utils';
import {
  ensureAttendanceStylesInjected,
  getSetupModalHtml,
  getVisitorCalcItemHtml,
  getVisitorCalcSingleHtml,
  getVisitorCalcSplitHtml,
  getVisitorCalcZeroHtml,
} from '../templates';
import { Dom, Constants, Regex, Types } from '../types';
import {
  getMostRecentSunday,
  getVisitorCategoriesForClass,
  parseClassQuorumOptions,
} from './classHelper';
import { displayEditView } from './editHelper';
import { parsePastedAttendance } from './parseHelper';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Presents the compact, no-scroll attendance setup modal and resolves with user selections.
 *
 * @param initialIsSimulation - Optional override flag for dry-run simulation mode.
 * @returns Promise resolving to setup input data, or null if cancelled.
 */
export function promptAttendanceSetup(
  initialIsSimulation?: boolean
): Promise<Types.AttendanceSetupResult | null> {
  return new Promise((resolve) => {
    ensureAttendanceStylesInjected();

    // Clean up any existing overlay
    document.getElementById(Dom.UI_OVERLAY_ID)?.remove();

    const classOptions = parseClassQuorumOptions();
    const defaultDateObj = getMostRecentSunday();
    const defaultDateStr = Utils.formatDate(defaultDateObj, 'YYYY-MM-DD') || '';

    let isSimulation = initialIsSimulation ?? false;
    const container = document.createElement('div');
    Utils.setHtml(container, getSetupModalHtml(classOptions, defaultDateStr, isSimulation));
    const overlay = container.firstElementChild as HTMLElement;
    document.body.appendChild(overlay);

    const classSelect = overlay.querySelector<HTMLSelectElement>(`#${Dom.CLASS_SELECT_ID}`);
    const dateInput = overlay.querySelector<HTMLInputElement>(`#${Dom.DATE_INPUT_ID}`);
    const headcountInput = overlay.querySelector<HTMLInputElement>(`#${Dom.HEADCOUNT_INPUT_ID}`);
    const visitorSplitBox = overlay.querySelector<HTMLElement>(
      `#${Dom.VISITOR_SPLIT_CONTAINER_ID}`
    );
    const pasteTarget = overlay.querySelector<HTMLElement>(`#${Dom.PASTE_TARGET_ID}`);
    const pastePrompt = overlay.querySelector<HTMLElement>(`#${Dom.PASTE_PROMPT_ID}`);
    const pasteActive = overlay.querySelector<HTMLElement>(`#${Dom.PASTE_ACTIVE_ID}`);
    const pasteCatcher = overlay.querySelector<HTMLTextAreaElement>(`#${Dom.PASTE_CATCHER_ID}`);
    const recordCountBadge = overlay.querySelector<HTMLElement>(`#${Dom.RECORD_COUNT_ID}`);
    const statusBanner = overlay.querySelector<HTMLElement>(`#${Dom.STATUS_ID}`);
    const processBtn = overlay.querySelector<HTMLButtonElement>(`#${Dom.PROCESS_BTN_ID}`);

    // Asynchronously check dev mode simulation preference if not explicitly specified
    if (initialIsSimulation === undefined && import.meta.env.DEV && browser?.storage?.local) {
      browser.storage.local
        .get(Constants.DEV_SIMULATE_ATTENDANCE_KEY)
        .then((res) => {
          if (res?.[Constants.DEV_SIMULATE_ATTENDANCE_KEY]) {
            isSimulation = true;
            browser.storage.local.remove(Constants.DEV_SIMULATE_ATTENDANCE_KEY);
            const headerBox = overlay.querySelector(Dom.MODAL_HEADER_INNER);
            if (headerBox && !headerBox.querySelector(`.${Dom.SIMULATION_BADGE}`)) {
              const badge = document.createElement('span');
              badge.className = Dom.SIMULATION_BADGE;
              badge.textContent = 'SIMULATION (DRY RUN)';
              headerBox.appendChild(badge);
            }
            if (processBtn) {
              processBtn.textContent = 'Simulate Attendance';
            }
            if (statusBanner && statusBanner.textContent?.includes('Ready')) {
              statusBanner.textContent =
                'Dev Mode Simulation: tests toggle & visitors without altering live records.';
            }
          }
        })
        .catch(() => {});
    }

    let visitorCounts: Types.VisitorCounts = {};

    let currentParsed: Types.ParsedAttendanceResult = {
      names: [],
      targetDate: defaultDateStr,
      namesByDate: {},
      rawRows: [],
      errors: [],
      duplicateCount: 0,
      hasMixedDates: false,
    };

    let fullPastedText = '';

    const renderVisitorCalculations = () => {
      if (!visitorSplitBox) return;
      const selectedClassOpt = classSelect?.options[classSelect.selectedIndex];
      const activeClassName = selectedClassOpt?.text || 'Sunday Attendance';
      const categories = getVisitorCategoriesForClass(activeClassName);
      const attendeeCount = currentParsed.names.length;
      const rawHeadcount = headcountInput?.value ? parseInt(headcountInput.value, 10) : 0;

      if (rawHeadcount > attendeeCount) {
        const diff = rawHeadcount - attendeeCount;
        const catCount = categories.length;

        if (catCount > 1) {
          const base = Math.floor(diff / catCount);
          const remainder = diff % catCount;
          categories.forEach((cat, idx) => {
            visitorCounts[cat] = base + (idx < remainder ? 1 : 0);
          });

          const itemsHtml = categories
            .map((cat) => {
              const inputId = `lcr-calc-${cat.replace(Regex.MULTIPLE_SPACES, '-').toLowerCase()}`;
              return getVisitorCalcItemHtml(cat, inputId, visitorCounts[cat] || 0);
            })
            .join('');

          // prettier-ignore
          Utils.setHtml(visitorSplitBox, getVisitorCalcSplitHtml(diff, rawHeadcount, attendeeCount, itemsHtml));

          // Wire + / - buttons
          visitorSplitBox.querySelectorAll<HTMLButtonElement>(Dom.CALC_DEC).forEach((btn) => {
            btn.addEventListener('click', () => {
              const cat = btn.dataset.cat as Types.VisitorCategory;
              const input = visitorSplitBox.querySelector<HTMLInputElement>(
                `input[data-cat="${cat}"]`
              );
              if (input) {
                const val = Math.max(0, (parseInt(input.value, 10) || 0) - 1);
                input.value = String(val);
                visitorCounts[cat] = val;
              }
            });
          });
          visitorSplitBox.querySelectorAll<HTMLButtonElement>(Dom.CALC_INC).forEach((btn) => {
            btn.addEventListener('click', () => {
              const cat = btn.dataset.cat as Types.VisitorCategory;
              const input = visitorSplitBox.querySelector<HTMLInputElement>(
                `input[data-cat="${cat}"]`
              );
              if (input) {
                const val = (parseInt(input.value, 10) || 0) + 1;
                input.value = String(val);
                visitorCounts[cat] = val;
              }
            });
          });
          visitorSplitBox.querySelectorAll<HTMLInputElement>(Dom.CALC_VAL).forEach((input) => {
            input.addEventListener('input', () => {
              const cat = input.dataset.cat as Types.VisitorCategory;
              visitorCounts[cat] = Math.max(0, parseInt(input.value, 10) || 0);
            });
          });
        } else {
          const singleCat = categories[0] || 'Men';
          visitorCounts = { [singleCat]: diff };
          // prettier-ignore
          Utils.setHtml(visitorSplitBox, getVisitorCalcSingleHtml(diff, rawHeadcount, attendeeCount, singleCat));
        }
        visitorSplitBox.style.display = 'flex';
      } else if (rawHeadcount > 0 && rawHeadcount <= attendeeCount) {
        visitorCounts = {};
        categories.forEach((c) => (visitorCounts[c] = 0));
        Utils.setHtml(visitorSplitBox, getVisitorCalcZeroHtml(attendeeCount, rawHeadcount));
        visitorSplitBox.style.display = 'flex';
      } else {
        visitorCounts = {};
        categories.forEach((c) => (visitorCounts[c] = 0));
        visitorSplitBox.style.display = 'none';
      }
    };

    headcountInput?.addEventListener('input', renderVisitorCalculations);
    classSelect?.addEventListener('change', renderVisitorCalculations);

    const updateRecordDisplay = () => {
      const count = currentParsed.names.length;
      if (count > 0) {
        if (pastePrompt) pastePrompt.style.display = 'none';
        if (pasteActive) pasteActive.style.display = 'flex';
        if (recordCountBadge)
          recordCountBadge.textContent = `${count} record${count === 1 ? '' : 's'} loaded`;
        if (processBtn) processBtn.disabled = currentParsed.hasMixedDates;

        if (currentParsed.hasMixedDates) {
          const mixedError =
            currentParsed.errors.find((err) => err.startsWith(Constants.MIXED_DATES_ERROR)) ||
            Constants.MIXED_DATES_ERROR;
          if (statusBanner) {
            statusBanner.textContent = `${mixedError} ${Constants.MIXED_DATES_FIX_HINT}`;
            statusBanner.style.color = '#b91c1c';
          }
        } else {
          let statusText = `Loaded ${count} unique attendees.`;
          if (currentParsed.duplicateCount > 0) {
            statusText += ` (${currentParsed.duplicateCount} duplicates omitted)`;
          }
          if (statusBanner) {
            statusBanner.textContent = statusText;
            statusBanner.style.color = '#15803d';
          }
        }
      } else {
        if (pastePrompt) pastePrompt.style.display = 'flex';
        if (pasteActive) pasteActive.style.display = 'none';
        if (processBtn) processBtn.disabled = true;
        if (statusBanner) {
          statusBanner.textContent = 'Ready for attendance records.';
          statusBanner.style.color = '#64748b';
        }
      }
      renderVisitorCalculations();
    };

    const handlePasteText = (pasted: string) => {
      if (!pasted || !pasted.trim()) return;
      fullPastedText = fullPastedText ? `${fullPastedText}\n${pasted}` : pasted;

      const fallback = dateInput?.value || defaultDateStr;
      currentParsed = parsePastedAttendance(fullPastedText, fallback);

      // If a single shared date was discovered in the data, update date picker
      if (currentParsed.targetDate && dateInput) {
        dateInput.value = currentParsed.targetDate;
      }

      updateRecordDisplay();
    };

    // Clicking anywhere on the paste target focuses the paste catcher
    pasteTarget?.addEventListener('click', () => {
      pasteCatcher?.focus();
    });

    pasteTarget?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        pasteCatcher?.focus();
      }
    });

    pasteCatcher?.addEventListener('paste', (e) => {
      e.stopPropagation();
      const clipboardData = e.clipboardData;
      const text = clipboardData?.getData('text') || '';
      if (text) {
        e.preventDefault();
        handlePasteText(text);
      }
    });

    // Also support global paste when setup overlay is open
    const globalPasteHandler = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'INPUT') return;
      const text = e.clipboardData?.getData('text') || '';
      if (text) {
        handlePasteText(text);
      }
    };
    window.addEventListener('paste', globalPasteHandler);

    // "+ Add More Records" button
    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.PASTE_MORE_ID}`)
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        pasteCatcher?.focus();
        if (statusBanner) {
          statusBanner.textContent = 'Paste additional records now (Cmd+V / Ctrl+V)...';
          statusBanner.style.color = '#0284c7';
        }
      });

    // "View / Edit Records" button
    overlay
      .querySelector<HTMLButtonElement>(`#${Dom.VIEW_EDIT_ID}`)
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        displayEditView(currentParsed.rawRows, (updatedRows) => {
          // Re-serialize updated rows back to tab-separated lines
          const reconstructed = updatedRows
            .map((r) => `${r.normalizedDateStr || defaultDateStr}\t${r.firstName}\t${r.lastName}`)
            .join('\n');
          fullPastedText = reconstructed;
          currentParsed = parsePastedAttendance(fullPastedText, dateInput?.value || defaultDateStr);
          updateRecordDisplay();
        });
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Cleanup and cancel
    const closeDialog = (result: Types.AttendanceSetupResult | null) => {
      window.removeEventListener('paste', globalPasteHandler);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      overlay.remove();
      resolve(result);
    };

    overlay
      .querySelector(`#${Dom.SETUP_CLOSE_ID}`)
      ?.addEventListener('click', () => closeDialog(null));
    overlay
      .querySelector(`#${Dom.SETUP_CANCEL_ID}`)
      ?.addEventListener('click', () => closeDialog(null));

    // Process button click
    processBtn?.addEventListener('click', () => {
      if (currentParsed.names.length === 0 || currentParsed.hasMixedDates) return;

      const selectedClassOpt = classSelect?.options[classSelect.selectedIndex];
      const targetClassValue = selectedClassOpt?.value || null;
      const targetClassText = selectedClassOpt?.text || null;
      const targetDate = dateInput?.value || defaultDateStr;
      const rawHeadcount = headcountInput?.value ? parseInt(headcountInput.value, 10) : undefined;

      closeDialog({
        options: {
          targetClassValue,
          targetClassText,
          targetDate,
          totalHeadcount: rawHeadcount,
          visitorCounts: { ...visitorCounts },
          isSimulation,
        },
        parsedResult: currentParsed,
      });
    });
  });
}
