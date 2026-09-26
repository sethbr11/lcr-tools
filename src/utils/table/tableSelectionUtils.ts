import { Types } from '@/types';
import { Templates } from '../ui/templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Prompts user to select table(s) when multiple tables exist on page.
 *
 * @param tables - List of candidate tables detected on page.
 * @param allowMultiple - Whether multiple table selection is permitted.
 * @returns Promise resolving to chosen table(s) or null if cancelled.
 */
export function requestTables(
  tables: Types.TableInfo[],
  allowMultiple: true
): Promise<Types.TableInfo[] | null>;
export function requestTables(
  tables: Types.TableInfo[],
  allowMultiple: false
): Promise<Types.TableInfo | null>;
export function requestTables(
  tables: Types.TableInfo[],
  allowMultiple?: boolean
): Promise<Types.TableInfo[] | Types.TableInfo | null>;
export function requestTables(
  tables: Types.TableInfo[],
  allowMultiple: boolean = true
): Promise<Types.TableInfo[] | Types.TableInfo | null> {
  if (tables.length === 0) return Promise.resolve(null);
  if (tables.length === 1) {
    return Promise.resolve(allowMultiple ? tables : tables[0]);
  }

  return new Promise((resolve) => {
    const listHtml = tables
      .map((t, idx) =>
        Templates.tableOptionItem({
          idx,
          name: t.name,
          type: t.type,
          allowMultiple,
          isChecked: idx === 0,
        })
      )
      .join('');

    const modal = document.createElement('div');
    modal.className = 'lcr-tools-modal-backdrop';
    modal.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

    modal.innerHTML = Templates.tableSelectionDialog({
      title: allowMultiple ? 'Select Tables to Work With' : 'Select a Table to Work With',
      prompt: allowMultiple
        ? 'Multiple tables found on this page. Please select which table(s) you would like to use:'
        : 'Multiple tables found on this page. Please select which table you would like to use:',
      listHtml,
      allowMultiple,
    });

    document.body.appendChild(modal);

    const cleanup = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    if (allowMultiple) {
      modal.querySelector('#lcr-select-all-tables')?.addEventListener('click', () => {
        modal.querySelectorAll<HTMLInputElement>('.lcr-table-choice').forEach((input) => {
          input.checked = true;
        });
      });

      modal.querySelector('#lcr-deselect-all-tables')?.addEventListener('click', () => {
        modal.querySelectorAll<HTMLInputElement>('.lcr-table-choice').forEach((input) => {
          input.checked = false;
        });
      });
    }

    modal.querySelector('#lcr-cancel-tables')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    modal.querySelector('#lcr-confirm-tables')?.addEventListener('click', () => {
      const checkedInputs = Array.from(
        modal.querySelectorAll<HTMLInputElement>('.lcr-table-choice:checked')
      );
      cleanup();
      if (checkedInputs.length === 0) {
        resolve(null);
        return;
      }
      if (allowMultiple) {
        const chosen = checkedInputs.map((input) => tables[parseInt(input.value, 10)]);
        resolve(chosen);
      } else {
        const chosenIndex = parseInt(checkedInputs[0].value, 10);
        resolve(tables[chosenIndex] || null);
      }
    });
  });
}

/** Displays modal dialog allowing user to choose a single table from list. */
export function showTableSelectionModal(
  tables: Types.TableInfo[]
): Promise<Types.TableInfo | null> {
  return requestTables(tables, false);
}

/** Displays modal dialog allowing user to choose multiple tables from list. */
export function showMultiTableSelectionModal(
  tables: Types.TableInfo[]
): Promise<Types.TableInfo[] | null> {
  return requestTables(tables, true);
}
