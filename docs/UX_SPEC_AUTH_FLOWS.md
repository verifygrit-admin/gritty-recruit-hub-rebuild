# UX SPEC: AUTHENTICATION FLOWS

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design), Morty (Implementation Owner for auth logic)
**Related Decision:** RB-002 (Auth-first architecture)
**Reference:** Directive Part 4 (AUTH FLOW SPECIFICATION)

---

## OVERVIEW

Authentication flows are the gateways to the app. Three distinct paths exist for Phase 1 MVP:
1. **Student-athlete signup & login** — Primary flow, high friction (complete profile first)
2. **High school coach signup & login** — Secondary flow, lower friction (just school selection)
3. **High school guidance counselor signup & login** — For MVP scope determination

All flows use Supabase Auth for session management. The principle is: **Auth-first. Every user is created in auth.users before any app data (profile, user record) is created.**

---

## DESIGN INTENT

The BC High Eagles logo conveys trust and official authority. Applied to auth screens: Simple, clean, single-purpose. No distractions. One action per screen. Progress feels linear and forward-moving.

---

## SHARED COMPONENTS

### Auth Header

Every auth screen includes a minimal header:

```
┌─────────────────────────────────────────────────────────┐
│                    GRITTY RECRUIT HUB                   │
│  [Home]  [About]  [FAQ]                                  │
└─────────────────────────────────────────────────────────┘
```

- **Background:** `#FFFFFF` (white)
- **Logo/Title (H2):** "Gritty Recruit Hub" in Maroon, left-aligned
- **Nav links (Body Small):** [Home] [About] [FAQ], right-aligned, non-authenticated users only
- **Height:** 60px
- **Border-bottom:** `1px solid #E8E8E8`

### Auth Card Container

All auth screens use a centered card layout:

```
┌─────────────────────────┐
│                         │
│  [Auth Screen Content]  │
│                         │
└─────────────────────────┘
```

- **Width:** 400px (desktop), 90vw (mobile)
- **Background:** `#FFFFFF` (white)
- **Border:** `1px solid #E8E8E8`
- **Border-radius:** 8px
- **Padding:** 32px (xl)
- **Shadow:** `0 2px 8px rgba(0,0,0,0.1)`
- **Centered:** Vertical & horizontal, min-height: 400px

### Form Field Styling (All Auth Screens)

**Label:**
- Font: Body Regular, Charcoal
- Margin-bottom: 4px (xs)
- Required indicator: "*" in red, attached to label

**Text Input:**
- Width: 100%, full-width
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A` outline
- Placeholder: Light gray text, Body Regular

**Error State:**
- Border: `2px solid #F44336` (red)
- Background: `#FFF5F5` (light red)
- Error message: `<p>` below input, Body Small, red `#F44336`

**Disabled State:**
- Background: `#F5F5F5`
- Border: `1px solid #E8E8E8`
- Text: Light gray `#999`

### Button Styling (All Auth Screens)

**Primary Button (Submit):**
- Style: Maroon fill, white text
- Width: 100% (full-width)
- Padding: 12px 16px
- Border-radius: 4px
- Font: Body Regular, bold, 1rem
- Cursor: pointer
- Hover: Darker maroon `#6B2C2C`
- Active: Even darker `#5A1F1F`
- Disabled: Gray background, gray text
- Loading state: Shows spinner + "Loading..." text

**Secondary Button (Cancel/Back):**
- Style: Outlined Maroon, Maroon text
- Border: `2px solid #8B3A3A`
- Background: `#FFFFFF` (white)
- Width: 100%
- Padding: 12px 16px
- Border-radius: 4px
- Font: Body Regular, bold, 1rem
- Hover: Light gray background `#F5F5F5`

**Text Link Button:**
- Style: Maroon text, underline on hover
- No border, no padding
- Font: Body Regular, Maroon
- Hover: Darker maroon `#6B2C2C`, underline appears

### Divider

Separates sections:
```
────────── or ──────────
```

- Width: 100%
- Text: "or" (Body Small, Stone Gray)
- Color: `#E8E8E8`
- Margin: 16px 0 (md)

---

