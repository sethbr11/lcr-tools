import { Dom, Types } from '@/types';
import { Templates } from './templates';
import { setHtml } from './htmlUtils';
import { removeElement } from './uiUtils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Creates and mounts a centered, full-featured standard modal dialog.
 *
 * @param options - Configuration options for title, content, buttons, and alerts.
 * @returns The created modal backdrop container element.
 */
export function createStandardModal(options: Types.StandardModalOptions): HTMLElement {
  const {
    id = Dom.DEFAULT_STANDARD_MODAL_ID,
    title = '',
    content = '',
    alerts = [],
    buttons = [],
    onClose,
    width = '600px',
  } = options;

  injectModalBaseStyles();
  closeModal(id);

  const backdrop = document.createElement('div');
  backdrop.id = id;
  backdrop.className = 'lcr-tools-modal-backdrop';
  Object.assign(backdrop.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: Dom.MODAL_BACKDROP_Z_INDEX,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  const dialog = document.createElement('div');
  dialog.className = Dom.MODAL_CONTAINER;
  Object.assign(dialog.style, {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
    width: width,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxSizing: 'border-box',
  });

  // Header with title and close icon
  const header = createModalHeader(title, () => closeModal(id, onClose));
  dialog.appendChild(header);

  // Alerts section
  if (alerts.length > 0) {
    dialog.appendChild(createAlertsSection(alerts));
  }

  // Scrollable body content
  const body = document.createElement('div');
  Object.assign(body.style, {
    flex: '1',
    overflowY: 'auto',
    marginBottom: '20px',
  });

  if (typeof content === 'string') {
    setHtml(body, content);
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  dialog.appendChild(body);

  // Action buttons footer
  if (buttons.length > 0) {
    dialog.appendChild(createFooterButtons(buttons, () => closeModal(id, onClose)));
  }

  backdrop.appendChild(dialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal(id, onClose);
  });

  document.body.appendChild(backdrop);
  return backdrop;
}

/**
 * Creates and displays a slide-out side modal drawer from the edge of the screen.
 *
 * @param options - Configuration options specifying side, width, and content.
 * @returns The created side drawer element.
 */
export function createSideModal(options: Types.SideModalOptions): HTMLElement {
  const {
    id = Dom.DEFAULT_SIDE_MODAL_ID,
    title = '',
    content = '',
    buttons = [],
    alerts = [],
    onClose,
    width = '420px',
    side = 'right',
  } = options;

  injectModalBaseStyles();
  closeModal(id);

  const backdrop = document.createElement('div');
  backdrop.id = id;
  backdrop.className = 'lcr-tools-modal-backdrop';
  Object.assign(backdrop.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: Dom.MODAL_BACKDROP_Z_INDEX,
    display: 'flex',
    justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
  });

  const drawer = document.createElement('div');
  drawer.className = Dom.SIDE_MODAL_CONTAINER;
  Object.assign(drawer.style, {
    width: width,
    maxWidth: '100vw',
    height: '100vh',
    backgroundColor: '#ffffff',
    boxShadow: side === 'right' ? '-4px 0 16px rgba(0,0,0,0.2)' : '4px 0 16px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxSizing: 'border-box',
    animation: `${side === 'right' ? 'slideInRight' : 'slideInLeft'} 0.25s ease-out`,
  });

  drawer.appendChild(createModalHeader(title, () => closeModal(id, onClose)));
  if (alerts.length > 0) drawer.appendChild(createAlertsSection(alerts));

  const body = document.createElement('div');
  body.style.flex = '1';
  body.style.overflowY = 'auto';
  if (typeof content === 'string') {
    setHtml(body, content);
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  drawer.appendChild(body);

  if (buttons.length > 0) {
    drawer.appendChild(createFooterButtons(buttons, () => closeModal(id, onClose)));
  }

  backdrop.appendChild(drawer);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal(id, onClose);
  });

  document.body.appendChild(backdrop);
  return backdrop;
}

/**
 * Removes an existing modal dialog by ID and triggers its onClose callback.
 *
 * @param id - Unique element ID of the target modal.
 * @param onClose - Optional callback to invoke when closing completes.
 */
export function closeModal(id: string, onClose?: () => void): void {
  removeElement(id);
  if (onClose) onClose();
}

/**
 * Displays a temporary inline status banner inside a designated target container element.
 *
 * @param message - Status text to display.
 * @param isError - Whether the banner should display error formatting.
 * @param container - Target element or ID where the banner will be injected.
 */
export function showStatus(
  message: string,
  isError: boolean = false,
  container?: HTMLElement | string
): void {
  const target =
    typeof container === 'string'
      ? document.getElementById(container)
      : container || document.getElementById('status-message');

  if (!target) return;

  target.textContent = message;
  target.className = `status-banner ${isError ? 'error' : 'success'} show`;

  setTimeout(() => {
    target.classList.remove('show');
    setTimeout(() => {
      target.textContent = '';
      target.className = 'status-banner';
    }, 300);
  }, 3000);
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Builds header bar with title and close button. */
function createModalHeader(title: string, onDismiss: () => void): HTMLElement {
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '12px',
    marginBottom: '16px',
  });

  const titleEl = document.createElement('h2');
  titleEl.textContent = title;
  Object.assign(titleEl.style, {
    margin: '0',
    color: '#00509e',
    fontSize: '1.3rem',
    fontWeight: '600',
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    lineHeight: '1',
  });
  closeBtn.addEventListener('click', onDismiss);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  return header;
}

/** Constructs rendered alerts container element. */
function createAlertsSection(alerts: Types.ModalAlert[]): HTMLElement {
  const container = document.createElement('div');
  container.style.marginBottom = '12px';
  setHtml(container, alerts.map((alert) => Templates.modalAlert(alert)).join(''));
  return container;
}

/** Generates footer actions containing custom buttons. */
function createFooterButtons(buttons: Types.ModalButton[], closeModalFn: () => void): HTMLElement {
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    borderTop: '1px solid #e0e0e0',
    paddingTop: '16px',
  });

  for (const btnConfig of buttons) {
    const btn = document.createElement('button');
    btn.textContent = btnConfig.text;
    btn.className = `lcr-tools-btn lcr-tools-btn-${btnConfig.type || 'primary'}`;

    if (btnConfig.color) {
      btn.style.backgroundColor = btnConfig.color;
    }

    btn.addEventListener('click', async (e) => {
      if (btnConfig.onClick) {
        const keepOpen = await btnConfig.onClick(e);
        if (keepOpen !== true) closeModalFn();
      } else {
        closeModalFn();
      }
    });

    footer.appendChild(btn);
  }

  return footer;
}

/** Injects base CSS rules for modal animations and buttons. */
function injectModalBaseStyles(): void {
  const styleId = Dom.MODAL_BASE_STYLE_ID;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .lcr-tools-modal-backdrop,
    .lcr-tools-modal-backdrop * {
      box-sizing: border-box;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .lcr-tools-btn {
      padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600;
      cursor: pointer; transition: background-color 0.2s ease;
    }
    .lcr-tools-btn-primary { background: #00509e; color: #fff; }
    .lcr-tools-btn-primary:hover { background: #003d7a; }
    .lcr-tools-btn-secondary { background: #e0e0e0; color: #333; }
    .lcr-tools-btn-secondary:hover { background: #d0d0d0; }
    .lcr-tools-btn-danger { background: #d32f2f; color: #fff; }
    .lcr-tools-btn-danger:hover { background: #b71c1c; }
  `;
  document.head.appendChild(style);
}
