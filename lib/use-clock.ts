'use client';
import { useSyncExternalStore } from 'react';
let now = 0;
let interval: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const notify = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!interval) {
    now = Date.now();
    interval = setInterval(notify, 30000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(interval);
      interval = undefined;
    }
  };
};
export function useClock() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
