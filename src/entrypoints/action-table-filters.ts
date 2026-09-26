import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runTableFilters } from '@/actions/tableFilters';

export default defineUnlistedScript(() => {
  runTableFilters();
});
