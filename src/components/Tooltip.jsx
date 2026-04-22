/**
 * Tooltip.jsx — Generic, accessible tooltip primitive.
 *
 * Built for Sprint 004 SC-5 (G8 precursor). Intended consumers: column-header
 * and sort-label tooltips on GRIT FIT tables, plus any future one-off hover/tap
 * hints that do not need the multi-context row hover behavior of PORTooltip.
 *
 * Contract:
 *   Props:
 *     content: ReactNode (required) — tooltip body
 *     children: ReactNode (required) — trigger element(s)
 *     placement?: 'top' | 'bottom' | 'left' | 'right' (default 'top')
 *     showOn?: 'hover' | 'tap' | 'both' (default 'both')
 *     ariaLabel?: string (used when content is non-text)
 *     id?: string (optional explicit id; else auto-generated)
 *
 * Behavior:
 *   - Desktop hover: mouseenter shows after 150ms (flicker-guard); mouseleave
 *     hides immediately.
 *   - Mobile tap: click trigger toggles; tap-outside dismisses.
 *   - Keyboard: focus shows immediately; blur hides immediately; Escape hides.
 *   - role="tooltip" on the content node; aria-describedby on the trigger
 *     wrapper points to the tooltip id.
 *   - Positioning: simple CSS placement — no collision detection. G8 can
 *     revisit if needed.
 *
 * Testing: the internal state-machine is exported as pure helpers
 * (computeNextState, resolvePlacementStyle) so tests can run in node env
 * without jsdom. Full interaction tests require jsdom + RTL, which are not
 * currently installed (see tests/unit/tooltip.test.jsx header).
 */

import { useEffect, useId, useRef, useState } from 'react';

const SHOW_DELAY_MS = 150;

// --- Pure helpers (exported for node-env unit tests) ---

/**
 * computeNextState — deterministic state machine for visibility.
 * @param {{visible: boolean, mode: 'hover'|'tap'|'both'}} state
 * @param {{type: string}} event
 * @returns {{visible: boolean}}
 */
export function computeNextState(state, event) {
  const { visible, mode } = state;
  const hoverAllowed = mode === 'hover' || mode === 'both';
  const tapAllowed = mode === 'tap' || mode === 'both';
  switch (event.type) {
    case 'mouseenter':
      return hoverAllowed ? { visible: true } : { visible };
    case 'mouseleave':
      return hoverAllowed ? { visible: false } : { visible };
    case 'focus':
      return { visible: true };
    case 'blur':
      return { visible: false };
    case 'click-trigger':
      return tapAllowed ? { visible: !visible } : { visible };
    case 'click-outside':
      return { visible: false };
    case 'escape':
      return { visible: false };
    default:
      return { visible };
  }
}

/**
 * resolvePlacementStyle — CSS positioning for the four placements.
 * Returned object is applied to the tooltip content node.
 */
export function resolvePlacementStyle(placement) {
  switch (placement) {
    case 'bottom':
      return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 };
    case 'left':
      return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 };
    case 'right':
      return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };
    case 'top':
    default:
      return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 };
  }
}

const VALID_PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const VALID_SHOW_ON = ['hover', 'tap', 'both'];

// --- Component ---

export default function Tooltip({
  content,
  children,
  placement = 'top',
  showOn = 'both',
  ariaLabel,
  id,
}) {
  const safePlacement = VALID_PLACEMENTS.includes(placement) ? placement : 'top';
  const safeShowOn = VALID_SHOW_ON.includes(showOn) ? showOn : 'both';

  const [visible, setVisible] = useState(false);
  const showTimer = useRef(null);
  const wrapperRef = useRef(null);
  const reactId = useId();
  const tooltipId = id || `tooltip-${reactId}`;

  const dispatch = (event) => {
    const next = computeNextState({ visible, mode: safeShowOn }, event);
    if (next.visible !== visible) setVisible(next.visible);
  };

  const clearShowTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };

  const onMouseEnter = () => {
    if (safeShowOn === 'tap') return;
    clearShowTimer();
    showTimer.current = setTimeout(() => dispatch({ type: 'mouseenter' }), SHOW_DELAY_MS);
  };

  const onMouseLeave = () => {
    if (safeShowOn === 'tap') return;
    clearShowTimer();
    dispatch({ type: 'mouseleave' });
  };

  const onFocus = () => {
    clearShowTimer();
    dispatch({ type: 'focus' });
  };

  const onBlur = () => {
    clearShowTimer();
    dispatch({ type: 'blur' });
  };

  const onClick = () => {
    if (safeShowOn === 'hover') return;
    clearShowTimer();
    dispatch({ type: 'click-trigger' });
  };

  // Escape key + click-outside (tap mode)
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dispatch({ type: 'escape' });
    };
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        dispatch({ type: 'click-outside' });
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Cleanup timer on unmount
  useEffect(() => () => clearShowTimer(), []);

  const placementStyle = resolvePlacementStyle(safePlacement);

  const wrapperStyle = {
    position: 'relative',
    display: 'inline-block',
  };

  const tooltipStyle = {
    position: 'absolute',
    zIndex: 1000,
    backgroundColor: '#2C2C2C',
    color: '#FFFFFF',
    fontSize: '0.75rem',
    lineHeight: 1.4,
    padding: '6px 10px',
    borderRadius: 4,
    whiteSpace: 'normal',
    maxWidth: 260,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    ...placementStyle,
  };

  return (
    <span
      ref={wrapperRef}
      style={wrapperStyle}
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      data-testid="tooltip-trigger"
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          aria-label={ariaLabel}
          data-testid="tooltip-content"
          style={tooltipStyle}
        >
          {content}
        </span>
      )}
    </span>
  );
}
