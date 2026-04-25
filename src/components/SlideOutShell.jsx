/**
 * SlideOutShell — reusable content-agnostic slide-out panel (Sprint 004 SC-3).
 *
 * Sprint 005 D7 — animated entry/exit transition.
 *   Envelope: 240ms ease-out (operator-fixed; do not deviate).
 *   Desktop: slide from RIGHT (transform: translateX 100% -> 0).
 *   Mobile (<= 768px): slide from BOTTOM (transform: translateY 100% -> 0).
 *   prefers-reduced-motion: no transform animation; instant show/hide.
 *
 * Mount/unmount lifecycle:
 *   - When isOpen flips true, we mount the panel in its off-screen position,
 *     then on the next animation frame flip the transform target to 0 so the
 *     CSS transition runs.
 *   - When isOpen flips false, we run the reverse transform and keep the
 *     panel mounted for the duration of the transition (240ms), then
 *     unmount. While unmounting we still render the overlay with a fading
 *     backdrop so closing is symmetric with opening.
 *   - When prefers-reduced-motion is set, we skip both the off-screen start
 *     and the unmount delay — the panel mounts and unmounts immediately at
 *     the final transform.
 *
 * Consumers (Wave 3/4): G7b (mobile GRIT FIT row tap -> SchoolDetailsCard),
 * G5 (map marker click -> SchoolDetailsCard), S3 (Shortlist row tap -> its own
 * content composition). Per operator ruling A-3, this shell is content-agnostic
 * and accepts children so S3 can compose without SC-4 reuse.
 *
 * Visual parity:
 *   Width and backdrop match CoachSchoolDetailPanel (Sprint 003). Animation
 *   timing increased from 250ms (pre-Sprint 005) to 240ms (operator decision).
 *   Backdrop: rgba(0,0,0,0.25).
 *
 * Props:
 *   isOpen: boolean (required) — controlled visibility
 *   onClose: () => void (required) — fires on close button, backdrop click, Escape
 *   children: ReactNode (required) — slide-out content
 *   side?: 'right' | 'left' (default 'right')
 *   widthDesktop?: number | string (default 'min(50vw, 560px)')
 *   widthMobile?: number | string (default '100vw')
 *   ariaLabel?: string (default 'Details')
 *   closeButtonLabel?: string (default 'Close')
 */

import { useEffect, useRef, useState } from 'react';

const BODY_SCROLL_LOCK_CLASS = 'slide-out-shell-scroll-lock';
const ANIM_DURATION_MS = 240;            // Sprint 005 D7 — operator-fixed
const ANIM_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'; // ease-out feel

// SSR-safe lookup; in jsdom matchMedia may be undefined or stubbed.
function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// SSR-safe mobile breakpoint check (matches the @media (max-width: 768px)
// rule below). 768 is the existing CoachSchoolDetailPanel breakpoint.
function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

