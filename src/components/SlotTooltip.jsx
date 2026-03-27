/**
 * SlotTooltip — hover/click tooltip for State A share buttons.
 * Renders inline, positioned above the child element.
 */
import { useState } from 'react';

export default function SlotTooltip({ message, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(v => !v)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            backgroundColor: '#2C2C2C',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            padding: '8px 12px',
            borderRadius: 4,
            width: 240,
            whiteSpace: 'normal',
            lineHeight: 1.4,
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}
        >
          {message}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: 5,
              borderStyle: 'solid',
              borderColor: '#2C2C2C transparent transparent transparent',
            }}
          />
        </span>
      )}
    </span>
  );
}
