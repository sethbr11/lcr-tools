import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runFindMultipleCallings } from '@/actions/findMultipleCallings';

export default defineUnlistedScript(() => {
  runFindMultipleCallings();
});