## AUTHENTICATION FLOW 1: STUDENT-ATHLETE SIGNUP

### Step 1: Signup Entry Screen

**URL:** `/auth/student/signup`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Create Your Student Account        │
│                                     │
│  Email *                            │
│  [email input]                      │
│                                     │
│  Password *                         │
│  [password input]                   │
│  (Strength indicator below)         │
│                                     │
│  Confirm Password *                 │
│  [password input]                   │
│                                     │
│  ☐ I agree to Terms & Privacy      │
│    (Links to external docs)         │
│                                     │
│  [Sign Up ➜]                        │
│                                     │
│  ─── or ───                         │
│                                     │
│  Already have an account?           │
│  [Sign In]                          │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**

1. **Email Input**
   - Label: "Email *"
   - Type: email
   - Placeholder: "your@email.com"
   - Validation: Must be valid email format, not already registered
   - Error: "Please enter a valid email" or "Email already in use"

2. **Password Input**
   - Label: "Password *"
   - Type: password
   - Placeholder: "Enter password"
   - Strength indicator below field:
     - **Weak:** Red bar, "Weak - Add more characters or symbols"
     - **Fair:** Orange bar, "Fair - Consider adding uppercase or symbols"
     - **Strong:** Green bar, "Strong"
   - Min requirements: 8 characters, 1 uppercase, 1 number, 1 symbol
   - Error: "Password must be at least 8 characters"

3. **Confirm Password Input**
   - Label: "Confirm Password *"
   - Type: password
   - Placeholder: "Confirm password"
   - Validation: Must match Password field
   - Error: "Passwords don't match"

4. **Terms Checkbox**
   - Type: Checkbox
   - Label: "I agree to Terms & Privacy" (Body Small)
   - Links: [Terms] and [Privacy] (text links, open in new tab)
   - Validation: Required (checkbox must be checked)
   - Error: "Please agree to terms to continue"

**Buttons:**

- **[Sign Up ➜]** (Primary, full-width)
  - On click: Validate all fields
  - If valid: Create auth.users record with email + password
  - On success: Navigate to Step 2 (High School Selection)
  - On error: Show inline error message (e.g., "Email already in use")
  - Loading: Button shows spinner + "Creating account..."

- **[Sign In]** (Text link, below divider)
  - On click: Navigate to Student Login screen

**Accessibility:**
- Focus management: Tab through Email → Password → Confirm → Terms → Sign Up
- Aria-labels: "Password strength indicator", "Terms and privacy checkbox"
- Error messages: aria-live="polite"

---

### Step 2: High School Selection

**URL:** `/auth/student/select-school`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Select Your High School            │
│                                     │
│  We'll help connect you with your   │
│  coach if you select the right      │
│  school.                            │
│                                     │
│  High School *                      │
│  [Searchable Dropdown ▼]            │
│  Type to search...                  │
│                                     │
│  [Select School]                    │
│                                     │
│  Coach Auto-Link (after selection): │
│  ─────────────────────────────────  │
│  Is [Coach Name] your head coach?   │
│  [Yes, link us] [No, skip]          │
│                                     │
│  [← Back] [Next: Profile ➜]         │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**

1. **High School Dropdown**
   - Label: "High School *"
   - Type: Searchable dropdown (combobox)
   - Data source: `hs_programs` table (all schools in MVP scope = BC High only for MVP, but dropdown prepared for expansion)
   - Placeholder: "Type school name..."
   - Search behavior: Real-time filtering on school name, city, state
   - Options format: "[School Name], [City], [State]"
   - Validation: Required (must select a school)
   - Error: "Please select a high school"
   - Styling: Full-width, 12px padding, rounded 4px, focus outline Maroon 2px

**Coach Auto-Link Logic:**

After student selects a school:
1. Query `hs_coach_schools` table for coaches at the same `hs_program_id` where `is_head_coach = true`
2. If coach found:
   - Show secondary prompt: "Is [Coach Name] your head coach?"
   - Display coach's name (first + last)
   - Two buttons: [Yes, link us] [No, skip]
   - If Yes: Create junction record linking coach to student's user_id
   - If No: Continue without linking
