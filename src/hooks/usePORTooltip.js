// usePORTooltip.js — Trigger and positioning logic for POR tooltip.
// Spec: POR_TOOLTIP_COMPONENT_SPEC.md §4 (Hover Trigger Behavior), §5 (Positioning)
// Hover: 300ms show delay (150ms if already showing for debounce).
// Touch: 100ms show, immediate hide on touchEnd.
// Keyboard: 0ms on focus. Escape: immediate dismiss.
// Scroll: recalculate position (100ms debounce), hide if row leaves viewport.

import { useState, useRef, useCallback, useEffect } from 'react';

export default function usePORTooltip() {
  const [activeRowId, setActiveRowId] = useState(null);
  const [triggerRect, setTriggerRect] = useState(null);
  const activeRef = useRef(null);
  const hoverTimer = useRef(null);
  const touchTimer = useRef(null);
  const fadeTimer = useRef(null);
  const triggerEl = useRef(null);

  const clearTimers = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (touchTimer.current) { clearTimeout(touchTimer.current); touchTimer.current = null; }
    if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
  }, []);

  const show = useCallback((id, el) => {
    clearTimers();
    activeRef.current = id;
    triggerEl.current = el;
    setActiveRowId(id);
    setTriggerRect(el.getBoundingClientRect());
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    activeRef.current = null;
    triggerEl.current = null;
    setActiveRowId(null);
    setTriggerRect(null);
  }, [clearTimers]);

  // Mouse enter: 300ms delay, or 150ms if already showing (rapid traversal debounce — spec §4.2)
  const onRowMouseEnter = useCallback((id, e) => {
    clearTimers();
    const el = e.currentTarget;
    const delay = activeRef.current ? 150 : 300;
    hoverTimer.current = setTimeout(() => show(id, el), delay);
  }, [clearTimers, show]);

  // Mouse leave: 500ms before unmounting (spec §4.2)
  const onRowMouseLeave = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    fadeTimer.current = setTimeout(hide, 500);
  }, [hide]);

  // Tooltip hover: cancel/restart fade so user can read the tooltip
  const onTooltipMouseEnter = useCallback(() => {
    if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
  }, []);
  const onTooltipMouseLeave = useCallback(() => {
    fadeTimer.current = setTimeout(hide, 500);
  }, [hide]);

  // Touch: 100ms show, immediate hide on touchEnd (spec §4.1, §4.3)
  const onRowTouchStart = useCallback((id, e) => {
    clearTimers();
    const el = e.currentTarget;
    touchTimer.current = setTimeout(() => show(id, el), 100);
  }, [clearTimers, show]);
  const onRowTouchEnd = useCallback(() => { clearTimers(); hide(); }, [clearTimers, hide]);

  // Keyboard focus: 0ms (spec §4.1)
  const onRowFocus = useCallback((id, e) => { clearTimers(); show(id, e.currentTarget); }, [clearTimers, show]);
  const onRowBlur = useCallback(() => { clearTimers(); hide(); }, [clearTimers, hide]);

  // Escape key: immediate dismiss (spec §4.1)
  useEffect(() => {
    if (!activeRowId) return;
    const handler = (e) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeRowId, hide]);

  // Scroll: recalculate position or hide if off-screen (spec §5.1, 100ms debounce)
  useEffect(() => {
    if (!activeRowId) return;
    let debounce = null;
    const handler = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!triggerEl.current) { hide(); return; }
        const rect = triggerEl.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          hide();
        } else {
          setTriggerRect(rect);
        }
      }, 100);
    };
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('scroll', handler, true);
      if (debounce) clearTimeout(debounce);
    };
  }, [activeRowId, hide]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    activeRowId,
    triggerRect,
    onRowMouseEnter,
    onRowMouseLeave,
    onTooltipMouseEnter,
    onTooltipMouseLeave,
    onRowTouchStart,
    onRowTouchEnd,
    onRowFocus,
    onRowBlur,
    hide,
  };
}
