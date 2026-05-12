import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import ScenarioGallery from '../components/cmg/ScenarioGallery.jsx';
import MessageBuilder from '../components/cmg/MessageBuilder.jsx';
import MessageHistory from '../components/cmg/MessageHistory.jsx';
import { CMG_SCENARIOS } from '../data/cmgScenarios.ts';

/**
 * CoachMessageGeneratorPage — the sixth Student View page (/coach-messages).
 *
 * State shape (Sprint 025 Phase 4 scaffold; Phase 5-8 fill in the gaps):
 *   activeScenarioId    | 1..11 | null
 *   profile             | row from public.profiles
 *   shortlist           | rows from public.short_list_items + schools join
 *   selectedSchool      | { unitid, school_name, ... } | { other: true }
 *   channel             | "email" | "twitter"
 *   activeRecipient     | "position_coach" | "recruiting_area_coach"
 *   form                | per-scenario shared fields
 *   formByRecipient     | per-recipient last_name + closing question state
 *   historyRows         | from profiles.cmg_message_log
 *
 * Data fetching follows the pattern in ProfilePage.jsx:90 and
 * ShortlistPage.jsx:417 — single supabase.from('profiles').select on mount,
 * Promise.all for parallel reads where useful.
 */
export default function CoachMessageGeneratorPage() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [channel, setChannel] = useState('email');
  const [activeRecipient, setActiveRecipient] = useState('position_coach');
  const [form, setForm] = useState({});
  const [formByRecipient, setFormByRecipient] = useState({
    position_coach: {},
    recruiting_area_coach: {},
  });
  const [logRows, setLogRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [profileRes, shortlistRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'name, grad_year, position, high_school, state, gpa, hudl_url, twitter, height, weight, email, cmg_message_log',
          )
          .eq('user_id', userId)
          .single(),
        // short_list_items denormalizes school_name + div onto each row, so we
        // read directly from it instead of trying to embed schools(...) —
        // PostgREST embedded selects require a declared FK between
        // short_list_items.unitid and schools.unitid, and that constraint does
        // not exist in this schema. The Phase1Channel option label only needs
        // unitid + school_name (type is rendered with a `s.type ? ...` guard,
        // so leaving it undefined is safe).
        supabase
          .from('short_list_items')
          .select('unitid, school_name, div')
          .eq('user_id', userId),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data ?? null);
      // Mirror the persisted log into local state so Phase 7 Copy / Email
      // events can append optimistically without a refetch.
      setLogRows(profileRes.data?.cmg_message_log ?? []);
      // Normalize shortlist into the flat shape Phase1Channel expects:
      // { unitid, school_name, div, type? }. Drops any row missing unitid or
      // school_name as a defensive guard.
      const flatShortlist = (shortlistRes.data ?? []).filter(
        row => row && row.unitid != null && row.school_name,
      );
      setShortlist(flatShortlist);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const scenarioObj = useMemo(
    () => (activeScenarioId ? CMG_SCENARIOS.find(s => s.id === activeScenarioId) ?? null : null),
    [activeScenarioId],
  );

  const handleScenarioSelect = scenario => {
    setActiveScenarioId(scenario.id);
    // Scroll into builder on selection (mirrors prototype behavior).
    requestAnimationFrame(() => {
      document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleLogAppend = useCallback((record) => {
    setLogRows(prev => [...prev, record]);
  }, []);

  // Reset clears form + per-recipient form state. Per Phase 7 spec, the
  // scenario stays selected and channel + school + active recipient tab
  // persist so the student doesn't lose their context after a send.
  const handleReset = useCallback(() => {
    setForm({});
    setFormByRecipient({
      position_coach: {},
      recruiting_area_coach: {},
    });
  }, []);

  return (
    <div className="cmg-page" data-testid="cmg-page">
      <header className="cmg-page-header">
        <h1 className="cmg-page-title">Coach Messages</h1>
        <p className="cmg-page-intro">
          Pick a scenario, fill in the gaps, and send your recruiting coach a clean, well-formatted message.
        </p>
      </header>

      {loading ? (
        <p className="cmg-page-loading">Loading your profile and shortlist…</p>
      ) : (
        <>
          <ScenarioGallery activeScenarioId={activeScenarioId} onSelect={handleScenarioSelect} />
          {scenarioObj && (
            <MessageBuilder
              scenario={scenarioObj}
              profile={profile}
              shortlist={shortlist}
              channel={channel}
              onChannelChange={setChannel}
              selectedSchool={selectedSchool}
              onSchoolChange={setSelectedSchool}
              form={form}
              onFormChange={setForm}
              activeRecipient={activeRecipient}
              onActiveRecipientChange={setActiveRecipient}
              formByRecipient={formByRecipient}
              onRecipientFormChange={setFormByRecipient}
              userId={userId}
              onLogAppend={handleLogAppend}
              onReset={handleReset}
            />
          )}
          <MessageHistory log={logRows} />
        </>
      )}
    </div>
  );
}
