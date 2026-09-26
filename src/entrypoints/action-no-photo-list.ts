import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runNoPhotoList } from '@/actions/noPhotoList';

export default defineUnlistedScript(() => {
  runNoPhotoList();
});
