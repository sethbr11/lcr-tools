import { Dom, Constants, Types } from '@/types';
import { setAborted } from '../coreUtils';
import { Templates } from './templates';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Displays a full-page modal loading indicator overlay with custom message and ESC cancellation.
 *
 * @param message - Primary status message text.
 * @param subheader - Supporting instruction or subtitle text.
 */
export function showLoadingIndicator(
  message: string = 'Processing... Please wait.',
  subheader: string = 'Press the ESC key to abort'
): void {
  document.addEventListener('keydown', handleEscapeKey, { capture: true });

  const existingOverlay = document.getElementById(Dom.LOADER_OVERLAY_ID);
  if (existingOverlay) {
    const textEl = existingOverlay.querySelector('p');
    if (textEl) textEl.textContent = message;
    const subheaderEl = existingOverlay.querySelector('span');
    if (subheaderEl) subheaderEl.textContent = subheader;
    return;
  }

  createOverlayElement(message, subheader);
  injectSpinAnimationStyles();
}

/**
 * Dismisses the active loading overlay, updating status text if cancelled by user.
 *
 * @param event - Optional trigger event (e.g. keyboard event or cancel click).
 */
export function hideLoadingIndicator(event?: Event): void {
  if (event) setAborted(true);

  document.removeEventListener('keydown', handleEscapeKey, { capture: true });

  const loaderElement = document.getElementById(Dom.LOADER_OVERLAY_ID);
  if (!loaderElement) return;

  if (event) {
    const textEl = loaderElement.querySelector('p');
    if (textEl) textEl.textContent = 'Process aborting at user request...';
    setTimeout(removeOverlayElement, 1000);
  } else {
    removeOverlayElement();
  }
}

/**
 * Renders a self-dismissing toast notification card on the screen.
 *
 * @param message - Content text to show inside the toast.
 * @param options - Visual styling, duration, and positioning options.
 * @returns The created HTMLElement representing the toast.
 */
export function showToast(message: string, options: Types.ToastOptions = {}): HTMLElement {
  const {
    type = 'success',
    duration = Constants.DEFAULT_TOAST_DURATION_MS,
    position = 'top-left',
    onClick,
  } = options;

  injectToastStyles();
  const container = getOrCreateToastContainer(position);

  const toast = document.createElement('div');
  toast.className = `${Dom.TOAST_ITEM} ${Dom.TOAST_ITEM}-${type}`;
  toast.textContent = message;

  if (onClick) {
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', onClick);
  }

  container.appendChild(toast);

  // Trigger smooth entrance animation
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      removeElement(toast);
      if (container.children.length === 0) {
        removeElement(container);
      }
    }, 300);
  }, duration);

  return toast;
}

/**
 * Displays an asynchronous confirmation dialog returning a boolean promise.
 *
 * @param options - Prompt message, title, and button labeling options.
 * @returns Promise resolving to true if confirmed, false if dismissed or cancelled.
 */
export function showConfirmationModal(options: Types.ConfirmationOptions): Promise<boolean> {
  const {
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'primary',
  } = options;

  return new Promise((resolve) => {
    injectConfirmModalStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'lcr-tools-modal-backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: String(Dom.CONFIRM_MODAL_Z_INDEX),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    const modal = document.createElement('div');
    modal.className = `${Dom.MODAL_CONTAINER} lcr-tools-confirm-modal`;
    Object.assign(modal.style, {
      background: '#ffffff',
      padding: '28px 24px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
      maxWidth: '440px',
      width: '90%',
      textAlign: 'center',
      boxSizing: 'border-box',
      animation: 'lcrModalSlideIn 0.25s ease-out',
    });

    const templateOptions = { title, message, cancelText, confirmText, confirmColor };
    modal.innerHTML = Templates.confirmationModal(templateOptions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const cleanup = (result: boolean) => {
      window.removeEventListener('keydown', handleKeyDown, true);
      removeElement(backdrop);
      resolve(result);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cleanup(false);
    };
    window.addEventListener('keydown', handleKeyDown, true);

    modal.querySelector('#lcr-tools-cancel-btn')?.addEventListener('click', () => cleanup(false));
    modal.querySelector('#lcr-tools-confirm-btn')?.addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(false);
    });
  });
}

/**
 * Prompts Handbook 33.8 data stewardship confirmation before a CSV or ZIP download.
 *
 * @returns Promise resolving to true when the user confirms, or false if cancelled.
 */
export async function confirmDataStewardshipDownload(): Promise<boolean> {
  return showConfirmationModal({
    title: Constants.STEWARDSHIP_TITLE,
    message: Constants.STEWARDSHIP_MESSAGE,
    confirmText: Constants.STEWARDSHIP_CONFIRM_TEXT,
    cancelText: Constants.STEWARDSHIP_CANCEL_TEXT,
    confirmColor: 'primary',
  });
}

/**
 * Safely unmounts and removes a target DOM element from the document tree.
 *
 * @param elementOrId - HTMLElement instance or its string element ID.
 */
