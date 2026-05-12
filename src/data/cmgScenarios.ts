/**
 * Coach Message Generator — Scenario Templates
 *
 * Date: 2026-05-11
 * Sprint: 025 — Phase 2 (templates as data)
 *
 * Source of truth for verbatim wording:
 *   src/assets/Coach Communication Generator.docx
 *
 * References:
 *   - DEC-CFBRB-097: 11-scenario taxonomy lock (10 coach-targeted + 1 public X post)
 *   - DEC-CFBRB-098: JSONB storage on public.profiles.cmg_message_log
 *   - docs/specs/.cmg-sprints/SPEC_FOR_CODE.md (Step 2 ScenarioTemplate type,
 *     Step 5 substitution map)
 *
 * This module is the single source of truth for message wording. The CMG
 * component renders by reading these templates and substituting bracket
 * tokens at preview time. Do NOT embed template text inside React components.
 *
 * Wording is preserved VERBATIM from the docx with two narrow exceptions:
 *   (a) "BC High" hardcoded in the subject lines of scenarios 2 and 3 was
 *       corrected to [HS Name] so the scenario renders correctly for every
 *       partner school, not just BC High. The docx itself is not modified;
 *       it remains the archived source of truth for wording.
 *   (b) Subjects for the No Response sequence (#9/#10/#11) are intentionally
 *       null — these scenarios are same-thread nudges where the email client
 *       preserves the prior subject line on reply. See per-scenario JSDoc.
 *
 * All other spelling artifacts ("[School Namel]", "[Abbv Grad Year]",
 * "[College Name]", "[Name of the Camp]", etc.) are preserved verbatim in the
 * template strings. They resolve correctly because SUBSTITUTION_TOKENS maps
 * every variant to the same canonical form field — see the canonical-to-variant
 * mapping block below the SUBSTITUTION_TOKENS export.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipientKind =
  | "position_coach"
  | "recruiting_area_coach"
  | "recruiting_coordinator"
  | "head_coach"
  | "broadcast";

export type ClosingQuestionFlag = "junior_day" | "camp" | "both" | "neither";

export type ScenarioTemplate = {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  title: string;
  kind: "public_post" | "coach_message";
  channel_pattern: "twitter-public" | "dm-first" | "email-first";
  applies_to_recipients: RecipientKind[];
  body_template: string;
  email_subject_template: string | null;
  email_signature_template: string;
  twitter_signature_template: string;
  required_form_fields: string[];
  closing_questions: ClosingQuestionFlag;
};

// ---------------------------------------------------------------------------
// Substitution token map (Step 5 of SPEC_FOR_CODE)
// ---------------------------------------------------------------------------

export const SUBSTITUTION_TOKENS: Record<
  string,
  { source: "profile" | "form" | "recipient" | "derived"; field: string; description: string }
> = {
  // --- Profile (auto-filled) ---
  "[Your Full Name]": {
    source: "profile",
    field: "name",
    description: "Student's full name (public.profiles.name)",
  },
  "[Grad Year]": {
    source: "profile",
    field: "grad_year",
    description: "Four-digit graduation year",
  },
  "[Abbrev Grad Year]": {
    source: "derived",
    field: "grad_year",
    description: "Apostrophe + last two digits of grad_year, e.g. '27",
  },
  "[Abbv Grad Year]": {
    source: "derived",
    field: "grad_year",
    description:
      "Variant spelling used in Scenario 9 body — same derivation as [Abbrev Grad Year]",
  },
  "[Position]": {
    source: "profile",
    field: "position",
    description: "Athletic position (public.profiles.position)",
  },
  "[HS Name]": {
    source: "profile",
    field: "high_school",
    description: "High school name (public.profiles.high_school)",
  },
  "[State]": {
    source: "profile",
    field: "state",
    description: "Two-letter state code (public.profiles.state)",
  },
  "[Current GPA]": {
    source: "profile",
    field: "gpa",
    description: "Current GPA (public.profiles.gpa)",
  },
  "[GPA]": {
    source: "profile",
    field: "gpa",
    description: "Variant used in Scenario 9 body — same source as [Current GPA]",
  },
  "[Height]": {
    source: "profile",
    field: "height",
    description:
      "Height (public.profiles.height — text, e.g. \"6-2\"). Auto-filled from profile; referenced in Scenario 9 body.",
  },
  "[Weight]": {
    source: "profile",
    field: "weight",
    description:
      "Weight (public.profiles.weight — numeric). Auto-filled from profile; referenced in Scenario 9 body.",
  },
  "[Hudl film link]": {
    source: "profile",
    field: "hudl_url",
    description: "Hudl profile URL (public.profiles.hudl_url)",
  },
  "[Twitter profile link]": {
    source: "profile",
    field: "twitter",
    description: "Twitter/X profile URL (public.profiles.twitter)",
  },

  // --- Form state ---
  "[School Name]": {
    source: "form",
    field: "school_name",
    description: "Selected school's display name (from short_list_items or schools)",
  },
  "[School Namel]": {
    source: "form",
    field: "school_name",
    description:
      "Typo in Scenario 2 body ('Namel' with trailing l) — same source as [School Name]. Flagged for downstream content cleanup.",
  },
  "[College Name]": {
    source: "form",
    field: "school_name",
    description:
      "Variant used in Scenario 7 body — same source as [School Name]. Flagged for downstream content cleanup.",
  },
  "[Camp Name]": {
    source: "form",
    field: "camp_name",
    description: "Name of the camp the student attended/is attending",
  },
  "[Name of Camp]": {
    source: "form",
    field: "camp_name",
    description: "Variant used in Scenario 1 body — same source as [Camp Name]",
  },
  "[Name of the Camp]": {
    source: "form",
    field: "camp_name",
    description: "Variant used in Scenario 7 body — same source as [Camp Name]",
  },
  "[Name of Location]": {
    source: "form",
    field: "camp_location",
    description: "Location where the camp was held",
  },
  "[Date]": {
    source: "form",
    field: "camp_date",
    description: "Date of the upcoming camp (Scenario 7)",
  },
  "[Name of Event]": {
    source: "form",
    field: "event_name",
    description: "Name of the Junior Day / visit / prospect camp (Scenario 8)",
  },
  "[day of the week on which the event occurred]": {
    source: "form",
    field: "event_day_of_week",
    description: "Day of week the visit/camp took place (Scenario 8)",
  },
  "[Thank the coach by sharing a sentence that describes something that was meaningful for you and that took place at the camp or visit.]":
    {
      source: "form",
      field: "thank_you_sentence",
      description: "Free-form thank-you sentence written by the student (Scenario 8)",
    },

  // --- Recipient + form ---
  "[Last Name]": {
    source: "recipient",
    field: "last_name",
    description: "Per-recipient coach last name (from form, per active recipient tab)",
  },
  "[Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact]":
    {
      source: "form",
      field: "ac_or_rc_last_name",
      description: "Last name of the AC/RC the student previously tried to contact (Scenario 6)",
    },
  "[Position Coach]": {
    source: "form",
    field: "position_coach_handle",
    description: "@handle of the position coach used for the Scenario 1 public X mention",
  },
  "[Head Coach]": {
    source: "form",
    field: "head_coach_handle",
    description: "@handle of the head coach used for the Scenario 1 public X mention",
  },
  "[@CoachHandle]": {
    source: "form",
    field: "coach_handle",
    description:
      "Generic coach @handle (Phase 1: visible placeholder; Phase 2: public.college_coaches lookup)",
  },

  // --- Optional closing questions ---
  "[Junior Day Question]": {
    source: "form",
    field: "junior_day_question_text",
    description:
      "Optional Junior Day closing question text. If unchecked, the substitution emits empty string and the surrounding question text should be stripped by render layer.",
  },
  "[Camp Question]": {
    source: "form",
    field: "camp_question_text",
    description:
      "Optional Camp closing question text. If unchecked, the substitution emits empty string and the surrounding question text should be stripped by render layer.",
  },

  // --- Static instructional / image attachments (rendered as-is in preview) ---
  "[Attach Twitter Video Highlights from Camp]": {
    source: "form",
    field: "attach_video_note",
    description:
      "Instructional placeholder in Scenario 1 reminding the student to attach a video. Not substituted in v1 — surfaced as a coach-message-instruction.",
  },
  "[Attach camp flyer image to email]": {
    source: "form",
    field: "attach_flyer_note",
    description:
      "Instructional placeholder in Scenario 7 reminding the student to attach a camp flyer. Not substituted in v1.",
  },
};

// ---------------------------------------------------------------------------
// Canonical-to-variant token mapping (for maintainability)
// ---------------------------------------------------------------------------
// The docx contains a handful of token variants (typos, abbreviations, and
// alternate phrasings) that all resolve to the same underlying profile column
// or form field. SUBSTITUTION_TOKENS above is the authoritative dispatcher;
// every variant has its own entry. This block exists so future maintainers
// can see the full picture at a glance.
//
//   profiles.high_school      ← [HS Name]
//   profiles.gpa              ← [Current GPA], [GPA]
//   profiles.grad_year        ← [Grad Year]   (raw four-digit)
//   profiles.grad_year (deriv) ← [Abbrev Grad Year], [Abbv Grad Year]
//   profiles.height           ← [Height]
//   profiles.weight           ← [Weight]
//   form.school_name          ← [School Name], [School Namel], [College Name]
//   form.camp_name            ← [Camp Name], [Name of Camp], [Name of the Camp]
//   form.camp_location        ← [Name of Location]
//   form.camp_date            ← [Date]
//   form.event_name           ← [Name of Event]
//   form.event_day_of_week    ← [day of the week on which the event occurred]
//   form.thank_you_sentence   ← [Thank the coach by sharing a sentence...]
//   form.coach_handle         ← [@CoachHandle]   (Phase 1: placeholder; Phase 2: picker)
//   form.position_coach_handle ← [Position Coach]
//   form.head_coach_handle    ← [Head Coach]
//   recipient.last_name       ← [Last Name]   (per active recipient tab)
//   form.ac_or_rc_last_name   ← [Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact]
//
// A future content cleanup pass in the docx can collapse the variants. Until
// then, the renderer is variant-tolerant by design.

/** Canonical-to-variant assertion. Imported by tests; throws at module load
 *  if a referenced token is missing from SUBSTITUTION_TOKENS. Cheap insurance. */
