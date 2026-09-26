import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { runMemberFlashcards } from '@/actions/memberFlashcards';

export default defineUnlistedScript(() => {
  runMemberFlashcards();
});