export function removeElement(elementOrId: HTMLElement | string | null | undefined): void {
  if (!elementOrId) return;
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (element && element.parentNode) element.parentNode.removeChild(element);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Handles global ESC key events to trigger abort logic. */
function handleEscapeKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    hideLoadingIndicator(e);
    e.stopPropagation();
  }
}

/** Removes the loading overlay element from the document body. */
function removeOverlayElement(): void {
  removeElement(Dom.LOADER_OVERLAY_ID);
}

/** Builds and mounts the loading overlay DOM structure. */
function createOverlayElement(message: string, subheader: string): void {
  const overlay = document.createElement('div');
  overlay.id = Dom.LOADER_OVERLAY_ID;
  overlay.className = Dom.LOADING_OVERLAY;
  overlay.innerHTML = Templates.loadingOverlay(message, subheader);
  document.body.appendChild(overlay);
}

/** Injects keyframe CSS rules for the loading spinner. */
function injectSpinAnimationStyles(): void {
  if (document.getElementById(Dom.SPIN_ANIMATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = Dom.SPIN_ANIMATION_STYLE_ID;
  style.textContent = `
    @keyframes lcrToolsSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .${Dom.LOADING_OVERLAY} {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.55);
      z-index: 999999;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #ffffff; font-family: system-ui, -apple-system, sans-serif;
    }
    .${Dom.LOADING_SPINNER} {
      width: 44px; height: 44px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: lcrToolsSpin 0.85s linear infinite;
      margin-bottom: 16px;
    }
  `;
  document.head.appendChild(style);
}

/** Retrieves or constructs the toast container positioned on screen. */
function getOrCreateToastContainer(position: Types.ToastPosition): HTMLElement {
  const id = `${Dom.TOAST_CONTAINER_ID}-${position}`;
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.className = `${Dom.TOAST_CONTAINER} ${position}`;
    document.body.appendChild(container);
  }
  return container;
}

/** Injects CSS rules governing toast appearances and positions. */
function injectToastStyles(): void {
  if (document.getElementById(Dom.TOAST_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = Dom.TOAST_STYLE_ID;
  style.textContent = `
    .${Dom.TOAST_CONTAINER} {
      position: fixed; z-index: 1000000; display: flex; flex-direction: column; gap: 8px;
      pointer-events: none; padding: 16px;
    }
    .${Dom.TOAST_CONTAINER}.top-left { top: 0; left: 0; }
    .${Dom.TOAST_CONTAINER}.top-right { top: 0; right: 0; }
    .${Dom.TOAST_CONTAINER}.bottom-left { bottom: 0; left: 0; }
    .${Dom.TOAST_CONTAINER}.bottom-right { bottom: 0; right: 0; }
    .${Dom.TOAST_ITEM} {
      pointer-events: auto; padding: 10px 18px; border-radius: 6px; color: #fff;
      font-size: 14px; font-family: system-ui, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      opacity: 0; transform: translateY(-8px); transition: all 0.25s ease;
    }
    .${Dom.TOAST_ITEM}.show { opacity: 1; transform: translateY(0); }
    .${Dom.TOAST_ITEM}-success { background-color: #2e7d32; }
    .${Dom.TOAST_ITEM}-error { background-color: #d32f2f; }
    .${Dom.TOAST_ITEM}-warning { background-color: #ed6c02; }
    .${Dom.TOAST_ITEM}-info { background-color: #0288d1; }
  `;
  document.head.appendChild(style);
}

/** Injects keyframe and element styling for confirmation modal dialogs. */
function injectConfirmModalStyles(): void {
  const styleId = Dom.CONFIRM_MODAL_STYLE_ID;
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes lcrModalSlideIn {
      from { opacity: 0; transform: translateY(-16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .lcr-tools-confirm-modal .lcr-tools-modal-header {
      margin-bottom: 14px;
    }
    .lcr-tools-confirm-modal h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
    }
    .lcr-tools-confirm-modal .lcr-tools-modal-body {
      margin-bottom: 24px;
    }
    .lcr-tools-confirm-modal p {
      margin: 0;
      font-size: 15px;
      color: #4b5563;
      line-height: 1.5;
    }
    .lcr-tools-confirm-modal .lcr-tools-modal-footer {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .lcr-tools-confirm-modal .lcr-tools-btn {
      padding: 9px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .lcr-tools-confirm-modal #lcr-tools-cancel-btn {
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #374151;
      font-weight: 500;
    }
    .lcr-tools-confirm-modal #lcr-tools-cancel-btn:hover {
      background: #f3f4f6;
    }
    .lcr-tools-confirm-modal #lcr-tools-confirm-btn {
      border: none;
      background: #00509e;
      color: #ffffff;
      font-weight: 600;
    }
    .lcr-tools-confirm-modal #lcr-tools-confirm-btn:hover {
      background: #003d7a;
    }
    .lcr-tools-confirm-modal .lcr-tools-btn-danger {
      background: #dc2626 !important;
      color: #ffffff !important;
    }
    .lcr-tools-confirm-modal .lcr-tools-btn-danger:hover {
      background: #b91c1c !important;
    }
  `;
  document.head.appendChild(style);
}
