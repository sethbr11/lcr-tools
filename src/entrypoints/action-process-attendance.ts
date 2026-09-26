import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runProcessAttendance } from '@/actions/processAttendance';

export default defineUnlistedScript(() => {
  runProcessAttendance();
});
