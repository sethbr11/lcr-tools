import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  showLoadingIndicator,
  hideLoadingIndicator,
  showToast,
  showConfirmationModal,
  confirmDataStewardshipDownload,
  removeElement,
} from '@/utils/ui/uiUtils';
import { isAborted, resetAborted } from '@/utils/coreUtils';

describe('uiUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetAborted();
  });

  afterEach(() => {
    hideLoadingIndicator();
  });

  describe('Loading Indicator', () => {
    it('should create loading indicator with default message', () => {
      showLoadingIndicator();
      const overlay = document.getElementById('lcr-tools-loader-overlay-shared');
      expect(overlay).not.toBeNull();
      expect(overlay?.textContent).toContain('Processing... Please wait.');
    });

    it('should update existing overlay with new message', () => {
      showLoadingIndicator('First Message');
      showLoadingIndicator('Updated Message');
      const overlay = document.getElementById('lcr-tools-loader-overlay-shared');
      expect(overlay?.textContent).toContain('Updated Message');
    });

    it('should remove loading overlay on hideLoadingIndicator', () => {
      showLoadingIndicator();
      hideLoadingIndicator();
      const overlay = document.getElementById('lcr-tools-loader-overlay-shared');
      expect(overlay).toBeNull();
    });

    it('should set aborted state when hidden with event', () => {
      showLoadingIndicator();
      hideLoadingIndicator(new Event('click'));
      expect(isAborted()).toBe(true);
    });
  });

  describe('Toast Notifications', () => {
    it('should create toast notification element with success type by default', () => {
      const toast = showToast('Operation complete');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toBe('Operation complete');
      expect(toast.className).toContain('lcr-tools-toast-success');
    });

    it('should support error and warning toast types', () => {
      const errorToast = showToast('Error occurred', { type: 'error' });
      expect(errorToast.className).toContain('lcr-tools-toast-error');

      const warnToast = showToast('Be careful', { type: 'warning' });
      expect(warnToast.className).toContain('lcr-tools-toast-warning');
    });
  });

  describe('Confirmation Modal', () => {
    it('should mount modal and resolve true on confirm click', async () => {
      const promise = showConfirmationModal({
        title: 'Confirm Delete',
        message: 'Are you sure?',
      });

      const confirmBtn = document.getElementById('lcr-tools-confirm-btn');
      expect(confirmBtn).not.toBeNull();
      confirmBtn?.click();

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should resolve false on cancel click', async () => {
      const promise = showConfirmationModal({
        message: 'Proceed?',
      });

      const cancelBtn = document.getElementById('lcr-tools-cancel-btn');
      cancelBtn?.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should resolve false on Escape without closing underlying overlays', async () => {
      const underlying = document.createElement('div');
      underlying.id = 'underlying-overlay';
      document.body.appendChild(underlying);

      const promise = showConfirmationModal({ message: 'Proceed?' });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      const result = await promise;
      expect(result).toBe(false);
      expect(document.querySelector('.lcr-tools-confirm-modal')).toBeNull();
      expect(document.getElementById('underlying-overlay')).not.toBeNull();
    });
  });

  describe('Data Stewardship Download Confirmation', () => {
    it('should show Handbook 33.8 copy and resolve true on Download', async () => {
      const promise = confirmDataStewardshipDownload();
      const modal = document.querySelector('.lcr-tools-confirm-modal');
      expect(modal?.textContent).toContain('Data Stewardship Reminder');
      expect(modal?.textContent).toContain('Handbook Section 33.8');

      document.getElementById('lcr-tools-confirm-btn')?.click();
      await expect(promise).resolves.toBe(true);
    });
  });

  describe('removeElement', () => {
    it('should remove an element by reference or string ID', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      document.body.appendChild(div);

      removeElement('test-div');
      expect(document.getElementById('test-div')).toBeNull();
    });
  });
});
