/**
 * SlideOutShell — reusable content-agnostic slide-out panel (Sprint 004 SC-3).
 *
 * Consumers (Wave 3/4): G7b (mobile GRIT FIT row tap -> SchoolDetailsCard),
 * G5 (map marker click -> SchoolDetailsCard), S3 (Shortlist row tap -> its own
 * content composition). Per operator ruling A-3, this shell is content-agnostic
 * and accepts children so S3 can compose without SC-4 reuse.
 *
 * Visual parity:
 *   Width, backdrop, and animation match CoachSchoolDetailPanel (Sprint 003 —
 *   the existing school-details slide-out). Animation: transform translateX
 *   250ms ease-out. Backdrop: rgba(0,0,0,0.25).
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

import { useEffect, useRef } from 'react';

const BODY_SCROLL_LOCK_CLASS = 'slide-out-shell-scroll-lock';

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

  // Escape key closes the shell when open. No-op when closed.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock when open. Uses a marker class + inline overflow so tests
  // can assert either. Cleanup restores previous state.
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

  // Closed state: render nothing. No layout impact.
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9997,
    display: 'flex',
    justifyContent: isLeft ? 'flex-start' : 'flex-end',
  };

  const backdropStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 0,
  };

  const panelStyle = {
    position: 'relative',
    zIndex: 1,
    width: widthDesktop,
    maxWidth: '100vw',
    height: '100%',
    backgroundColor: '#FFFFFF',
    boxShadow: isLeft
      ? '4px 0 24px rgba(0,0,0,0.15)'
      : '-4px 0 24px rgba(0,0,0,0.15)',
    overflowY: 'auto',
    transition: 'transform 250ms ease-out',
    transform: 'translateX(0)',
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
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
