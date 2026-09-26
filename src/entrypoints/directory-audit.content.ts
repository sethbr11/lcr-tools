import { defineContentScript } from 'wxt/utils/define-content-script';
import { Constants as BoundaryConstants } from '@/actions/membersOutsideBoundary/types';

export default defineContentScript({
  matches: ['https://directory.churchofjesuschrist.org/*'],
  runAt: 'document_idle',
  async main() {
    const executePendingActions = async () => {
      if (sessionStorage.getItem(BoundaryConstants.AUDIT_PENDING_KEY) === 'true') {
        const { runMembersOutsideBoundary } = await import('@/actions/membersOutsideBoundary');
        await runMembersOutsideBoundary();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          executePendingActions();
        },
        { once: true }
      );
    } else {
      await executePendingActions();
    }
  },
});
