import { useState, useEffect } from 'react';

/**
 * useIsNarrowViewport — Sprint 004 Wave 4 S3
 *
 * Reactive hook that returns true when window.innerWidth < threshold.
 * Default threshold: 400px. This is intentionally NOT the same as the
 * useIsDesktop 1024px breakpoint — the S3 Email Coach / Email Counselor
 * button label rule (A-10) collapses labels below 400px specifically, not
 * at the desktop/tablet boundary.
 *
 * SSR-safe (returns false on server-side when window is undefined).
 *
 * Debounced resize listener (250ms) mirroring useIsDesktop pattern.
 *
 * @param {number} threshold - default 400
 * @returns {boolean}
 */
export default function useIsNarrowViewport(threshold = 400) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < threshold : false
  );

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsNarrow(window.innerWidth < threshold);
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [threshold]);

  return isNarrow;
}