export default function SlideOutShell({
  isOpen,
  onClose,
  children,
  side = 'right',
  widthDesktop = 'min(50vw, 560px)',
  widthMobile = '100vw',
  ariaLabel = 'Details',
  closeButtonLabel = 'Close',
}) {
  const panelRef = useRef(null);

  // D7 — keep the panel mounted across the closing transition. `mounted`
  // tracks DOM presence; `entered` tracks the off-screen -> on-screen
  // transform flip. Transitions:
  //   isOpen false -> true: setMounted(true); on next frame setEntered(true)
  //   isOpen true  -> false: setEntered(false); after duration setMounted(false)
  const [mounted, setMounted] = useState(isOpen);
  const [entered, setEntered] = useState(isOpen);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (isOpen) {
      // Open path
      setMounted(true);
      if (reducedMotion) {
        setEntered(true);
        return undefined;
      }
      // Two-frame flip ensures the browser paints the off-screen start
      // position before applying the on-screen transform target.
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        if (r2) cancelAnimationFrame(r2);
      };
    }
    // Close path
    if (!mounted) return undefined;
    setEntered(false);
    if (reducedMotion) {
      setMounted(false);
      return undefined;
    }
    const t = setTimeout(() => setMounted(false), ANIM_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape key closes the shell when open. No-op when closed.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock keyed on isOpen (not mounted) — the close-animation
  // window is short (240ms) and consumers expect scroll to unlock on the
  // logical open->close flip, not on physical unmount. Test contract:
  // tests/unit/slide-out-shell.test.jsx asserts the body class clears as
  // soon as isOpen=false rerenders.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add(BODY_SCROLL_LOCK_CLASS);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove(BODY_SCROLL_LOCK_CLASS);
    };
  }, [isOpen]);

  // Focus moves into the panel when it opens.
  useEffect(() => {
    if (!isOpen) return;
    // Microtask so the panel is mounted / rendered before we focus.
    const raf = requestAnimationFrame(() => {
      if (panelRef.current) {
        // Prefer the first focusable inside the panel; fall back to the panel.
        const focusable = panelRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (focusable || panelRef.current).focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const isLeft = side === 'left';

  // Closed and unmounted: render nothing. No layout impact.
  if (!mounted) return null;

  const isMobile = isMobileViewport();

  // D7 — choose axis: desktop uses translateX (left/right), mobile uses
  // translateY (bottom). When entered=true we land at translate(0). When
  // entered=false (initial mount or closing) we sit at the off-screen end.
  let offscreenTransform;
  if (isMobile) {
    offscreenTransform = 'translateY(100%)';
  } else if (isLeft) {
    offscreenTransform = 'translateX(-100%)';
  } else {
    offscreenTransform = 'translateX(100%)';
  }
  const restingTransform = 'translate(0, 0)';
  const panelTransform = entered ? restingTransform : offscreenTransform;

  // Backdrop fades in/out on the same envelope.
  const backdropOpacity = entered ? 1 : 0;

  // Mobile slide-from-bottom requires the panel to anchor to the bottom of
  // the viewport. We override the overlay's flex alignment for that case.
  const overlayJustify = isMobile ? 'center' : (isLeft ? 'flex-start' : 'flex-end');
  const overlayAlign = isMobile ? 'flex-end' : 'stretch';

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9997,
    display: 'flex',
    justifyContent: overlayJustify,
    alignItems: overlayAlign,
  };

  const backdropStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 0,
    opacity: backdropOpacity,
    transition: reducedMotion
      ? 'none'
      : `opacity ${ANIM_DURATION_MS}ms ${ANIM_EASING}`,
  };

  const panelStyle = {
    position: 'relative',
    zIndex: 1,
    width: isMobile ? '100vw' : widthDesktop,
    maxWidth: '100vw',
    height: isMobile ? '90vh' : '100%',
    backgroundColor: '#FFFFFF',
    boxShadow: isMobile
      ? '0 -4px 24px rgba(0,0,0,0.15)'
      : (isLeft ? '4px 0 24px rgba(0,0,0,0.15)' : '-4px 0 24px rgba(0,0,0,0.15)'),
    overflowY: 'auto',
    transition: reducedMotion
      ? 'none'
      : `transform ${ANIM_DURATION_MS}ms ${ANIM_EASING}`,
    transform: panelTransform,
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
    borderTopLeftRadius: isMobile ? 12 : 0,
    borderTopRightRadius: isMobile ? 12 : 0,
  };

  const closeBtnWrap = {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    justifyContent: 'flex-start',
    padding: '12px 16px 0',
    backgroundColor: '#FFFFFF',
  };

  const closeBtnStyle = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #E8E8E8',
    backgroundColor: '#FFFFFF',
    color: '#2C2C2C',
    fontSize: '1.125rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  };

  // Mobile width via media query injected style tag (matches CoachSchoolDetailPanel pattern).
  // On mobile the panel anchors to the bottom and slides up, so we also
  // ensure the width is 100vw via the @media block in case JS-side
  // isMobileViewport() detection lags a resize.
  const mobileWidthCss = `
    @media (max-width: 768px) {
      [data-slideout-shell-panel="true"] {
        width: ${typeof widthMobile === 'number' ? `${widthMobile}px` : widthMobile} !important;
      }
    }
  `;

  return (
    <div data-testid="slide-out-shell-overlay" style={overlayStyle}>
      <div
        data-testid="slide-out-shell-backdrop"
        onClick={onClose}
        role="presentation"
        style={backdropStyle}
      />

      <div
        ref={panelRef}
        data-testid="slide-out-shell-panel"
        data-slideout-shell-panel="true"
        data-entered={entered ? 'true' : 'false'}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        data-axis={isMobile ? 'y' : 'x'}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={panelStyle}
      >
        <div style={closeBtnWrap}>
          <button
            type="button"
            data-testid="slide-out-shell-close"
            onClick={onClose}
            aria-label={closeButtonLabel}
            style={closeBtnStyle}
          >
            {'✕'}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>

      <style>{mobileWidthCss}</style>
    </div>
  );
}