3. If no coach found:
   - Skip to next step automatically

**Buttons:**

- **[← Back]** (Secondary, full-width)
  - On click: Navigate back to Signup Entry screen
  - Data: Clear email/password (user must re-enter)

- **[Next: Profile ➜]** (Primary, full-width)
  - On click: Validate school selection
  - If valid: Navigate to Step 3 (GRIT FIT Profile Form)
  - Store school_id in session/form state (not saved to DB yet)

---

### Step 3: GRIT FIT Profile Form

**URL:** `/auth/student/profile`

**Description:** The full GRIT FIT Profile Form (see UX_SPEC_PROFILE_FORM.md for details)

**Key Differences from Edit Mode:**
- Header: "Complete Your GRIT FIT Profile"
- Submit button: "Submit & Calculate Matches ➜"
- After submit: Automatically navigate to `/grit-fit/results` (Map View)
- Progress bar shows at top (optional)

**Data Flow:**
1. On submit:
   - Form data + email + password + selected hs_program_id bundled (note: users table has no school_id column in v2 — A-06)
   - POST to `/api/auth/register` endpoint
   - Server-side (Morty):
     - Create auth.users record (if not already created in Step 1) — user_id (Supabase Auth UUID) is assigned by Supabase
     - Create users table record (user_type = 'student_athlete', account_status = 'active') — no school_id column; student-school linkage via hs_coach_students junction (A-06)
     - Create profiles table record (user_id, name, athletic/academic stats, etc.)
     - Run GRIT FIT algorithm
     - Return 30 schools (or fewer) as JSON
   - Client-side:
     - Store schools in React state
     - Navigate to `/grit-fit/results` with results pre-loaded
     - Show Map View by default

---

### Step 4: Results (Post-Signup)

**URL:** `/grit-fit/results`

**Description:** See UX_SPEC_GRITFIT_MAP.md

**Key Post-Signup Behavior:**
- Map shows 30 schools (or fewer)
- Toast notification: "Welcome! Here are your 30 personalized matches."
- Student can immediately add schools to shortlist
- Dashboard link becomes available in header nav

---

## AUTHENTICATION FLOW 2: HIGH SCHOOL COACH SIGNUP & LOGIN

**Phase:** Phase 2 (Post-MVP). Coach signup is deferred. MVP includes Coach Login only (with pre-seeded test account).

### Signup Entry Screen (Coach)

