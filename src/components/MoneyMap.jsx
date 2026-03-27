/**
 * MoneyMap — four-panel financial comparison chart.
 * Panels: Lowest Net Cost, Highest ADTLV, Fastest Payback, Best ROI.
 * Light theme adaptation from cfb-recruit-hub.
 */
import { useState } from 'react';

const PANELS = [
  {
    id: 'cost', title: 'Lowest Net Cost', sub: '4-year projected cost',
    key: 'netCost', color: '#4CAF50', inverted: true,
    fmt: v => '$' + Math.round(v / 1000) + 'K',
    filter: s => s.netCost != null && s.netCost > 0,
    sort: (a, b) => a.netCost - b.netCost,
  },
  {
    id: 'adltv', title: 'Highest ADTLV', sub: 'Adjusted degree lifetime value',
    key: 'adltv', color: '#1976D2', inverted: false,
    fmt: v => '$' + Math.round(v / 1000) + 'K',
    filter: s => s.adltv != null && s.adltv > 0,
    sort: (a, b) => b.adltv - a.adltv,
  },
  {
    id: 'payback', title: 'Fastest Payback', sub: 'Years to break even',
    key: 'breakEven', color: '#D4AF37', inverted: true,
    fmt: v => v.toFixed(1) + ' yr',
    filter: s => {
      const be = s.breakEven ?? (s.droi > 0 ? 40 / s.droi : null);
      return be != null && be > 0 && be < 200;
    },
    sort: (a, b) => {
      const aBe = a.breakEven ?? (a.droi > 0 ? 40 / a.droi : 999);
      const bBe = b.breakEven ?? (b.droi > 0 ? 40 / b.droi : 999);
      return aBe - bBe;
    },
  },
  {
    id: 'roi', title: 'Best ROI', sub: 'Degree return on investment',
    key: 'droi', color: '#8B3A3A', inverted: false,
    fmt: v => v.toFixed(1) + 'x',
    filter: s => s.droi != null && s.droi > 0,
    sort: (a, b) => b.droi - a.droi,
  },
];

export default function MoneyMap({ schools }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!schools || schools.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '12px 0', cursor: 'pointer',
          background: 'none', border: 'none', borderBottom: '1px solid #E8E8E8',
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem',
          color: '#2C2C2C', textAlign: 'left',
        }}
      >
        <span>Money Map</span>
        <span style={{ color: '#6B6B6B' }}>{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16, marginTop: 16,
        }}>
          {PANELS.map(panel => {
            const items = schools
              .filter(panel.filter)
              .map(s => ({
                ...s,
                breakEven: s.breakEven ?? (s.droi > 0 ? 40 / s.droi : null),
              }))
              .sort(panel.sort)
              .slice(0, 8);

            if (items.length === 0) {
              return (
                <div key={panel.id} style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8',
                  borderRadius: 8, padding: 16,
                }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: panel.color, marginBottom: 4 }}>
                    {panel.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                    Add schools with financial data to see this chart.
                  </div>
                </div>
              );
            }

            const values = items.map(s => s[panel.key] ?? 0);
            const maxVal = Math.max(...values);
            const minVal = Math.min(...values);
            const range = maxVal - minVal || 1;

            return (
              <div key={panel.id} style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8',
                borderRadius: 8, padding: 16,
              }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: panel.color, marginBottom: 2 }}>
                  {panel.title}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#6B6B6B', marginBottom: 12 }}>
                  {panel.sub}
                </div>
                {items.map(s => {
                  const v = s[panel.key] ?? 0;
                  const pct = panel.inverted
                    ? ((maxVal - v) / range) * 100
                    : ((v - minVal) / range) * 100;
                  return (
                    <div key={s.unitid || s.school_name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ fontSize: '0.6875rem', color: '#6B6B6B', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(s.school_name || '').slice(0, 18)}
                      </div>
                      <div style={{ flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, backgroundColor: panel.color, width: Math.max(pct, 5) + '%', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: panel.color, width: 55, textAlign: 'right', flexShrink: 0 }}>
                        {panel.fmt(v)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
