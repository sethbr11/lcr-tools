import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createStandardModal,
  createSideModal,
  closeModal,
  showStatus,
} from '@/utils/ui/modalUtils';

describe('modalUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    closeModal('test-modal');
    closeModal('test-side-modal');
  });

  describe('createStandardModal', () => {
    it('should create and display standard modal with title and content', () => {
      createStandardModal({
        id: 'test-modal',
        title: 'Test Modal Title',
        content: '<p>Test Body Content</p>',
      });

      const modal = document.getElementById('test-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Test Modal Title');
      expect(modal?.textContent).toContain('Test Body Content');
    });

    it('should render footer action buttons and execute callbacks', () => {
      let clicked = false;
      createStandardModal({
        id: 'test-modal',
        title: 'Action Modal',
        buttons: [
          {
            text: 'Click Me',
            onClick: () => {
              clicked = true;
            },
          },
        ],
      });

      const btn = document.querySelector<HTMLButtonElement>('.lcr-tools-btn');
      expect(btn).not.toBeNull();
      btn?.click();
      expect(clicked).toBe(true);
    });

    it('should close modal when clicking close cross', () => {
      createStandardModal({
        id: 'test-modal',
        title: 'Dismissable Modal',
      });

      const closeCross = document.querySelector<HTMLButtonElement>('button');
      closeCross?.click();
      expect(document.getElementById('test-modal')).toBeNull();
    });
  });

  describe('createSideModal', () => {
    it('should create side modal container', () => {
      createSideModal({
        id: 'test-side-modal',
        title: 'Side Drawer',
        side: 'right',
      });

      const modal = document.getElementById('test-side-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Side Drawer');
    });
  });

  describe('showStatus', () => {
    it('should update status banner element text and class', () => {
      const banner = document.createElement('div');
      banner.id = 'status-banner';
      document.body.appendChild(banner);

      showStatus('Success message', false, banner);
      expect(banner.textContent).toBe('Success message');
      expect(banner.className).toContain('success');

      showStatus('Error message', true, banner);
      expect(banner.textContent).toBe('Error message');
      expect(banner.className).toContain('error');
    });
  });
});
