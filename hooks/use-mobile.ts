'use client';

import { useSyncExternalStore } from 'react';

const query = '(max-width: 767px)';
function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
const snapshot = () =>
  typeof window === 'undefined' ? false : window.matchMedia(query).matches;
export function useIsMobile() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