**URL:** `/auth/coach/signup`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Coach Account Registration         │
│                                     │
│  Email *                            │
│  [email input]                      │
│                                     │
│  Password *                         │
│  [password input]                   │
│  (Strength indicator below)         │
│                                     │
│  Confirm Password *                 │
│  [password input]                   │
│                                     │
│  High School *                      │
│  [Searchable Dropdown ▼]            │
│  Type to search...                  │
│                                     │
│  ☐ I agree to Terms & Privacy      │
│                                     │
│  [Create Coach Account ➜]           │
│                                     │
│  ─── or ───                         │
│                                     │
│  Already registered?                │
│  [Sign In]                          │
│                                     │
└─────────────────────────────────────┘
```

**Differences from Student Signup:**
1. High school selection is on the signup screen itself (not a separate step)
2. No GRIT FIT profile form (coaches don't have profiles)
3. Account activates immediately after submission
4. Redirects to Coach Dashboard after signup

**Data Flow:**
1. User enters email, password, confirms password, selects high school
2. On submit:
   - Create auth.users record — user_id (Supabase Auth UUID) is assigned by Supabase
   - Query `hs_programs` for the selected school's `hs_program_id`
   - Create users table record (user_type = 'hs_coach', account_status = 'active')
   - Create hs_coach_schools junction record linking coach's user_id to the selected hs_program_id
   - Set session and navigate to `/coach/dashboard`

---

## AUTHENTICATION FLOW 3: STUDENT LOGIN

### Login Screen

**URL:** `/auth/student/login`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Sign In to Your Account            │
│                                     │
│  Email *                            │
│  [email input]                      │
│                                     │
│  Password *                         │
│  [password input]                   │
│                                     │
│  [Sign In ➜]                        │
│                                     │
│  [Forgot Password?]                 │
│                                     │
│  ─── or ───                         │
│                                     │
│  New student?                       │
│  [Create Account]                   │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**

1. **Email Input**
   - Label: "Email *"
   - Type: email
   - Placeholder: "your@email.com"
   - Validation: Must be non-empty
   - Error (generic): "Invalid email or password"

2. **Password Input**
   - Label: "Password *"
   - Type: password
   - Placeholder: "Enter password"
   - Validation: Must be non-empty
   - Error (generic): "Invalid email or password"

**Buttons:**

- **[Sign In ➜]** (Primary, full-width)
  - On click: Validate fields and submit to Supabase
  - On success: Navigate to Dashboard (or Landing if first-time)
  - On error: Show generic error "Invalid email or password"
  - Loading: "Signing in..."

- **[Forgot Password?]** (Text link, below inputs)
  - On click: Navigate to Password Reset screen
  - Visible below Sign In button, left-aligned

- **[Create Account]** (Text link, below divider)
  - On click: Navigate to Signup Entry screen

**Error Handling:**
- Do not reveal whether email is registered or not (security)
- Use generic "Invalid email or password" for all login failures
- Rate limiting: Limit login attempts to 5 per minute per IP

**Session Restore:**
- On app load, check if active session exists
- If yes: Extract user_id from session.user
- Fetch profile and GRIT FIT results using user_id
- Navigate to `/grit-fit/results` or Dashboard (depending on profile status)
- If no: Show landing page (anonymous users can still browse)

---

## AUTHENTICATION FLOW 4: COACH LOGIN

### Coach Login Screen

**URL:** `/auth/coach/login`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Coach Sign In                      │
│                                     │
│  Email *                            │
│  [email input]                      │
│                                     │
│  Password *                         │
│  [password input]                   │
│                                     │
│  [Sign In ➜]                        │
│                                     │
│  [Forgot Password?]                 │
│                                     │
│  ─── or ───                         │
│                                     │
│  Don't have an account?             │
│  [Register as Coach]                │
│                                     │
└─────────────────────────────────────┘
```

**Identical to Student Login, except:**
- Title: "Coach Sign In"
- Signup link: "Register as Coach" (navigates to Coach Signup)

---

## AUTHENTICATION FLOW 5: PASSWORD RESET

### Password Reset Request Screen

**URL:** `/auth/forgot-password`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Reset Your Password                │
│                                     │
│  Enter the email address            │
│  associated with your account.      │
│  We'll send a link to reset it.     │
│                                     │
│  Email *                            │
│  [email input]                      │
│                                     │
│  [Send Reset Link ➜]                │
│                                     │
│  [← Back to Sign In]                │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**

1. **Email Input**
   - Label: "Email *"
   - Type: email
   - Placeholder: "your@email.com"

**Button:**

- **[Send Reset Link ➜]** (Primary, full-width)
  - On click: Validate email and request password reset
  - On success: Navigate to Confirmation screen (show message "Check your email")
  - On error (email not found): Show generic message "If an account exists, a reset link will be sent"
  - Loading: "Sending reset link..."

- **[← Back to Sign In]** (Text link)
  - On click: Navigate back to Login screen

**Confirmation Screen (after sending):**

```
┌─────────────────────────────────────┐
│  Check Your Email                   │
│                                     │
│  We've sent a password reset link   │
│  to your email. Click the link to   │
│  create a new password.             │
│                                     │
│  Didn't receive an email?           │
│  [Resend] | [Try another email]     │
│                                     │
│  [← Back to Sign In]                │
│                                     │
└─────────────────────────────────────┘
```

### Password Reset Link (Email)

User receives an email with a link. Clicking the link redirects to:

**URL:** `/auth/reset-password?token=[reset_token]`

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  Create New Password                │
│                                     │
│  Password *                         │
│  [password input]                   │
│  (Strength indicator)               │
│                                     │
│  Confirm Password *                 │
│  [password input]                   │
│                                     │
│  [Update Password ➜]                │
│                                     │
│  [← Cancel]                         │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**

1. **Password Input** — Same as signup (with strength indicator)
2. **Confirm Password Input** — Must match

