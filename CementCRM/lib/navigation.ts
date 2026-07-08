import { Router } from 'expo-router';

// Screens reached via router.replace() (e.g. straight after creating a new
// lead) have no history to go back to -- falling back to a known route
// avoids the "GO_BACK was not handled by any navigator" crash.
export function goBackOr(router: Router, fallback: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
