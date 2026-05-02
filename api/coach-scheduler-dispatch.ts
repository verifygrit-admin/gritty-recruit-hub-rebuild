// =============================================================================
// api/coach-scheduler-dispatch.ts
// Sprint 013 D1 — Coach Scheduler Dispatch
//
// Reads a visit_request intake row by id, generates a single ICS calendar
// invite, and emails it (via Resend) to the college coach + the high school
// head coach + selected players. Writes one row to visit_request_deliveries
// per recipient regardless of send outcome.
//
// Runtime: Node 22.x (function-level pin per OQ5 lock 2026-05-02). The other
// function in this directory (api/recruits-auth.ts) remains Edge — mixed
// runtime project is intentional. Resend SDK + ics package both target Node;
// the multi-step transactional flow is Node-shaped.
//
// Env vars (non-prefixed per OQ5 lock):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_ADDRESS
//
// Service role bypasses RLS — this function is the only legitimate writer to
// visit_request_deliveries (Hard Constraint 7).
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createEvent, type EventAttributes } from 'ics';

export const config = { runtime: 'nodejs' };

// OQ8 lock: full-window mapping. Times are in school's local timezone
// (America/New_York for BC High). Emitted as floating local time per
// the locked dependency list (no TZ library; ics package does not emit
// VTIMEZONE/TZID). DESCRIPTION includes a TZ disambiguation line for
// cross-TZ recipients.
const TIME_WINDOW_MAP: Record<string, { start: [number, number]; end: [number, number] }> = {
  morning:   { start: [8, 0],  end: [12, 0] },
  midday:    { start: [11, 0], end: [14, 0] },
  afternoon: { start: [13, 0], end: [17, 0] },
  evening:   { start: [17, 0], end: [20, 0] },
  flexible:  { start: [9, 0],  end: [17, 0] },
};

type RecipientRole = 'college_coach' | 'head_coach' | 'player';

type Recipient = {
  email: string;
  role: RecipientRole;
  name: string;
};

