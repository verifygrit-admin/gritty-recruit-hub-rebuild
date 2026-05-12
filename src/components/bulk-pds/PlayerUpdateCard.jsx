/**
 * PlayerUpdateCard — Sprint 026 Phase 1a (Coach UI), spec §6 G6.
 *
 * One card per added student. Layout:
 *   - 5 read-only identity fields: id snippet, profile picture (avatar),
 *     full name, email, grad year.
 *   - 8 write fields: height, weight, speed_40, time_5_10_5, time_l_drill,
 *     bench_press, squat, clean.
 *   - Per-card remove button.
 *
 * Avatar resolution: matches the `<AvatarBadge>` pattern in Layout.jsx — uses
 * `supabase.storage.from('avatars').getPublicUrl(storagePath)` when a path
 * exists, otherwise falls back to the first-letter circle.
 */

import { supabase } from '../../lib/supabaseClient.js';
import MeasurableField from './MeasurableField.jsx';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  paddingBottom: 12,
  borderBottom: '1px solid #E8E8E8',
};

const avatarWrap = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  overflow: 'hidden',
  backgroundColor: 'var(--brand-mobile-menu-bg, #6B6B6B)',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const avatarImg = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const avatarInitial = {
  color: '#FFFFFF',
  fontSize: '1.25rem',
  fontWeight: 700,
};

const headerTextWrap = { flex: 1, minWidth: 0 };
const nameStyle = {
  fontSize: '1.05rem',
  fontWeight: 600,
  color: '#2C2C2C',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const subtleStyle = {
  fontSize: '0.8rem',
  color: '#6B6B6B',
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const removeBtnStyle = {
  background: 'none',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  color: '#6B6B6B',
};

const fieldGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0 12px',
};

function getAvatarUrl(storagePath) {
  if (!storagePath) return null;
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export default function PlayerUpdateCard({ student, fields, errors, onFieldChange, onRemove }) {
  const studentId = student.user_id;
  const idSnippet = (studentId || '').slice(0, 8);
  const avatarUrl = getAvatarUrl(student.avatar_storage_path);
  const initial = (student.name || student.email || '?').charAt(0).toUpperCase();

  const handleChange = (name, value) => onFieldChange?.(studentId, name, value);

  const tid = (suffix) => `bulk-pds-coach-field-${suffix}-${studentId}`;

  return (
    <article
      style={cardStyle}
      data-testid={`bulk-pds-coach-card-${studentId}`}
      aria-label={`Player update card: ${student.name || student.email}`}
    >
      <header style={headerStyle}>
        <div style={avatarWrap} aria-hidden="true">
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={avatarImg} />
            : <span style={avatarInitial}>{initial}</span>
          }
        </div>
        <div style={headerTextWrap}>
          <p style={nameStyle}>{student.name || '(Unnamed)'}</p>
          <span style={subtleStyle}>{student.email || ''}</span>
          <span style={subtleStyle}>
            {student.grad_year ? `Class of ${student.grad_year}` : ''}
            {student.grad_year ? ' · ' : ''}
            ID {idSnippet}
          </span>
        </div>
        <button
          type="button"
          data-testid={`bulk-pds-coach-card-remove-${studentId}`}
          onClick={() => onRemove?.(studentId)}
          style={removeBtnStyle}
          aria-label={`Remove ${student.name || 'player'} from batch`}
        >
          Remove
        </button>
      </header>

      <div style={fieldGridStyle}>
        <MeasurableField
          name="height"
          label="Height"
          unit=""
          inputMode="text"
          value={fields.height}
          onChange={handleChange}
          error={errors?.height}
          testId={tid('height')}
          placeholder='e.g. 6-2'
        />
        <MeasurableField
          name="weight"
          label="Weight"
          unit="lbs"
          inputMode="decimal"
          value={fields.weight}
          onChange={handleChange}
          error={errors?.weight}
          testId={tid('weight')}
        />
        <MeasurableField
          name="speed_40"
          label="40-yd Dash"
          unit="s"
          inputMode="decimal"
          value={fields.speed_40}
          onChange={handleChange}
          error={errors?.speed_40}
          testId={tid('speed_40')}
        />
        <MeasurableField
          name="time_5_10_5"
          label="5-10-5 (Pro Agility)"
          unit="s"
          inputMode="decimal"
          value={fields.time_5_10_5}
          onChange={handleChange}
          error={errors?.time_5_10_5}
          testId={tid('time_5_10_5')}
        />
        <MeasurableField
          name="time_l_drill"
          label="L-Drill"
          unit="s"
          inputMode="decimal"
          value={fields.time_l_drill}
          onChange={handleChange}
          error={errors?.time_l_drill}
          testId={tid('time_l_drill')}
        />
        <MeasurableField
          name="bench_press"
          label="Bench Press"
          unit="lbs"
          inputMode="decimal"
          value={fields.bench_press}
          onChange={handleChange}
          error={errors?.bench_press}
          testId={tid('bench_press')}
        />
        <MeasurableField
          name="squat"
          label="Squat"
          unit="lbs"
          inputMode="decimal"
          value={fields.squat}
          onChange={handleChange}
          error={errors?.squat}
          testId={tid('squat')}
        />
        <MeasurableField
          name="clean"
          label="Clean"
          unit="lbs"
          inputMode="decimal"
          value={fields.clean}
          onChange={handleChange}
          error={errors?.clean}
          testId={tid('clean')}
        />
      </div>
    </article>
  );
}