export const TOKEN_VARIANT_GROUPS: Record<string, readonly string[]> = {
  high_school: ["[HS Name]"],
  gpa: ["[Current GPA]", "[GPA]"],
  grad_year: ["[Grad Year]"],
  grad_year_abbrev: ["[Abbrev Grad Year]", "[Abbv Grad Year]"],
  height: ["[Height]"],
  weight: ["[Weight]"],
  school_name: ["[School Name]", "[School Namel]", "[College Name]"],
  camp_name: ["[Camp Name]", "[Name of Camp]", "[Name of the Camp]"],
  camp_location: ["[Name of Location]"],
  camp_date: ["[Date]"],
  event_name: ["[Name of Event]"],
  event_day_of_week: ["[day of the week on which the event occurred]"],
  thank_you_sentence: [
    "[Thank the coach by sharing a sentence that describes something that was meaningful for you and that took place at the camp or visit.]",
  ],
  coach_handle_generic: ["[@CoachHandle]"],
  position_coach_handle: ["[Position Coach]"],
  head_coach_handle: ["[Head Coach]"],
  last_name: ["[Last Name]"],
  ac_or_rc_last_name: [
    "[Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact]",
  ],
} as const;

// Sanity assertion — every variant in TOKEN_VARIANT_GROUPS must be a key in
// SUBSTITUTION_TOKENS. Runs at module load. If a variant is added to a group
// but not to the dispatcher, the import fails fast at app startup rather than
// silently leaving the token unsubstituted in rendered output.
for (const [groupKey, variants] of Object.entries(TOKEN_VARIANT_GROUPS)) {
  for (const variant of variants) {
    if (!(variant in SUBSTITUTION_TOKENS)) {
      throw new Error(
        `cmgScenarios: token ${variant} (group "${groupKey}") is not in SUBSTITUTION_TOKENS dispatcher`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Signature templates
// ---------------------------------------------------------------------------
// The docx renders the signature block as:
//
//   [Your Full Name]Class of [Grad Year], [Position][HS Name]
//
// (no line breaks between segments in the source XML run). The prototype
// (prototypes/cmg/coach-message-generator.html lines 1258-1263) shows the
// canonical visual rendering, which is:
//
//   [Your Full Name]
//   Class of [Grad Year], [Position]
//   [HS Name]
//   [Twitter profile link]    <-- email only; redundant cross-platform handoff
//
// Per DESIGN_NOTES D3.4 the redundant Twitter link is email-only. The Twitter
// signature variant is suppressed entirely — Twitter DMs do not need a
// multi-line signature because the recipient is already on the platform and
// can see the sender's handle natively. Sprint 025 hotfix (2026-05-12): the
// email-style multi-line signature was previously rendering on Twitter when
// the channel toggle switched; setting TWITTER_SIGNATURE to an empty string
// ensures the renderer suppresses the signature block when channel === 'twitter'
// (see PreviewPane.jsx empty-template guard).

const EMAIL_SIGNATURE = `[Your Full Name]
Class of [Grad Year], [Position]
[HS Name]
[Twitter profile link]`;

const TWITTER_SIGNATURE = '';

// ---------------------------------------------------------------------------
// Scenarios (id 1..11)
// ---------------------------------------------------------------------------

export const CMG_SCENARIOS: ScenarioTemplate[] = [
  /**
   * Scenario 1 — Post-Camp Highlights
   * Channel pattern: twitter-public (the only public post in the gallery)
   * Recipients: ["broadcast"] (no per-coach recipient — public timeline post)
   * Required form fields derived from body_template tokens:
   *   camp_name, position_coach_handle, head_coach_handle
   *   (note: [Position] is profile-derived, not form-derived)
   * Closing questions derivation: neither (no [Junior Day Question] or
   *   [Camp Question] in body or signature).
   * Source: src/assets/Coach Communication Generator.docx — Section 1
   *   "1. Twitter/X Post"
   */
  {
    id: 1,
    title: "Post-Camp Highlights",
    kind: "public_post",
    channel_pattern: "twitter-public",
    applies_to_recipients: ["broadcast"],
    body_template: `Had a great time working out, getting solid reps, and learning from coaches at the [Name of Camp] yesterday. Thank you to all the coaches who participated and shared info about their schools. Thanks to @[Position Coach] for leading the [Position] group and @[Head Coach] for the opportunity!
[Attach Twitter Video Highlights from Camp]`,
    email_subject_template: null,
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: ["camp_name", "position_coach_handle", "head_coach_handle"],
    closing_questions: "neither",
  },

  /**
   * Scenario 2 — Camp Follow-Up
   * Channel pattern: dm-first (DM → Email fallback per docx Instructions)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   camp_name, camp_location, school_name, last_name (per-recipient),
   *   junior_day_question_text, camp_question_text
   * Closing questions derivation: both ([Junior Day Question] and
   *   [Camp Question] both present in body).
   * Source: src/assets/Coach Communication Generator.docx — Section 2
   *   "2. The Camp Follow-Up Email & Twitter/DM"
   * Subject line: docx hardcodes "BC High" at the end; corrected to [HS Name]
   *   so the scenario renders correctly for every partner school. The docx
   *   remains the archived wording source; the correction lives only here.
   * Body contains "[School Namel]" (typo with trailing l) — preserved
   *   verbatim, mapped via SUBSTITUTION_TOKENS to the same school_name form
   *   field. See canonical-to-variant block.
   */
  {
    id: 2,
    title: "Camp Follow-Up",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],

It was great to see [School Name] at the [Camp Name] at [Name of Location] last week. I wanted to let you know that I recently submitted the recruiting questionnaire for [School Namel].

My school counselor, coaches, parents, and I have been discussing my college plans for next year. [School Name] is at the top of my college list. I'd love to learn more about what it would take for me to play for you all.

I'm a Class of [Grad Year] [Position] at [HS Name] in [State] with a [Current GPA] CGPA and rising.
You can see my film on my Hudl link:  [Hudl film link]

You can also see some of my latest camp highlights on Twitter/X: [Twitter profile link]

[Junior Day Question] [Camp Question]

Thank you for your consideration.
Sincerely,`,
    // Corrected from docx source — docx hardcodes "BC High" in sample wording.
    email_subject_template:
      "Nice to meet you at [Camp Name] | [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "camp_name",
      "camp_location",
      "school_name",
      "last_name",
      "junior_day_question_text",
      "camp_question_text",
    ],
    closing_questions: "both",
  },

  /**
   * Scenario 3 — Coach Followed Me on X
   * Channel pattern: dm-first (DM → Email fallback)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   school_name, last_name, junior_day_question_text, camp_question_text
   * Closing questions derivation: both
   * Source: docx Section 3 "3. The 'Followed You on X' Email and/or X DM"
   * Subject line: docx hardcodes "BC High" at the end; corrected to [HS Name]
   *   so the scenario renders correctly for every partner school.
   */
  {
    id: 3,
    title: "Coach Followed Me on X",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],

Thank you for the follow! I wanted to let you know that I recently submitted the recruiting questionnaire for [School Name].

My school counselor, coaches, parents, and I have been discussing my college plans for next year. [School Name] is at the top of my college list. I'd love to learn more about what it would take for me to play for you all.

I'm a Class of [Grad Year] [Position] at [HS Name] in [State] with a [Current GPA] CGPA and rising.
You can see my film on my Hudl link: [Hudl film link]

You can also see some of my latest camp highlights on Twitter/X: [Twitter profile link]

[Junior Day Question] [Camp Question]

Thank you for your consideration.
Sincerely,`,
    // Corrected from docx source — docx hardcodes "BC High" in sample wording.
    email_subject_template:
      "Thank you for the follow! | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "school_name",
      "last_name",
      "junior_day_question_text",
      "camp_question_text",
    ],
    closing_questions: "both",
  },

  /**
   * Scenario 4 — Introducing Myself
   * Channel pattern: email-first (Email → DM fallback per docx Instructions)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   school_name, last_name, junior_day_question_text, camp_question_text
   * Closing questions derivation: both
   * Source: docx Section 4 "4. The 'You are Interested' Email and/or X DM"
   */
  {
    id: 4,
    title: "Introducing Myself",
    kind: "coach_message",
    channel_pattern: "email-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],

I wanted to let you know that I recently submitted the recruiting questionnaire for [School Name].

I'm a Class of [Grad Year] [Position] at [HS Name] in [State] with a [Current GPA] CGPA and rising.

My school counselor, coaches, parents, and I have been discussing my college plans for next year. [School Name] is at the top of my college list. I'd love to learn more about what it would take for me to play for you all.

You can see my film on my Hudl link: [Hudl film link]

[Junior Day Question] [Camp Question]

Thank you for your consideration.
Sincerely,`,
    email_subject_template:
      "Completed Recruiting Questions | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "school_name",
      "last_name",
      "junior_day_question_text",
      "camp_question_text",
    ],
    closing_questions: "both",
  },

  /**
   * Scenario 5 — Reply to Email Blast
   * Channel pattern: email-first (replying to a coach's email blast)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   school_name, last_name, junior_day_question_text, camp_question_text
   * Closing questions derivation: both
   * Source: docx Section 5 "5. The 'Coach Sent You an Email Blast' Email and/or X DM"
   * Subject is null: docx instruction is "Reply directly to the email you
   *   received from the coach" — no new subject line is created.
   */
  {
    id: 5,
    title: "Reply to Email Blast",
    kind: "coach_message",
    channel_pattern: "email-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],

Thank you for your email! I wanted to let you know that I recently submitted the recruiting questionnaire for [School Name].

I'm a Class of [Grad Year] [Position] at [HS Name] in [State] with a [Current GPA] CGPA and rising.

My school counselor, coaches, parents, and I have been discussing my college plans for next year. [School Name] is at the top of my college list. I'd love to learn more about what it would take for me to play for you all.

You can see my film on my Hudl link: [Hudl film link]

You can also see some of my latest camp highlights on Twitter/X: [Twitter profile link]

[Junior Day Question] [Camp Question]

Thank you for your consideration.
Sincerely,`,
    email_subject_template: null,
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "school_name",
      "last_name",
      "junior_day_question_text",
      "camp_question_text",
    ],
    closing_questions: "both",
  },

  /**
   * Scenario 6 — No Response from AC/RC
   * Channel pattern: email-first (Email → DM fallback per docx Instructions)
   * Recipients: head_coach (the docx routes this to the head coach because
   *   the AC/RC has not responded)
   * Required form fields derived from body_template tokens:
   *   school_name, last_name (head coach), ac_or_rc_last_name,
   *   junior_day_question_text, camp_question_text
   * Closing questions derivation: both
   * Source: docx Section 6 "6. The 'No Response from AC/RC' Email and/or X DM"
   */
  {
    id: 6,
    title: "No Response from AC/RC",
    kind: "coach_message",
    channel_pattern: "email-first",
    applies_to_recipients: ["head_coach"],
    body_template: `Hi Coach [Last Name],

I'm a Class of [Grad Year] [Position] at [HS Name] in [State] with a [Current GPA] CGPA and rising.

My school counselor, coaches, parents, and I have been discussing my college plans for next year. [School Name] is at the top of my college list. I'd love to learn more about what it would take for me to play for you all.

I wanted to let you know that I filled out [School Name]'s recruiting questionnaire.

I also reached out to Coach [Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact] earlier this offseason.

You can see my film on my Hudl link: [Hudl film link]

You can also see some of my latest camp highlights on Twitter/X: [Twitter profile link]

[Junior Day Question]

[Camp Question]

Thank you for your consideration.
Sincerely,`,
    email_subject_template:
      "Completed Recruiting Questions | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "school_name",
      "last_name",
      "ac_or_rc_last_name",
      "junior_day_question_text",
      "camp_question_text",
    ],
    closing_questions: "both",
  },

  /**
   * Scenario 7 — Pre-Camp Notice
   * Channel pattern: email-first (Email → DM fallback per docx Instructions)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   camp_name (in subject), last_name, school_name (via [College Name]),
   *   camp_date
   * Closing questions derivation: neither (no [Junior Day Question] or
   *   [Camp Question] in body or signature).
   * Source: docx Section 7 "7. Pre-Camp Email"
   * Verbatim body uses "[Name of the Camp]" (variant) and "[College Name]"
   *   (variant of [School Name]) — both preserved verbatim and mapped via
   *   SUBSTITUTION_TOKENS to their canonical form fields.
   */
  {
    id: 7,
    title: "Pre-Camp Notice",
    kind: "coach_message",
    channel_pattern: "email-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],
I wanted to let you know that I am attending [Name of the Camp] on [Date].
I'm excited about [College Name] and look forward to seeing you and the other coaches there!
I also updated my recruiting questionnaire with some additional information.
If you have any questions for me, you can contact me here or on Twitter/X DMs: [Twitter profile link]
[Attach camp flyer image to email]
Sincerely,`,
    email_subject_template:
      "Attending [Camp Name] | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: ["camp_name", "last_name", "school_name", "camp_date"],
    closing_questions: "neither",
  },

  /**
   * Scenario 8 — Post-Visit Thank You
   * Channel pattern: dm-first (DM is priority — email if no DM)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   last_name, event_name, event_day_of_week, school_name,
   *   thank_you_sentence
   * Closing questions derivation: neither
   * Source: docx Section 8 "8. Post-Visit Message"
   */
  {
    id: 8,
    title: "Post-Visit Thank You",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach [Last Name],
I really enjoyed the [Name of Event] this [day of the week on which the event occurred] and am excited about [School Name].
[Thank the coach by sharing a sentence that describes something that was meaningful for you and that took place at the camp or visit.]
Looking forward to staying in touch and seeing you again soon!
Sincerely,`,
    email_subject_template:
      "Thank you! | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]",
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [
      "last_name",
      "event_name",
      "event_day_of_week",
      "school_name",
      "thank_you_sentence",
    ],
    closing_questions: "neither",
  },

  /**
   * Scenario 9 — No Reply #1 — First Nudge
   * Channel pattern: dm-first (DM is priority — email if no DM)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   school_name, last_name
   *   ([Abbv Grad Year], [Position], [Height], [Weight], [GPA], [HS Name],
   *    [Hudl film link] are all profile-sourced — not form fields)
   * Profile dependencies (auto-fill from public.profiles):
   *   grad_year, position, height, weight, gpa, high_school, hudl_url
   * Closing questions derivation: neither
   * Source: docx Section 9 "9. No Reply After Two Weeks" (No Response Sequence)
   * Token variants used here ([Abbv Grad Year], [GPA]) resolve to the same
   *   profile fields as their canonical counterparts via SUBSTITUTION_TOKENS.
   *   See canonical-to-variant block.
   * email_subject_template is intentionally null — the No Response sequence
   *   (#9/#10/#11) is a same-thread nudge pattern. With no subject, the email
   *   client preserves the prior subject line on reply, which is the intended
   *   behavior. The mailto handler emits an empty subject param accordingly.
   * Signature: docx does not show a signature for #9/#10/#11; the standard
   *   EMAIL_SIGNATURE is applied for the email channel. TWITTER_SIGNATURE is
   *   an empty string for all 11 scenarios — Twitter DMs do not need a
   *   multi-line signature (sender's handle is visible on-platform).
   */
  {
    id: 9,
    title: "No Reply #1 — First Nudge",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach - I'm still really interested in playing for [School Name]. [Abbv Grad Year], [Position], [Height], [Weight], [GPA], [HS Name]. Here's my film: [Hudl film link]. I also recently filled out the recruiting questionnaire.`,
    email_subject_template: null,
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: ["school_name", "last_name"],
    closing_questions: "neither",
  },

  /**
   * Scenario 10 — No Reply #2 — Bump to the Top
   * Channel pattern: dm-first (DM is priority — email if no DM)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   school_name
   *   (note: [Last Name] is NOT in this body — the docx wording is generic
   *    "Hi Coach -" with no name. last_name is therefore not required.)
   * Closing questions derivation: neither
   * Source: docx Section 10 "10. No Reply After a Week" (No Response Sequence)
   * email_subject_template is intentionally null — same-thread nudge pattern
   *   (No Response sequence). Null subject preserves the prior thread's subject
   *   line on reply in the email client.
   */
  {
    id: 10,
    title: "No Reply #2 — Bump to the Top",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach - I'm just bumping this message up to the top of your inbox. Still excited about [School Name].`,
    email_subject_template: null,
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: ["school_name"],
    closing_questions: "neither",
  },

  /**
   * Scenario 11 — No Reply #3 — Respectful Close
   * Channel pattern: dm-first (DM is priority — email if no DM)
   * Recipients: position_coach, recruiting_area_coach
   * Required form fields derived from body_template tokens:
   *   (none — the docx body has no [Bracketed Token] form/recipient references)
   * Closing questions derivation: neither
   * Source: docx Section 11 "11. No Reply After Two Weeks" (No Response Sequence)
   * email_subject_template is intentionally null — same-thread nudge pattern
   *   (No Response sequence). Null subject preserves the prior thread's subject
   *   line on reply in the email client.
   */
  {
    id: 11,
    title: "No Reply #3 — Respectful Close",
    kind: "coach_message",
    channel_pattern: "dm-first",
    applies_to_recipients: ["position_coach", "recruiting_area_coach"],
    body_template: `Hi Coach - I want to be respectful of your recruiting process. It seems like you're set at my position. If that changes, I'm definitely interested in talking.`,
    email_subject_template: null,
    email_signature_template: EMAIL_SIGNATURE,
    twitter_signature_template: TWITTER_SIGNATURE,
    required_form_fields: [],
    closing_questions: "neither",
  },
];
