import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Dom, Constants } from '@/types';
import { showLcrMaintenanceModal } from '@/utils/ui/maintenanceUtils';
import { closeModal } from '@/utils/ui/modalUtils';
import { showLoadingIndicator } from '@/utils/ui/uiUtils';

describe('maintenanceUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    closeModal(Dom.MAINTENANCE_MODAL_ID);
  });

  it('should display maintenance modal with default message and contact email', () => {
    const modal = showLcrMaintenanceModal();

    expect(modal).not.toBeNull();
    expect(document.getElementById(Dom.MAINTENANCE_MODAL_ID)).not.toBeNull();
    expect(modal.textContent).toContain('LCR Maintenance Required');
    expect(modal.textContent).toContain(Constants.MAINTENANCE_EMAIL);

    const mailLink = modal.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailLink).not.toBeNull();
    expect(mailLink.href).toContain(Constants.MAINTENANCE_EMAIL);
    expect(mailLink.href).toContain('LCR%20Maintenance%20Request');
  });

  it('should include reason details when called with string reason', () => {
    const modal = showLcrMaintenanceModal('Attendance table element was not found in DOM.');

    expect(modal.textContent).toContain('Attendance table element was not found in DOM.');
    expect(modal.textContent).toContain(Constants.MAINTENANCE_EMAIL);
  });

  it('should include action name and details when called with two arguments', () => {
    const modal = showLcrMaintenanceModal('Member Directory', 'Row selectors mismatch');

    expect(modal.textContent).toContain('Member Directory');
    expect(modal.textContent).toContain('Row selectors mismatch');

    const mailLink = modal.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailLink.href).toContain('Member%20Directory');
  });

  it('should support options object with actionName and reason', () => {
    const modal = showLcrMaintenanceModal({
      actionName: 'Trip Planner',
      reason: 'GeoJSON boundary polygon missing',
    });

    expect(modal.textContent).toContain('Trip Planner');
    expect(modal.textContent).toContain('GeoJSON boundary polygon missing');

    const mailLink = modal.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mailLink.href).toContain('Trip%20Planner');
  });

  it('should dismiss any active loading indicator before presenting modal', () => {
    showLoadingIndicator('Processing items...', 'Please wait');
    expect(document.getElementById(Dom.LOADER_OVERLAY_ID)).not.toBeNull();

    showLcrMaintenanceModal('Test reason');

    expect(document.getElementById(Dom.LOADER_OVERLAY_ID)).toBeNull();
    expect(document.getElementById(Dom.MAINTENANCE_MODAL_ID)).not.toBeNull();
  });

  it('should close maintenance modal when Close button is clicked', async () => {
    const modal = showLcrMaintenanceModal();

    const closeBtn = modal.querySelector('.lcr-tools-btn-secondary') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    await Promise.resolve();

    expect(document.getElementById(Dom.MAINTENANCE_MODAL_ID)).toBeNull();
  });
});
