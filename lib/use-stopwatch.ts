'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
export function useStopwatch() {
  const start = useRef(0);
  const reset = useCallback(() => {
    start.current = performance.now();
  }, []);
  const elapsed = useCallback(
    () => Math.max(0, performance.now() - start.current),
    [],
  );
  useEffect(reset, [reset]);
  return useMemo(() => ({ reset, elapsed }), [reset, elapsed]);
}
