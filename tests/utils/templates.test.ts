import { describe, it, expect } from 'vitest';
import { Templates } from '@/utils/ui/templates';

describe('utils templates', () => {
  describe('confirmationModal', () => {
    it('should generate confirmation modal markup with title and buttons', () => {
      const html = Templates.confirmationModal({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this?',
        cancelText: 'Cancel',
        confirmText: 'Delete',
        confirmColor: 'danger',
      });

      expect(html).toContain('<h3>Delete Item</h3>');
      expect(html).toContain('<p>Are you sure you want to delete this?</p>');
      expect(html).toContain('id="lcr-tools-cancel-btn"');
      expect(html).toContain('id="lcr-tools-confirm-btn"');
      expect(html).toContain('lcr-tools-btn-danger');
    });
  });

  describe('loadingOverlay', () => {
    it('should generate loading overlay markup with spinner and text', () => {
      const html = Templates.loadingOverlay('Loading records...', 'Press ESC to cancel');

      expect(html).toContain('lcr-tools-spinner');
      expect(html).toContain('<p>Loading records...</p>');
      expect(html).toContain('<span>Press ESC to cancel</span>');
    });
  });

  describe('tableOptionItem', () => {
    it('should render radio option for single table selection', () => {
      const html = Templates.tableOptionItem({
        idx: 2,
        name: 'Relief Society',
        type: 'Ministering',
        allowMultiple: false,
        isChecked: true,
      });

      expect(html).toContain('type="radio"');
      expect(html).toContain('value="2"');
      expect(html).toContain('checked');
      expect(html).toContain('Relief Society');
      expect(html).toContain('Type: Ministering');
    });

    it('should render checkbox option for multi table selection', () => {
      const html = Templates.tableOptionItem({
        idx: 0,
        name: 'Elders Quorum',
        type: 'Organization',
        allowMultiple: true,
        isChecked: false,
      });

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('value="0"');
      expect(html).not.toContain('checked');
      expect(html).toContain('Elders Quorum');
    });
  });

  describe('tableSelectionDialog', () => {
    it('should render dialog wrapper with action buttons', () => {
      const html = Templates.tableSelectionDialog({
        title: 'Select Tables',
        prompt: 'Choose which tables to export:',
        listHtml: '<div>List of items</div>',
      });

      expect(html).toContain('Select Tables</h3>');
      expect(html).toContain('Choose which tables to export:');
      expect(html).toContain('<div>List of items</div>');
      expect(html).toContain('id="lcr-cancel-tables"');
      expect(html).toContain('id="lcr-confirm-tables"');
    });

    it('should render select and deselect all buttons when allowMultiple is true', () => {
      const html = Templates.tableSelectionDialog({
        title: 'Select Tables',
        prompt: 'Choose tables:',
        listHtml: '<div>Items</div>',
        allowMultiple: true,
      });

      expect(html).toContain('id="lcr-select-all-tables"');
      expect(html).toContain('id="lcr-deselect-all-tables"');
    });
  });

  describe('filenamePromptDialog', () => {
    it('should render filename input, prompt message, and buttons', () => {
      const html = Templates.filenamePromptDialog({
        title: 'Save Report As',
        prompt: 'Enter filename:',
        defaultValue: 'report.csv',
        hint: 'Will be saved as CSV',
        cancelText: 'Cancel',
        confirmText: 'Download',
      });

      expect(html).toContain('Save Report As</h3>');
      expect(html).toContain('Enter filename:');
      expect(html).toContain('id="lcr-filename-input"');
      expect(html).toContain('value="report.csv"');
      expect(html).toContain('id="lcr-filename-cancel-btn"');
      expect(html).toContain('id="lcr-filename-confirm-btn"');
    });
  });

  describe('modalAlert', () => {
    it('should render alert box with appropriate error styling', () => {
      const html = Templates.modalAlert({
        type: 'error',
        message: 'Something went wrong',
      });

      expect(html).toContain('lcr-tools-alert-error');
      expect(html).toContain('Something went wrong');
    });

    it('should render alert box with info styling', () => {
      const html = Templates.modalAlert({
        type: 'info',
        message: 'Informational note',
      });

      expect(html).toContain('lcr-tools-alert-info');
      expect(html).toContain('Informational note');
    });
  });

  describe('modalHeader', () => {
    it('should render modal header title and close button', () => {
      const html = Templates.modalHeader('Audit Overview');

      expect(html).toContain('Audit Overview</h2>');
      expect(html).toContain('class="lcr-tools-modal-close-btn"');
    });
  });
});
