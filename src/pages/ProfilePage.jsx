import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSchoolIdentity } from '../hooks/useSchoolIdentity.js';
import { supabase } from '../lib/supabaseClient.js';
import { SCHOOL_STAFF, findStaffByUserId } from '../data/school-staff.js';
import HudlLogo from '../components/HudlLogo.jsx';
import PasswordResetModal from '../components/PasswordResetModal.jsx';

const POSITIONS = [
  '', 'QB', 'RB', 'FB', 'TE', 'WR', 'OL', 'C', 'G', 'T',
  'DL', 'DE', 'DT', 'EDGE', 'LB', 'CB', 'S',
];

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = ['', ...Array.from({ length: 5 }, (_, i) => String(currentYear + 1 + i))];

const sectionStyle = { marginBottom: 32 };
const headingStyle = { fontSize: '1.5rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px 0', lineHeight: 1.4 };
const labelStyle = { display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4 };
const helpStyle = { fontSize: '0.875rem', color: '#6B6B6B', marginTop: 4 };
const inputBase = {
  width: '100%', padding: '12px 16px', border: '1px solid #D4D4D4', borderRadius: 4,
  fontSize: '1rem', color: '#2C2C2C', lineHeight: 1.5, backgroundColor: '#FFFFFF',
  boxSizing: 'border-box', outline: 'none',
};
const errorMsgStyle = { fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block' };
const fieldWrap = { marginBottom: 16 };
const rowStyle = { display: 'flex', gap: 16, flexWrap: 'wrap' };
const halfCol = { flex: '1 1 45%', minWidth: 200 };
const thirdCol = { flex: '1 1 30%', minWidth: 150 };

export default function ProfilePage() {
  const navigate = useNavigate();
  const { session, userType, notifyProfileUpdate } = useAuth();

  // Sprint 023 §8 test #9 — staff role guard. Boolean computed here so it
  // can be referenced once all hooks have run; the `<Navigate>` early-return
  // is placed below the hook block (single-render redirect, no extra effect).
  const isStaffUser = userType === 'hs_coach' || userType === 'hs_guidance_counselor';

  // Sprint 017 D5/3d — school-conditional staff lookup. schoolSlug is null for
  // anon or unresolvable users; staff is null for any school not yet onboarded
  // (renders coach/counselor sections hidden in that case — graceful degrade).
  const { schoolSlug } = useSchoolIdentity();
  const staff = schoolSlug ? SCHOOL_STAFF[schoolSlug] : null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', high_school: '', grad_year: '', state: '', email: '',
    phone: '', twitter: '', hudl_url: '', position: '', height: '', weight: '',
    speed_40: '', gpa: '', sat: '', agi: '', dependents: '',
    expected_starter: false, captain: false, all_conference: false, all_state: false,
    parent_guardian_email: '', hs_lat: null, hs_lng: null,
  });

  // Autocomplete state
  const [hsQuery, setHsQuery] = useState('');
  const [hsResults, setHsResults] = useState([]);
  const [hsSelected, setHsSelected] = useState(false);

  // Track avatar state
  const [avatarStoragePath, setAvatarStoragePath] = useState(null);
  const prevHudlUrl = useRef(null);

  // Coach/Counselor confirmation state
  const [selectedHsProgramId, setSelectedHsProgramId] = useState(null);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [coachConfirmed, setCoachConfirmed] = useState(false);
  const [coachConfirming, setCoachConfirming] = useState(false);
  const [coachError, setCoachError] = useState(null);
  const [confirmedCoachName, setConfirmedCoachName] = useState('');
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [counselorConfirmed, setCounselorConfirmed] = useState(false);
  const [counselorConfirming, setCounselorConfirming] = useState(false);
  const [counselorError, setCounselorError] = useState(null);
  const [confirmedCounselorName, setConfirmedCounselorName] = useState('');

  // Load existing profile + existing coach/counselor links
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    const loadProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
      if (data) {
        setAvatarStoragePath(data.avatar_storage_path || null);
        prevHudlUrl.current = data.hudl_url || null;
        setForm(prev => ({
          ...prev,
          name: data.name || '',
          high_school: data.high_school || '',
          grad_year: data.grad_year ? String(data.grad_year) : '',
          state: data.state || '',
          email: data.email || session.user.email || '',
          phone: data.phone || '',
          twitter: data.twitter || '',
          hudl_url: data.hudl_url || '',
          position: data.position || '',
          height: data.height || '',
          weight: data.weight ? String(data.weight) : '',
          speed_40: data.speed_40 ? String(data.speed_40) : '',
          gpa: data.gpa ? String(data.gpa) : '',
          sat: data.sat ? String(data.sat) : '',
          agi: data.agi ? String(data.agi) : '',
          dependents: data.dependents != null ? String(data.dependents) : '',
          expected_starter: data.expected_starter || false,
          captain: data.captain || false,
          all_conference: data.all_conference || false,
          all_state: data.all_state || false,
          parent_guardian_email: data.parent_guardian_email || '',
          hs_lat: data.hs_lat, hs_lng: data.hs_lng,
        }));
        setHsQuery(data.high_school || '');
        if (data.high_school) {
          setHsSelected(true);
          // Look up hs_program_id for this school name
          const { data: programs } = await supabase
            .from('hs_programs').select('id').eq('school_name', data.high_school).limit(1);
          if (programs && programs.length > 0) setSelectedHsProgramId(programs[0].id);
        }
      } else {
        setForm(prev => ({ ...prev, email: session.user.email || '' }));
      }

      // Check for existing coach confirmation. Resolves staff name via
      // SCHOOL_STAFF reverse lookup (findStaffByUserId) — works regardless of
      // useSchoolIdentity's async resolution timing in the same render pass.
      const { data: existingCoachLinks } = await supabase
        .from('hs_coach_students').select('coach_user_id')
        .eq('student_user_id', session.user.id);
      if (existingCoachLinks && existingCoachLinks.length > 0) {
        setCoachConfirmed(true);
        const linkedCoach = findStaffByUserId(existingCoachLinks[0].coach_user_id);
        setConfirmedCoachName(linkedCoach?.name || 'Your head coach');
        // Check for existing counselor confirmation
        const { data: existingCounselorLinks } = await supabase
          .from('hs_counselor_students').select('counselor_user_id')
          .eq('student_user_id', session.user.id);
        if (existingCounselorLinks && existingCounselorLinks.length > 0) {
          setCounselorConfirmed(true);
          const linkedCounselor = findStaffByUserId(existingCounselorLinks[0].counselor_user_id);
          setConfirmedCounselorName(linkedCounselor?.name || 'Your counselor');
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, [session]);

  // HS autocomplete with 300ms debounce
  useEffect(() => {
    if (hsSelected || hsQuery.length < 2) { setHsResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('hs_programs')
        .select('id, school_name, city, state')
        .ilike('school_name', `%${hsQuery}%`)
        .limit(10);
      setHsResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [hsQuery, hsSelected]);

  // Coach/counselor display data resolved from src/data/school-staff.js via
  // SCHOOL_STAFF[schoolSlug] (see Sprint 017 retro / C-9 carry-forward).

  const handleHsSelect = (school) => {
    setForm(prev => ({ ...prev, high_school: school.school_name, hs_lat: null, hs_lng: null }));
    setHsQuery(school.school_name);
    setHsSelected(true);
    setHsResults([]);
    setSelectedHsProgramId(school.id);
    setCoachConfirmed(false); setCounselorConfirmed(false);
    setSelectedCoachId(''); setSelectedCounselorId('');
    setCoachError(null); setCounselorError(null);
  };

  const handleConfirmCoach = async () => {
    if (!session || !staff?.head_coach) return;
    setCoachConfirming(true); setCoachError(null);
    const { error } = await supabase.from('hs_coach_students').insert({
      coach_user_id: staff.head_coach.user_id,
      student_user_id: session.user.id,
    });
    if (error) {
      if (error.code === '23505') {
        setCoachConfirmed(true);
        setConfirmedCoachName(staff.head_coach.name);
      } else { setCoachError('Failed to confirm coach. Please try again.'); }
    } else {
      setCoachConfirmed(true);
      setConfirmedCoachName(staff.head_coach.name);
    }
    setCoachConfirming(false);
  };

  const handleConfirmCounselor = async () => {
    if (!selectedCounselorId || !session) return;
    setCounselorConfirming(true); setCounselorError(null);
    const { error } = await supabase.from('hs_counselor_students').insert({
      counselor_user_id: selectedCounselorId, student_user_id: session.user.id,
    });
    if (error) {
      if (error.code === '23505') {
        setCounselorConfirmed(true);
        setConfirmedCounselorName(staff?.counselors?.find(c => c.user_id === selectedCounselorId)?.name || 'Your counselor');
      } else { setCounselorError('Failed to confirm counselor. Please try again.'); }
    } else {
      setCounselorConfirmed(true);
      setConfirmedCounselorName(staff?.counselors?.find(c => c.user_id === selectedCounselorId)?.name || 'Your counselor');
    }
    setCounselorConfirming(false);
  };

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.high_school.trim() || !hsSelected) e.high_school = 'Select a high school from the list';
    if (form.gpa && (parseFloat(form.gpa) < 0 || parseFloat(form.gpa) > 4.0)) e.gpa = 'GPA must be 4.0 or lower';
    if (form.sat && (parseInt(form.sat) < 400 || parseInt(form.sat) > 1600)) e.sat = 'SAT must be between 400-1600';
    if (form.weight && (parseInt(form.weight) < 50 || parseInt(form.weight) > 400)) e.weight = 'Weight must be between 50-400 lbs';
    if (form.speed_40 && (parseFloat(form.speed_40) < 4.0 || parseFloat(form.speed_40) > 7.0)) e.speed_40 = 'Time must be between 4.0-7.0 seconds';
    if (form.agi && parseFloat(form.agi) < 0) e.agi = 'AGI must be a positive number';
    if (form.dependents && (parseInt(form.dependents) < 0 || parseInt(form.dependents) > 10)) e.dependents = 'Dependents must be 0-10';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    const payload = {
      user_id: session.user.id,
      name: form.name.trim(),
      high_school: form.high_school,
      grad_year: form.grad_year ? parseInt(form.grad_year) : null,
      state: form.state || null,
      email: form.email,
      phone: form.phone || null,
      twitter: form.twitter || null,
      hudl_url: form.hudl_url || null,
      position: form.position || null,
      height: form.height || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      speed_40: form.speed_40 ? parseFloat(form.speed_40) : null,
      gpa: form.gpa ? parseFloat(form.gpa) : null,
      sat: form.sat ? parseInt(form.sat) : null,
      hs_lat: form.hs_lat, hs_lng: form.hs_lng,
      agi: form.agi ? parseFloat(form.agi) : null,
      dependents: form.dependents ? parseInt(form.dependents) : null,
      expected_starter: form.expected_starter,
      captain: form.captain,
      all_conference: form.all_conference,
      all_state: form.all_state,
      parent_guardian_email: form.parent_guardian_email || null,
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);

    if (error) {
      setToast({ type: 'error', msg: 'Failed to save profile. Please try again.' });
    } else {
      notifyProfileUpdate();
      setToast({ type: 'success', msg: 'Profile saved — updating your GRIT FIT results...' });

      // Fire-and-forget avatar fetch when hudl_url is set and changed (or first set)
      const newHudlUrl = form.hudl_url?.trim() || null;
      if (newHudlUrl && newHudlUrl !== prevHudlUrl.current) {
        prevHudlUrl.current = newHudlUrl;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        // Use anon key + user JWT — Edge Function will call service role internally
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token;
        fetch(`${supabaseUrl}/functions/v1/fetch-hudl-avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ user_id: session.user.id, hudl_url: newHudlUrl }),
        }).catch(() => {
          // Fire-and-forget — silently ignore network failures
        });
      }

      setTimeout(() => navigate('/gritfit'), 1000);
    }
  };

  // Staff role guard — return null while the useEffect-driven redirect fires.
  if (isStaffUser) return null;

  // Staff redirect lives AFTER all hooks have been called (rules-of-hooks
  // safe) and BEFORE the loading branch so staff users don't briefly see the
  // student loading copy on their way to /coach/profile. (Spec §8 test #9.)
  if (isStaffUser) return <Navigate to="/coach/profile" replace />;
  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>Loading profile...</div>;

  const renderInput = (field, label, testId, opts = {}) => (
    <div style={fieldWrap} data-testid={`form-field-${field}`}>
      <label data-testid={`label-${field}`} htmlFor={field} style={labelStyle}>
        {label} {opts.required && <span style={{ color: '#F44336' }}>*</span>}
      </label>
      <input
        id={field}
        type={opts.type || 'text'}
        data-testid={testId}
        placeholder={opts.placeholder || ''}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        disabled={opts.disabled}
        aria-required={opts.required || false}
        style={{
          ...inputBase,
          ...(errors[field] ? { border: '2px solid #F44336', backgroundColor: '#FFF5F5' } : {}),
          ...(opts.disabled ? { backgroundColor: '#F5F5F5', border: '1px solid #E8E8E8', color: '#6B6B6B', cursor: 'not-allowed' } : {}),
        }}
      />
      {opts.help && <span style={helpStyle}>{opts.help}</span>}
      {errors[field] && <span data-testid={`error-${field}`} style={errorMsgStyle} aria-live="polite">{errors[field]}</span>}
    </div>
  );

  const renderSelect = (field, label, testId, options, opts = {}) => (
    <div style={fieldWrap} data-testid={`form-field-${field}`}>
      <label data-testid={`label-${field}`} htmlFor={field} style={labelStyle}>{label}</label>
      <select
        id={field}
        data-testid={testId}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        style={{ ...inputBase, cursor: 'pointer' }}
      >
        {options.map(o => <option key={o} value={o}>{o || `Select ${label.toLowerCase()}`}</option>)}
      </select>
      {opts.help && <span style={helpStyle}>{opts.help}</span>}
    </div>
  );

  const renderCheckbox = (field, label, testId) => (
    <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        id={field}
        type="checkbox"
        data-testid={testId}
        checked={form[field]}
        onChange={(e) => set(field, e.target.checked)}
        style={{ width: 20, height: 20, accentColor: 'var(--brand-maroon)', cursor: 'pointer' }}
      />
      <label htmlFor={field} style={{ fontSize: '1rem', color: '#2C2C2C', cursor: 'pointer' }}>{label}</label>
    </div>
  );

  // Derive avatar URL for display on the profile page
  const profileAvatarUrl = (() => {
    if (!avatarStoragePath) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarStoragePath);
    return data?.publicUrl || null;
  })();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {/* Profile avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid #E8E8E8', backgroundColor: '#F5EFE0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {profileAvatarUrl ? (
            <img
              src={profileAvatarUrl}
              alt={form.name || 'Profile photo'}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : form.hudl_url ? (
            <HudlLogo size={48} withBg={true} />
          ) : (
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-maroon)' }}>
              {form.name ? form.name.charAt(0).toUpperCase() : '?'}
            </span>
          )}
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#2C2C2C', margin: 0 }}>Edit Your Profile</h2>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '8px 16px', borderRadius: 4, marginBottom: 16, fontSize: '0.875rem', color: '#FFFFFF',
          backgroundColor: toast.type === 'success' ? '#4CAF50' : '#F44336',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{toast.msg}</span>
          {toast.type === 'error' && (
            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>Dismiss</button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Personal Info */}
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Personal Info</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />

          {renderInput('name', 'Full Name', 'input-name', { required: true, placeholder: 'John Smith' })}

          {/* HS Autocomplete */}
          <div style={fieldWrap} data-testid="form-field-high_school">
            <label data-testid="label-high_school" htmlFor="high_school" style={labelStyle}>
              High School <span style={{ color: '#F44336' }}>*</span>
            </label>
            <input
              id="high_school"
              type="text"
              data-testid="input-high-school-autocomplete"
              placeholder="Start typing... (e.g., 'Boston College High')"
              value={hsQuery}
              onChange={(e) => { setHsQuery(e.target.value); setHsSelected(false); set('high_school', ''); setSelectedHsProgramId(null); }}
              aria-required={true}
              style={{
                ...inputBase,
                ...(errors.high_school ? { border: '2px solid #F44336', backgroundColor: '#FFF5F5' } : {}),
              }}
            />
            {hsResults.length > 0 && (
              <div style={{
                border: '1px solid #E8E8E8', borderRadius: 4, backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', marginTop: 4,
              }}>
                {hsResults.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleHsSelect(s)}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: '0.875rem', color: '#2C2C2C',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F5EFE0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                  >
                    {s.school_name}, {s.city}, {s.state}
                  </div>
                ))}
              </div>
            )}
            <span style={helpStyle}>(Required — allows coaches to find you)</span>
            {errors.high_school && <span data-testid="error-high_school" style={errorMsgStyle} aria-live="polite">{errors.high_school}</span>}
          </div>

          <div style={rowStyle}>
            <div style={halfCol}>{renderSelect('grad_year', 'Graduation Year', 'select-grad-year', GRAD_YEARS)}</div>
            <div style={halfCol}>{renderSelect('state', 'State', 'select-state', US_STATES)}</div>
          </div>

          {renderInput('email', 'Email', 'input-email-readonly', { disabled: true, help: '(From your account — cannot edit here)' })}

          {/* Sprint 023 §1 Goal 1 — Password row opens shared PasswordResetModal. */}
          <div style={fieldWrap} data-testid="form-field-password">
            <label style={labelStyle}>Password</label>
            <button
              type="button"
              data-testid="button-open-password-reset"
              onClick={() => setShowPasswordModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FFFFFF',
                color: 'var(--brand-maroon)',
                border: '1px solid var(--brand-maroon)',
                borderRadius: 4,
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              Change Password
            </button>
            <span style={helpStyle}>(Opens a secure dialog to update your account password)</span>
          </div>

          <div style={rowStyle}>
            <div style={halfCol}>{renderInput('phone', 'Phone', 'input-phone', { placeholder: '(123) 456-7890' })}</div>
            <div style={halfCol}>{renderInput('twitter', 'Twitter/X Handle (Optional)', 'input-twitter', { placeholder: '@your_handle', help: '(Optional — helps coaches find you online)' })}</div>
          </div>

          {renderInput('hudl_url', 'Hudl Profile URL', 'input-hudl-url', { placeholder: 'https://www.hudl.com/profile/...', help: '(Optional — share your highlight film with coaches)' })}
        </section>

        {/* Section: Confirm Your Head Coach — school-conditional via SCHOOL_STAFF.
            Hides if school is unresolved or not in SCHOOL_STAFF (graceful degrade). */}
        {selectedHsProgramId && staff?.head_coach && (
          <section style={sectionStyle} data-testid="section-coach-confirm">
            <h3 style={headingStyle}>Confirm Your Head Coach</h3>
            <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
            {coachConfirmed ? (
              <div data-testid="coach-confirmed-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', backgroundColor: '#E8F5E9', color: '#2E7D32',
                borderRadius: 4, fontSize: '0.875rem', fontWeight: 600,
              }}>
                Confirmed: {confirmedCoachName}
              </div>
            ) : (
              <div>
                <div style={{ ...fieldWrap, padding: '12px 16px', backgroundColor: '#F9F9F9', border: '1px solid #E8E8E8', borderRadius: 4 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>{staff.head_coach.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B6B6B', marginTop: 2 }}>{staff.head_coach.title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B6B6B', marginTop: 2 }}>{staff.head_coach.email}</div>
                </div>
                <span style={{ ...helpStyle, display: 'block', marginBottom: 12 }}>
                  Confirming your coach grants them access to view your profile and recruiting activity.
                </span>
                <button type="button" data-testid="button-confirm-coach" disabled={coachConfirming}
                  onClick={handleConfirmCoach} style={{
                    padding: '10px 24px', backgroundColor: coachConfirming ? '#E8E8E8' : '#4CAF50',
                    color: coachConfirming ? '#6B6B6B' : '#FFFFFF',
                    border: 'none', borderRadius: 4, fontSize: '0.95rem', fontWeight: 600,
                    cursor: coachConfirming ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)', minHeight: 40,
                  }}>
                  {coachConfirming ? 'Confirming...' : 'Confirm Coach'}
                </button>
                {coachError && <span style={{ ...errorMsgStyle, display: 'block', marginTop: 8 }} data-testid="coach-error">{coachError}</span>}
              </div>
            )}
          </section>
        )}

        {/* Section: Confirm Your Guidance Counselor — school-conditional via
            SCHOOL_STAFF, radio buttons. Hides if no counselors are configured
            for the resolved school. */}
        {coachConfirmed && selectedHsProgramId && (staff?.counselors?.length ?? 0) > 0 && (
          <section style={sectionStyle} data-testid="section-counselor-confirm">
            <h3 style={headingStyle}>Confirm Your Guidance Counselor</h3>
            <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
            {counselorConfirmed ? (
              <div data-testid="counselor-confirmed-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', backgroundColor: '#E8F5E9', color: '#2E7D32',
                borderRadius: 4, fontSize: '0.875rem', fontWeight: 600,
              }}>
                Confirmed: {confirmedCounselorName}
              </div>
            ) : (
              <div>
                <div style={{ ...fieldWrap }}>
                  {staff.counselors.map(c => (
                    <label key={c.user_id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      marginBottom: 8, border: `1px solid ${selectedCounselorId === c.user_id ? '#4CAF50' : '#E8E8E8'}`,
                      borderRadius: 4, cursor: 'pointer', backgroundColor: selectedCounselorId === c.user_id ? '#F1FAF2' : '#FAFAFA',
                    }}>
                      <input
                        type="radio"
                        name="counselor"
                        value={c.user_id}
                        checked={selectedCounselorId === c.user_id}
                        onChange={() => setSelectedCounselorId(c.user_id)}
                        style={{ accentColor: '#4CAF50', width: 18, height: 18 }}
                      />
                      <span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2C2C2C' }}>{c.name}</span>
                        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', marginLeft: 8 }}>{c.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <span style={{ ...helpStyle, display: 'block', marginBottom: 12 }}>
                  Confirming your counselor grants them access to view your profile, recruiting activity, and financial aid documents.
                </span>
                <button type="button" data-testid="button-confirm-counselor" disabled={!selectedCounselorId || counselorConfirming}
                  onClick={handleConfirmCounselor} style={{
                    padding: '10px 24px', backgroundColor: (!selectedCounselorId || counselorConfirming) ? '#E8E8E8' : '#4CAF50',
                    color: (!selectedCounselorId || counselorConfirming) ? '#6B6B6B' : '#FFFFFF',
                    border: 'none', borderRadius: 4, fontSize: '0.95rem', fontWeight: 600,
                    cursor: (!selectedCounselorId || counselorConfirming) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)', minHeight: 40,
                  }}>
                  {counselorConfirming ? 'Confirming...' : 'Confirm Counselor'}
                </button>
                {counselorError && <span style={{ ...errorMsgStyle, display: 'block', marginTop: 8 }} data-testid="counselor-error">{counselorError}</span>}
              </div>
            )}
          </section>
        )}

        {/* Section 2: Academic */}
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Academic</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
          <div style={rowStyle}>
            <div style={halfCol}>{renderInput('gpa', 'High School GPA', 'input-gpa', { type: 'number', placeholder: '3.75', help: '(Unweighted preferred)' })}</div>
            <div style={halfCol}>{renderInput('sat', 'SAT Score (Total)', 'input-sat', { type: 'number', placeholder: '1450', help: '(New SAT out of 1600)' })}</div>
          </div>
        </section>

        {/* Section 3: Athletic */}
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Athletic</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
          {renderSelect('position', 'Football Position', 'select-position', POSITIONS)}
          <div style={rowStyle}>
            <div style={thirdCol}>{renderInput('height', 'Height', 'input-height', { placeholder: '5\'10"' })}</div>
            <div style={thirdCol}>{renderInput('weight', 'Weight (lbs)', 'input-weight', { type: 'number', placeholder: '190', help: '(Pounds)' })}</div>
            <div style={thirdCol}>{renderInput('speed_40', (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                40-Yard Dash (seconds)
                <span
                  title="Your 40 time directly affects your athletic fit score. Missing or slow 40 time lowers your matches."
                  style={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#FFFFFF',
                    backgroundColor: '#FF9800', borderRadius: 3,
                    padding: '1px 5px', letterSpacing: '0.02em', cursor: 'help',
                  }}
                >
                  AFFECTS SCORE
                </span>
              </span>
            ), 'input-speed-40', { type: 'number', placeholder: '4.65', help: '(Best time in seconds — missing 40 time scores as worst-case)' })}</div>
          </div>
          {renderCheckbox('expected_starter', 'Expect to start next year?', 'checkbox-expected-starter')}
          {renderCheckbox('captain', 'Team captain in high school?', 'checkbox-captain')}
          {renderCheckbox('all_conference', 'All-conference selection?', 'checkbox-all-conference')}
          {renderCheckbox('all_state', 'All-state selection?', 'checkbox-all-state')}
        </section>

        {/* Section 4: Financial */}
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Financial</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
          <div role="region" aria-label="Financial privacy notice" style={{
            backgroundColor: '#FFF8DC', borderLeft: '3px solid #FF9800', padding: '12px 16px',
            marginBottom: 16, fontSize: '0.875rem', color: '#6B6B6B', lineHeight: 1.5,
          }}>
            Financial Information is Private — Your AGI and family financial details are encrypted and only visible to you. College coaches cannot see this information — it powers our financial fit analysis only.
          </div>
          {renderInput('agi', 'Adjusted Gross Income (AGI) — Last Fiscal Year', 'input-agi', { type: 'number', placeholder: '75000', help: '(From parents\' or guardians\' most recent tax return. Used only for financial fit calculation.)' })}
          <div style={rowStyle}>
            <div style={halfCol}>{renderInput('dependents', 'Number of Dependents', 'input-dependents', { type: 'number', placeholder: '2', help: '(Including yourself)' })}</div>
          </div>
        </section>

        {/* Section 5: Parent/Guardian */}
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Parent/Guardian</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />
          {renderInput('parent_guardian_email', 'Parent/Guardian Email', 'input-parent-guardian-email', { type: 'email', placeholder: 'parent@email.com', help: '(Colleges may contact your parent/guardian directly)' })}
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="button-cancel"
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: 'none', color: 'var(--brand-maroon)', fontSize: '1rem', cursor: 'pointer', padding: '12px 16px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="button-save-profile"
            disabled={saving}
            aria-busy={saving}
            style={{
              padding: '12px 32px', backgroundColor: saving ? '#E8E8E8' : 'var(--brand-maroon)',
              color: saving ? '#6B6B6B' : '#FFFFFF', border: 'none', borderRadius: 4,
              fontSize: '1rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)', minHeight: 44,
            }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        email={form.email || session?.user?.email || ''}
      />
    </div>
  );
}
