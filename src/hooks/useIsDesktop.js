import { useState, useEffect } from 'react';

// Shared desktop-breakpoint hook — Decision 4 (Session 016-B).
// Returns true when viewport width >= breakpoint (default 1024px).
// Resize listener is debounced at 250ms to prevent render thrashing.
export default function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true
  );

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsDesktop(window.innerWidth >= breakpoint);
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isDesktop;
}
