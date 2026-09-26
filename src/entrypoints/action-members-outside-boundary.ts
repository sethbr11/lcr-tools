import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runMembersOutsideBoundary } from '@/actions/membersOutsideBoundary';

export default defineUnlistedScript(() => {
  runMembersOutsideBoundary();
});
