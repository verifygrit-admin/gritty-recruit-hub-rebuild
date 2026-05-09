/**
 * PlayerCard — student-athlete card for coach/counselor dashboard.
 * Light theme adaptation from hs-fbcoach-dash.
 */
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import HudlLogo from './HudlLogo.jsx';

export default function PlayerCard({ player, onCardClick }) {
  const [imgError, setImgError] = useState(false);
  const progressPct = Math.round((player.recruitingProgress || 0) * 100);

  return (
    <div
      onClick={() => onCardClick?.(player.id)}
      style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 10,
        padding: 16, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,58,58,0.12)'; e.currentTarget.style.borderColor = 'var(--brand-maroon)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#E8E8E8'; }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'var(--brand-maroon)' }} />

      {/* Zero-match badge */}
      {player.isZeroMatch && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: 'var(--brand-gold)', color: '#2C2C2C', fontSize: '0.625rem',
          textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px',
          borderRadius: 12, fontWeight: 600, zIndex: 1,
        }}>
          No GRIT FIT Matches
        </span>
      )}

      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', backgroundColor: '#F5EFE0',
          border: '2px solid #E8E8E8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-maroon)', flexShrink: 0, overflow: 'hidden',
        }}>
          {(() => {
            // Fallback chain: Storage photo > Hudl logo > initial letter
            if (player.avatarStoragePath && !imgError) {
              const { data } = supabase.storage.from('avatars').getPublicUrl(player.avatarStoragePath);
              const url = data?.publicUrl;
              if (url) {
                return (
                  <img
                    src={url}
                    alt={player.name}
                    onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                );
              }
            }
            if (player.hudlUrl) {
              return <HudlLogo size={28} withBg={true} />;
            }
            return player.name?.charAt(0).toUpperCase() || '?';
          })()}
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2C2C2C', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
            {player.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6B6B6B', marginTop: 2 }}>
            {player.position} &bull; Class {player.classYear}
          </div>
          {player.email && (
            <div style={{ fontSize: '0.68rem', color: '#6B6B6B' }}>{player.email}</div>
          )}
          {/* Offer badges */}
          {(player.hasVerbalOffer || player.hasWrittenOffer) && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {player.hasVerbalOffer && (
                <span style={{
                  background: 'var(--brand-gold)', color: '#2C2C2C', fontSize: '0.75rem',
                  fontWeight: 600, padding: '4px 10px', borderRadius: 12,
                }}>
                  Verbal Offer
                </span>
              )}
              {player.hasWrittenOffer && (
                <span style={{
                  background: 'var(--brand-maroon)', color: '#FFFFFF', fontSize: '0.75rem',
                  fontWeight: 600, padding: '4px 10px', borderRadius: 12,
                }}>
                  Written Offer
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-maroon)' }}>
            {player.gpa?.toFixed(2) || '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6B6B6B' }}>GPA</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-gold)' }}>
            {player.shortlistCount ?? 0}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6B6B6B' }}>Schools</div>
        </div>
        {player.athleticFit != null && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4CAF50' }}>
              {Math.round(player.athleticFit * 100)}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#6B6B6B' }}>Athletic Fit</div>
          </div>
        )}
      </div>

      {/* Recruiting progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.7rem', color: '#6B6B6B' }}>Recruiting Progress</span>
          <strong style={{ fontSize: '0.7rem', color: 'var(--brand-maroon)', fontWeight: 700 }}>{progressPct}%</strong>
        </div>
        <div style={{ height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--brand-maroon)', borderRadius: 3, width: `${progressPct}%`, transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* Documents count */}
      {player.documentsUploaded != null && (
        <div style={{ fontSize: '0.7rem', color: '#6B6B6B', marginBottom: 8 }}>
          {player.documentsUploaded} document{player.documentsUploaded !== 1 ? 's' : ''} uploaded
        </div>
      )}

      {/* CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 12, padding: 8, backgroundColor: '#F5EFE0', borderRadius: 8,
        fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-maroon)',
      }}>
        View Full Profile &rarr;
      </div>
    </div>
  );
}
