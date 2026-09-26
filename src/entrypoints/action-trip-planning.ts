import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runTripPlanning } from '@/actions/tripPlanning';

export default defineUnlistedScript(() => {
  runTripPlanning();
});
