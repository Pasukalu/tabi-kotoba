import { useSyncExternalStore } from 'react';
const query = '(max-width: 767px)';
function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
const snapshot = () => window.matchMedia(query).matches;
export function useIsMobile() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