**Button:**

- **[Update Password ➜]** (Primary)
  - On click: Validate and submit new password to Supabase
  - On success: Navigate to Login screen with message "Password updated. Please sign in."
  - On error: Show error message (e.g., "Token expired. Request a new reset link.")

---

## GUIDANCE COUNSELOR FLOW (PHASE 2 ONLY)

**Phase:** Phase 2 (deferred post-MVP). Guidance counselor signup and login are not included in MVP.

**Status:** Pending Chris confirmation. Placeholder specs below for Phase 2 implementation.

**Option A (MVP-Included):**
Guidance counselors sign up like coaches:
- Email + password
- School selection
- Account activates immediately
- Dashboard shows all students at school (read-only view of shortlists)

**Option B (Phase 2 Only):**
No guidance counselor signup in MVP. Deferred to Phase 2 when permissions model is more mature.

**Awaiting:** Chris confirmation on which option applies

---

## LOGOUT FLOW

### Logout Button

Located in header (all authenticated screens):

**Button Location:** Top-right, next to user name

**On Click:**
1. Show confirmation modal: "Sign out of your account?"
2. On confirm:
   - Clear session (Supabase signOut())
   - Clear local storage (profile data, GRIT FIT results)
   - Navigate to `/` (Landing page, anonymous view)
   - Show toast: "You've been signed out"

---

## SESSION MANAGEMENT

### Session Restore (On App Load)

Every time the app loads:

```javascript
1. Check for active session (getSession())
2. If session exists:
   a. Extract user_id from session.user
   b. Fetch profile from DB using user_id
   c. Determine user_type from users table
   d. If student:
      - Run GRIT FIT if needed (or load cached results)
      - Navigate to `/grit-fit/results` or `/dashboard`
   e. If coach:
      - Navigate to `/coach/dashboard`
   f. If counselor:
      - Navigate to `/counselor/dashboard`
3. If no session:
   - Navigate to `/` (Landing, anonymous view)
```

### Session Timeout (Phase 2)

For MVP, sessions persist. Phase 2 will implement:
- Automatic logout after 24 hours of inactivity
- Refresh token rotation
- Explicit logout reminder modal

---

## ACCESSIBILITY NOTES

**All Auth Screens:**
- Focus order: Left-to-right, top-to-bottom
- Error messages: aria-live="polite" for real-time announcement
- Password strength indicator: aria-describedby linking to strength message
- Links: aria-label for clarity (e.g., "Forgot password link")
- Color contrast: All text meets 4.5:1 minimum
- Mobile keyboard: Appropriate input types (email, password) for native keyboards

---

## RESPONSIVE DESIGN

### Desktop & Tablet
- Auth card: Fixed width 400px, centered vertically/horizontally
- Full-width inputs and buttons
- All fields visible at once

### Mobile (< 768px)
- Auth card: 90vw width, 20px margin sides
- Full-width inputs and buttons
- Vertical stacking of all elements
- Input font-size: 16px (prevents zoom on iOS)
- Touch targets: Minimum 44px × 44px

---

## IMPLEMENTATION NOTES

**Owner:** Morty (auth flow implementation)

**Dependencies:**
- [ ] Supabase Auth setup (new project)
- [ ] auth.users table creation
- [ ] public.users table creation
- [ ] getSession() implementation (not getUser())
- [ ] Password reset email template
- [ ] Email verification (optional for MVP)

**Key Decisions for Morty:**
1. Should email verification be required before signup completes? **Recommendation:** No for MVP (Supabase pre-confirms by default)
2. Should multi-factor authentication (MFA) be available? **Recommendation:** No for MVP, available in Supabase for Phase 2
3. Should social login (Google, GitHub) be supported? **Recommendation:** No for MVP

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (UX consistency, layout, responsive behavior)
- [ ] Morty (technical feasibility, Supabase auth architecture)
- [ ] Chris (scope confirmation on Coach/Counselor flows and session management)

Once signed off, Morty proceeds to implementation.

---

*Auth Flows Spec v1.0 — subject to revision based on stakeholder feedback and technical discovery.*
