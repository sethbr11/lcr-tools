import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runDownloadReportData } from '@/actions/downloadReportData';

export default defineUnlistedScript(() => {
  runDownloadReportData();
});
