/**
 * WhatIfSliders — Sprint 003 D4.
 *
 * Five view-only sliders (Height, Weight, 40yd, GPA, SAT). Changing any
 * slider updates the scorecard figures and match results via onChange — ALL
 * changes are local state with zero network writes. Reset restores the true
 * profile values.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const SLIDER_CONFIG = [
  { key: 'height', label: 'Height', unit: 'in', min: 60, max: 84, step: 1 },
  { key: 'weight', label: 'Weight', unit: 'lb', min: 140, max: 360, step: 1 },
  { key: 'speed_40', label: '40yd', unit: 's', min: 4.2, max: 5.8, step: 0.05 },
  { key: 'gpa', label: 'GPA', unit: '', min: 2.0, max: 4.5, step: 0.05 },
  { key: 'sat', label: 'SAT', unit: '', min: 600, max: 1600, step: 10 },
];

function parseNumeric(v) {
  if (v == null || v === '') return NaN;
  const n = parseFloat(v);
  return isNaN(n) ? NaN : n;
}

function formatValue(key, v) {
  if (v == null || isNaN(v)) return '—';
  if (key === 'speed_40' || key === 'gpa') return Number(v).toFixed(2);
  return String(Math.round(v));
}

export default function WhatIfSliders({ trueProfile, overrides, onChange, onReset }) {
  const trueValues = useMemo(() => {
    const out = {};
    for (const cfg of SLIDER_CONFIG) {
      const raw = parseNumeric(trueProfile?.[cfg.key]);
      out[cfg.key] = isNaN(raw) ? cfg.min : raw;
    }
    return out;
  }, [trueProfile]);

  const isDirty = useMemo(() => {
    if (!overrides) return false;
    return SLIDER_CONFIG.some(cfg => {
      const ov = overrides[cfg.key];
      if (ov == null || ov === '') return false;
      return parseNumeric(ov) !== trueValues[cfg.key];
    });
  }, [overrides, trueValues]);

  const handleChange = useCallback((key, value) => {
    if (!onChange) return;
    onChange({ ...(overrides || {}), [key]: value });
  }, [onChange, overrides]);

  return (
    <section
      data-testid="what-if-sliders"
      style={{
        margin: '24px 0',
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#2C2C2C',
            margin: 0,
          }}>
            What If?
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#6B6B6B', fontSize: '0.85rem' }}>
            Move a slider to see how your scores and matches would shift. Nothing here is saved to your profile.
          </p>
        </div>
        <button
          data-testid="what-if-reset"
          onClick={onReset}
          disabled={!isDirty}
          style={{
            padding: '8px 16px',
            backgroundColor: isDirty ? '#8B3A3A' : '#E8E8E8',
            color: isDirty ? '#FFFFFF' : '#6B6B6B',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: isDirty ? 'pointer' : 'default',
            boxShadow: isDirty ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          Reset to my profile
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {SLIDER_CONFIG.map(cfg => {
          const currentRaw = overrides?.[cfg.key];
          const current = (currentRaw == null || currentRaw === '') ? trueValues[cfg.key] : parseNumeric(currentRaw);
          const displayVal = formatValue(cfg.key, current);
          const trueVal = formatValue(cfg.key, trueValues[cfg.key]);
          const unit = cfg.unit ? ` ${cfg.unit}` : '';
          const changed = current !== trueValues[cfg.key];
          return (
            <label
              key={cfg.key}
              data-testid={`slider-${cfg.key}`}
              data-changed={changed ? 'true' : 'false'}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#2C2C2C' }}>
                <span style={{ fontWeight: 600 }}>{cfg.label}</span>
                <span style={{ color: changed ? '#8B3A3A' : '#6B6B6B', fontWeight: changed ? 700 : 500 }}>
                  {displayVal}{unit}
                </span>
              </span>
              <input
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={current}
                onChange={(e) => handleChange(cfg.key, parseNumeric(e.target.value))}
                aria-label={`${cfg.label} what-if slider`}
                style={{ width: '100%', accentColor: '#8B3A3A' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#9B9B9B' }}>
                Your profile: {trueVal}{unit}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
