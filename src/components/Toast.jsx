import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Toast primitive — single global slot, fade in/out, 3s auto-dismiss,
 * success/error variants, accessible via aria-live="polite".
 *
 * Sprint 025 Phase 4 — added so the CMG Copy / Email-to-Self / Error
 * actions have a consistent feedback surface. Theme-invariant per
 * DESIGN_NOTES — confirmation and error feedback reads consistently
 * across partner schools.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ message: 'Copied!', variant: 'success' });
 *   showToast({ message: 'Copy failed', variant: 'error' });
 */

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 3000;
const FADE_MS = 200;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, variant, phase }
  const dismissTimer = useRef(null);
  const removeTimer = useRef(null);

  const clearTimers = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
      removeTimer.current = null;
    }
  }, []);

  const showToast = useCallback(
    ({ message, variant = 'success' }) => {
      clearTimers();
      const id = Date.now() + Math.random();
      // Mount phase = 'enter' for fade-in; flip to 'visible' on next frame so
      // CSS transition fires reliably (same two-frame pattern SlideOutShell uses).
      setToast({ id, message, variant, phase: 'enter' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToast(prev => (prev && prev.id === id ? { ...prev, phase: 'visible' } : prev));
        });
      });
      dismissTimer.current = setTimeout(() => {
        setToast(prev => (prev && prev.id === id ? { ...prev, phase: 'leave' } : prev));
        removeTimer.current = setTimeout(() => {
          setToast(prev => (prev && prev.id === id ? null : prev));
        }, FADE_MS);
      }, AUTO_DISMISS_MS);
    },
    [clearTimers],
  );

  const dismissToast = useCallback(() => {
    clearTimers();
    setToast(prev => (prev ? { ...prev, phase: 'leave' } : prev));
    setTimeout(() => setToast(null), FADE_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastSlot toast={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastSlot({ toast, onDismiss }) {
  if (!toast) return null;
  const variantStyle =
    toast.variant === 'error'
      ? { backgroundColor: '#B85C2A', color: '#FFFFFF' }
      : { backgroundColor: 'var(--brand-maroon, #8B3A3A)', color: 'var(--brand-on-maroon-text, #FFFFFF)' };
  const opacity = toast.phase === 'visible' ? 1 : 0;
  const translateY = toast.phase === 'visible' ? '0' : '8px';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="cmg-toast"
      data-variant={toast.variant}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 10000,
        opacity,
        transform: `translateY(${translateY})`,
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        pointerEvents: opacity === 1 ? 'auto' : 'none',
        padding: '12px 18px',
        borderRadius: 8,
        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.95rem',
        maxWidth: 360,
        ...variantStyle,
      }}
      onClick={onDismiss}
    >
      {toast.message}
    </div>
  );
}
