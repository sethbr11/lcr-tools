import { vi } from 'vitest';

/* ==========================================================================
   TESTING FUNCTIONS
   ========================================================================== */

/** Maximum milliseconds a test waits for async UI to appear (generous for slow CI runners). */
const WAIT_TIMEOUT_MS = 5000;

/**
 * Waits until an element matching the selector is in the document, instead of sleeping a
 * fixed time and hoping the async pipeline has finished.
 *
 * @param selector - CSS selector to wait for.
 * @returns The matching element.
 */
export async function waitForElement<T extends Element = HTMLElement>(
  selector: string
): Promise<T> {
  return vi.waitFor(
    () => {
      const element = document.querySelector<T>(selector);
      if (!element) throw new Error(`Timed out waiting for ${selector}`);
      return element;
    },
    { timeout: WAIT_TIMEOUT_MS }
  );
}

/**
 * Retries an assertion until it passes (or times out), for state that updates asynchronously.
 *
 * @param assertion - Assertion callback; may be async.
 */
export async function waitForAssertion(assertion: () => unknown): Promise<void> {
  await vi.waitFor(assertion, { timeout: WAIT_TIMEOUT_MS });
}