type ErrorRecord = {
  recipient: string;
  error_code: string;
  message: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = (req.body ?? {}) as { visit_request_id?: unknown };
  const visit_request_id = body.visit_request_id;
  if (typeof visit_request_id !== 'string' || visit_request_id.length === 0) {
    return res.status(400).json({ error: 'visit_request_id required' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !RESEND_FROM_ADDRESS) {
    console.error('coach-scheduler-dispatch: missing required env vars');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(RESEND_API_KEY);

  // --------------------------------------------------------------------------
  // 1. Read visit_request + coach_submission + partner_high_school
  // --------------------------------------------------------------------------
  const { data: visitRow, error: visitErr } = await supabase
    .from('visit_requests')
    .select(`
      id,
      requested_date,
      time_window,
      notes,
      coach_submission:coach_submissions!inner(name, email, program),
      school:partner_high_schools!inner(id, name, meeting_location, address, timezone)
    `)
    .eq('id', visit_request_id)
    .single();

  if (visitErr || !visitRow) {
    console.error('coach-scheduler-dispatch: visit_request not found', { visit_request_id, visitErr });
    return res.status(404).json({ error: 'visit_request not found' });
  }

  // PostgREST embeds may surface as object or array depending on JS SDK
  // typing inference. Normalize both shapes.
  const coachSubRaw = (visitRow as Record<string, unknown>).coach_submission;
  const schoolRaw = (visitRow as Record<string, unknown>).school;
  const coachSub = (Array.isArray(coachSubRaw) ? coachSubRaw[0] : coachSubRaw) as {
    name: string;
    email: string;
    program: string;
  };
  const school = (Array.isArray(schoolRaw) ? schoolRaw[0] : schoolRaw) as {
    id: string;
    name: string;
    meeting_location: string | null;
    address: string | null;
    timezone: string;
  };

  // --------------------------------------------------------------------------
  // 2. Read selected players (visit_request_players → profiles by user_id)
  // --------------------------------------------------------------------------
  const { data: playerLinkRows, error: playersErr } = await supabase
    .from('visit_request_players')
    .select('player_id')
    .eq('visit_request_id', visit_request_id);

  if (playersErr) {
    console.error('coach-scheduler-dispatch: visit_request_players read failed', playersErr);
    return res.status(500).json({ error: 'players read failed' });
  }

  const playerIds = (playerLinkRows ?? []).map(r => r.player_id as string);
  let players: Array<{ name: string; email: string }> = [];
  if (playerIds.length > 0) {
    const { data: profileRows, error: profilesErr } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', playerIds);
    if (profilesErr) {
      console.error('coach-scheduler-dispatch: profiles read failed', profilesErr);
      return res.status(500).json({ error: 'profiles read failed' });
    }
    players = (profileRows ?? []).map(p => ({
      name: p.name as string,
      email: p.email as string,
    }));
  }

  // --------------------------------------------------------------------------
  // 3. Resolve head coach via F-21 name-string join hop.
  //
  //    visit_requests.school_id → partner_high_schools.id (already loaded)
  //    F-21: partner_high_schools and hs_programs are NOT FK-linked. Two
  //    distinct tables both holding BC High at MVP, joined only by name
  //    string. A future schema reform (BL-S012-XX-naming-hygiene) collapses
  //    them; until then this two-step lookup is the principled path.
  //
  //    partner_high_schools.name → hs_programs.school_name → hs_programs.id
  //    → hs_coach_schools (is_head_coach=true, ORDER BY linked_at ASC LIMIT 1)
  //    → auth.users (raw_user_meta_data.display_name, email-local-part fallback)
  // --------------------------------------------------------------------------
  const { data: hsProgramRow, error: hsProgramErr } = await supabase
    .from('hs_programs')
    .select('id')
    .eq('school_name', school.name)
    .single();

  if (hsProgramErr || !hsProgramRow) {
    console.error('coach-scheduler-dispatch: hs_programs lookup failed', {
      school_name: school.name, hsProgramErr,
    });
    return res.status(500).json({ error: 'head coach routing failed' });
  }

  const { data: hsCoachRows, error: hsCoachErr } = await supabase
    .from('hs_coach_schools')
    .select('coach_user_id, linked_at')
    .eq('hs_program_id', hsProgramRow.id)
    .eq('is_head_coach', true)
    .order('linked_at', { ascending: true })
    .limit(1);

  if (hsCoachErr || !hsCoachRows || hsCoachRows.length === 0) {
    console.error('coach-scheduler-dispatch: head coach not found', {
      hs_program_id: hsProgramRow.id, hsCoachErr,
    });
    return res.status(500).json({ error: 'head coach not found' });
  }

  const headCoachUserId = hsCoachRows[0].coach_user_id as string;
  const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(headCoachUserId);
  if (userErr || !userRes?.user?.email) {
    console.error('coach-scheduler-dispatch: head coach auth user not found', {
      headCoachUserId, userErr,
    });
    return res.status(500).json({ error: 'head coach user lookup failed' });
  }
  const headCoachEmail = userRes.user.email;
  const headCoachMeta = (userRes.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayNameRaw = headCoachMeta.display_name;
  const headCoachDisplayName =
    typeof displayNameRaw === 'string' && displayNameRaw.length > 0
      ? displayNameRaw
      : headCoachEmail.split('@')[0];

  // --------------------------------------------------------------------------
  // 4. Build recipient list (D8 — one send per recipient, no bcc per OQ7)
  // --------------------------------------------------------------------------
  const recipients: Recipient[] = [
    { role: 'college_coach', name: coachSub.name, email: coachSub.email },
    { role: 'head_coach', name: headCoachDisplayName, email: headCoachEmail },
    ...players.map<Recipient>(p => ({ role: 'player', name: p.name, email: p.email })),
  ];

  // --------------------------------------------------------------------------
  // 5. Build ICS (D5 + OQ8 floating local time)
  // --------------------------------------------------------------------------
  const window = TIME_WINDOW_MAP[visitRow.time_window as string];
  if (!window) {
    console.error('coach-scheduler-dispatch: unknown time_window', visitRow.time_window);
    return res.status(500).json({ error: 'invalid time_window' });
  }

  const dateStr = visitRow.requested_date as string;
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  const locationText = school.meeting_location || school.address || school.name;
  const playerNames = players.map(p => p.name).join(', ');
  const notesText = typeof visitRow.notes === 'string' ? visitRow.notes.trim() : '';

  const descriptionParts: string[] = [];
  if (notesText.length > 0) descriptionParts.push(notesText);
  descriptionParts.push(`Players present: ${playerNames || '(none selected)'}`);
  descriptionParts.push('Submitted via: GrittyFB Coach Scheduler at app.grittyfb.com/athletes');
  descriptionParts.push(`All times in school's local timezone (${school.timezone}).`);

  const icsAttrs: EventAttributes = {
    uid: `${visitRow.id}@grittyfb.com`,
    title: `${coachSub.program} visit at ${school.name}`,
    description: descriptionParts.join('\n\n'),
    location: locationText,
    start: [year, month, day, window.start[0], window.start[1]],
    end: [year, month, day, window.end[0], window.end[1]],
    startInputType: 'local',
    startOutputType: 'local',
    endInputType: 'local',
    endOutputType: 'local',
    status: 'CONFIRMED',
    organizer: { name: headCoachDisplayName, email: headCoachEmail },
    // D5: head coach appears as both ORGANIZER and ATTENDEE — some clients
    // require this for the organizer's own calendar to render the invite.
    attendees: recipients.map(r => ({
      name: r.name,
      email: r.email,
      rsvp: true,
      role: 'REQ-PARTICIPANT',
      partstat: 'NEEDS-ACTION',
    })),
  };

  const { error: icsErr, value: icsValue } = createEvent(icsAttrs);
  if (icsErr || !icsValue) {
    console.error('coach-scheduler-dispatch: ics generation failed', icsErr);
    return res.status(500).json({ error: 'ics generation failed' });
  }
  const icsBuffer = Buffer.from(icsValue, 'utf-8');

  // --------------------------------------------------------------------------
  // 6. Send + record per recipient (D6 + D7 + D8)
  //    One Resend send per recipient (no bcc — multi-recipient ICS handling
  //    is inconsistent across clients). Reply-To is the head coach (OQ2 lock).
  //    Each send wrapped in try/catch — one failure does not abort others.
  //    Each delivery row write wrapped in try/catch — INSERT failure logs but
  //    does not abort the response (delivery row is observability).
  // --------------------------------------------------------------------------
  const subject = `Calendar invite: ${coachSub.program} visit on ${dateStr}`;
  const windowDisplay = `${window.start[0]}:${String(window.start[1]).padStart(2, '0')}–${window.end[0]}:${String(window.end[1]).padStart(2, '0')}`;
  const attendeeList = recipients.map(r => `${r.name} (${r.email})`).join(', ');
  const bodyTextLines: string[] = [
    `${coachSub.name} (${coachSub.program}) is requesting a drop-in visit at ${school.name}.`,
    '',
    `Date: ${dateStr}`,
    `Time window: ${visitRow.time_window} (${windowDisplay} ${school.timezone})`,
    `Location: ${locationText}`,
    `Attendees: ${attendeeList}`,
  ];
  if (notesText.length > 0) {
    bodyTextLines.push('', `Notes: ${notesText}`);
  }
  bodyTextLines.push(
    '',
    'The attached calendar invite (invite.ics) will auto-import in most calendar clients.',
    `Replies route to the high school head coach (${headCoachDisplayName}).`,
  );
  const bodyText = bodyTextLines.join('\n');

  let delivered_count = 0;
  let failed_count = 0;
  const errors: ErrorRecord[] = [];

  for (const recipient of recipients) {
    let send_status: 'sent' | 'failed' = 'failed';
    let provider_message_id: string | null = null;
    let error_code: string | null = null;
    let error_message: string | null = null;

    try {
      const sendRes = await resend.emails.send({
        from: RESEND_FROM_ADDRESS,
        to: recipient.email,
        replyTo: headCoachEmail,
        subject,
        text: bodyText,
        attachments: [{
          filename: 'invite.ics',
          content: icsBuffer,
          contentType: 'text/calendar; method=REQUEST',
        }],
      });

      if (sendRes.error) {
        error_code = sendRes.error.name ?? 'send_error';
        error_message = sendRes.error.message ?? 'unknown error';
      } else if (sendRes.data?.id) {
        send_status = 'sent';
        provider_message_id = sendRes.data.id;
      } else {
        error_code = 'unknown';
        error_message = 'No id returned from provider';
      }
    } catch (err) {
      error_code = 'exception';
      error_message = err instanceof Error ? err.message : String(err);
    }

    if (send_status === 'sent') {
      delivered_count += 1;
    } else {
      failed_count += 1;
      errors.push({
        recipient: recipient.email,
        error_code: error_code ?? 'unknown',
        message: error_message ?? 'unknown error',
      });
    }

    try {
      const insertPayload = {
        visit_request_id: visitRow.id,
        recipient_email: recipient.email,
        recipient_role: recipient.role,
        recipient_name: recipient.name,
        send_status,
        provider_message_id,
        error_code,
        error_message,
        delivered_at: send_status === 'sent' ? new Date().toISOString() : null,
      };
      const { error: insertErr } = await supabase
        .from('visit_request_deliveries')
        .insert(insertPayload);
      if (insertErr) {
        console.error('coach-scheduler-dispatch: delivery row insert failed', {
          recipient: recipient.email, insertErr,
        });
      }
    } catch (insertErr) {
      console.error('coach-scheduler-dispatch: delivery row insert threw', insertErr);
    }
  }

  const httpStatus = delivered_count === 0 ? 500 : 200;
  return res.status(httpStatus).json({ delivered_count, failed_count, errors });
}
