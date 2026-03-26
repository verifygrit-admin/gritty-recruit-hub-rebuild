# UX SPEC: LOGIN & REGISTER SCREENS

**Status:** Implementation Ready
**Date:** 2026-03-25
**Authority:** Quill (UX/UI Design)
**Reference:** DESIGN_SYSTEM.md, UX_SPEC_AUTH_FLOWS.md
**Implementation Owner:** Nova (components), Morty (auth logic)

---

## OVERVIEW

This spec covers the complete component design for all authentication entry screens:
1. **Login Screen** — Email + password signin for existing users
2. **Register Screen** — Account activation by invitation only (seed accounts, no self-service)
3. **Pending Activation Screen** — User account awaiting admin activation
4. **Email Verification Screen** — User email pending verification

All screens use DESIGN_SYSTEM.md tokens and are built for both desktop and mobile.

---

## SHARED LAYOUT & STRUCTURE

### Auth Page Container
**Component:** `AuthPageLayout`

```
┌────────────────────────────────────────────┐
│                                            │
│  ╔═══════════════════════════════════════╗ │
│  ║                                       ║ │
│  ║    GRITTY RECRUIT HUB                ║ │
│  ║                                       ║ │
│  ║    [Auth Card Content]                ║ │
│  ║                                       ║ │
│  ╚═══════════════════════════════════════╝ │
│                                            │
└────────────────────────────────────────────┘
```

**CSS Properties:**
- **Height:** 100vh (full viewport)
- **Background:** `#FFFFFF`
- **Display:** flex
- **Align-items:** center
- **Justify-content:** center
- **data-testid:** `auth-page-layout`

### Auth Card Container
**Component:** `AuthCard`

```
┌─────────────────────────────┐
│                             │
│  [Screen Content]           │
│                             │
└─────────────────────────────┘
```

**CSS Properties:**
- **Width:** 400px (desktop), 90vw (mobile < 768px)
- **Max-width:** 400px
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E8E8E8`
- **Border-radius:** 8px
- **Padding:** 32px (xl)
- **Box-shadow:** `0 2px 8px rgba(0,0,0,0.1)`
- **data-testid:** `auth-card`

### Auth Header
**Component:** `AuthHeader`

Placed inside AuthCard, top-aligned.

```
┌─────────────────────────────┐
│  Sign In                    │
│                             │
│  Enter your email and       │
│  password to access your    │
│  account.                   │
│                             │
└─────────────────────────────┘
```

**Title (H2):**
- **Font:** 'Segoe UI', sans-serif
- **Font-size:** 2rem (32px)
- **Font-weight:** 700
- **Color:** `#8B3A3A` (Maroon)
- **Margin-bottom:** 8px (sm)
- **Line-height:** 1.3
- **data-testid:** `auth-header-title`

**Subtitle (Body Regular):**
- **Font-size:** 1rem (16px)
- **Font-weight:** 400
- **Color:** `#6B6B6B` (Stone Gray)
- **Margin-bottom:** 24px (lg)
- **Line-height:** 1.6
- **data-testid:** `auth-header-subtitle`

---

## FORM COMPONENTS

### Form Field Wrapper
**Component:** `FormField`

```
┌─────────────────────────────┐
│ Email *                     │
│ [text input]                │
│ Error message (if present)  │
└─────────────────────────────┘
```

**Margin-bottom:** 16px (md) between fields

**data-testid:** `form-field-[fieldname]`

### Label
**Component:** `Label`

- **Font-size:** 1rem (16px)
- **Font-weight:** 400
- **Color:** `#2C2C2C` (Charcoal)
- **Margin-bottom:** 4px (xs)
- **Display:** block

**Required Indicator:**
- **Text:** "*" (asterisk)
- **Color:** `#F44336` (Error red)
- **Margin-left:** 4px (xs)
- **Font-weight:** 400

**data-testid:** `label-[fieldname]`

### Text Input (Email, Password)
**Component:** `TextInput` or `PasswordInput`

```
┌─────────────────────────┐
│  [cursor here]          │
└─────────────────────────┘
```

**CSS Properties (Default State):**
- **Width:** 100%
- **Padding:** 12px 16px
- **Border:** `1px solid #D4D4D4`
- **Border-radius:** 4px
- **Font-size:** 1rem (16px)
- **Font-weight:** 400
- **Color:** `#2C2C2C` (Charcoal)
- **Line-height:** 1.5
- **Background:** `#FFFFFF`
- **Transition:** border-color 0.2s, box-shadow 0.2s

**Placeholder:**
- **Color:** `#B0B0B0` (Light gray)
- **Font-size:** 1rem
- **Opacity:** 1.0 (avoid browser opacity reduction)

**Focus State:**
- **Border:** `2px solid #8B3A3A` (Maroon, 2px)
- **Box-shadow:** `0 0 0 3px rgba(139, 58, 58, 0.1)`
- **Outline:** none

**Disabled State:**
- **Background:** `#F5F5F5`
- **Border:** `1px solid #E8E8E8`
- **Color:** `#999999`
- **Cursor:** not-allowed

**Error State:**
- **Border:** `2px solid #F44336` (Error red)
- **Background:** `#FFF5F5` (Light red)
- **Color:** `#2C2C2C`

**data-testid:** `input-[fieldname]` (e.g., `input-email`, `input-password`)

### Error Message
**Component:** `ErrorMessage`

```
┌─────────────────────────────┐
│ [input field]               │
│ Email is required           │ ← Error text
└─────────────────────────────┘
```

**CSS Properties:**
- **Font-size:** 0.875rem (14px)
- **Font-weight:** 400
- **Color:** `#F44336` (Error red)
- **Margin-top:** 4px (xs)
- **Display:** block
- **Aria-live:** polite

**data-testid:** `error-[fieldname]`

### Submit Button (Primary)
**Component:** `PrimaryButton`

```
┌─────────────────────────────┐
│      Sign In ➜              │
└─────────────────────────────┘
```

**CSS Properties (Default State):**
- **Width:** 100%
- **Padding:** 12px 16px
- **Background:** `#8B3A3A` (Maroon)
- **Color:** `#FFFFFF` (White)
- **Border:** none
- **Border-radius:** 4px
- **Font-size:** 1rem (16px)
- **Font-weight:** 700
- **Line-height:** 1.5
- **Cursor:** pointer
- **Box-shadow:** `0 2px 4px rgba(0,0,0,0.2)`
- **Transition:** background 0.2s, box-shadow 0.2s
- **Min-height:** 44px (touch target)

**Hover State:**
- **Background:** `#6B2C2C` (Darker Maroon)
- **Box-shadow:** `0 4px 8px rgba(0,0,0,0.3)`

**Active State:**
- **Background:** `#5A1F1F` (Even darker Maroon)
- **Box-shadow:** `0 1px 2px rgba(0,0,0,0.2)`

**Loading State:**
- **Background:** `#8B3A3A` (unchanged)
- **Content:** Spinner icon (animated) + "Loading..."
- **Cursor:** not-allowed
- **Pointer-events:** none

**Disabled State:**
- **Background:** `#E8E8E8` (Light Gray)
- **Color:** `#6B6B6B` (Stone Gray)
- **Cursor:** not-allowed
- **Box-shadow:** none

**data-testid:** `button-[action]` (e.g., `button-sign-in`, `button-register`)

### Secondary Button (Outlined)
**Component:** `SecondaryButton`

```
┌─────────────────────────────┐
│      ← Back                 │
└─────────────────────────────┘
```

**CSS Properties (Default State):**
- **Width:** 100%
- **Padding:** 12px 16px
- **Background:** `#FFFFFF` (White)
- **Color:** `#8B3A3A` (Maroon)
- **Border:** `2px solid #8B3A3A`
- **Border-radius:** 4px
- **Font-size:** 1rem (16px)
- **Font-weight:** 700
- **Cursor:** pointer
- **Transition:** background 0.2s, color 0.2s

**Hover State:**
- **Background:** `#F5F5F5` (Light Gray)
- **Color:** `#6B2C2C` (Darker Maroon)
- **Border-color:** `#6B2C2C`

**data-testid:** `button-[action]`

### Text Link Button
**Component:** `TextLink`

```
Forgot Password?
```

**CSS Properties (Default State):**
- **Background:** none
- **Border:** none
- **Color:** `#8B3A3A` (Maroon)
- **Font-size:** 1rem (16px)
- **Font-weight:** 400
- **Text-decoration:** none
- **Cursor:** pointer
- **Padding:** 0
- **Transition:** color 0.2s, text-decoration 0.2s

**Hover State:**
- **Color:** `#6B2C2C` (Darker Maroon)
- **Text-decoration:** underline

**data-testid:** `link-[action]`

### Divider
**Component:** `Divider`

```
────────── or ──────────
```

**CSS Properties:**
- **Width:** 100%
- **Height:** 1px
- **Background:** `#E8E8E8`
- **Margin:** 24px 0 (lg)
- **Position:** relative
- **Display:** flex
- **Align-items:** center
- **Justify-content:** center

**Text (if "or"):**
- **Font-size:** 0.875rem (14px)
- **Font-weight:** 400
- **Color:** `#6B6B6B` (Stone Gray)
- **Background:** `#FFFFFF`
- **Padding:** 0 8px (sm)
- **Position:** absolute

**data-testid:** `divider`

---

## SCREEN 1: LOGIN SCREEN

**URL:** `/auth/student/login` or `/auth/coach/login`

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│  Sign In                                │
│  Enter your email and password          │
│  to access your account.                │
│                                         │
│  Email *                                │
│  [email input]                          │
│  [error message if present]             │
│                                         │
│  Password *                             │
│  [password input]                       │
│  [error message if present]             │
│                                         │
│  [Sign In ➜]                            │
│                                         │
│  [Forgot Password?]                     │
│                                         │
│  ─── or ───                             │
│                                         │
│  Don't have an account?                 │
│  [Create Account]                       │
│                                         │
└─────────────────────────────────────────┘
```

### Components

#### Header
- **Title:** "Sign In" (or "Coach Sign In" for coach login)
- **Subtitle:** "Enter your email and password to access your account."
- **data-testid:** `auth-header-title`, `auth-header-subtitle`

#### Email Field
- **Label:** "Email *"
- **Type:** email
- **Placeholder:** "your@email.com"
- **data-testid:** `input-email`

**Validation:**
- Required (empty) → "Email is required"
- Invalid format → "Please enter a valid email"
- data-testid: `error-email`

#### Password Field
- **Label:** "Password *"
- **Type:** password
- **Placeholder:** "Enter password"
- **data-testid:** `input-password`

**Validation:**
- Required (empty) → "Password is required"
- data-testid: `error-password`

#### Buttons & Links

1. **[Sign In ➜]**
   - **Type:** Primary Button
   - **Width:** 100%
   - **Margin-top:** 24px (lg)
   - **Margin-bottom:** 16px (md)
   - **data-testid:** `button-sign-in`
   - **On click:**
     - Validate email and password are non-empty
     - POST to `/api/auth/login` with email + password
     - On success: Navigate to `/grit-fit/results` or `/coach/dashboard` (depends on user_type)
     - On error: Show generic error "Invalid email or password" in toast or below button
     - Loading state: Show spinner + "Signing in..."

2. **[Forgot Password?]**
   - **Type:** Text Link
   - **Alignment:** Left-aligned
   - **Margin-top:** 8px (sm)
   - **data-testid:** `link-forgot-password`
   - **On click:** Navigate to `/auth/forgot-password`

3. **Divider**
   - **Text:** "or"
   - **Margin:** 24px 0 (lg)
   - **data-testid:** `divider`

4. **[Create Account]** (Student login only) or **[Register as Coach]** (Coach login only)
   - **Type:** Text Link
   - **Text before link:** "Don't have an account?" or "Don't have an account?"
   - **Alignment:** Center
   - **data-testid:** `link-create-account`
   - **On click:** Navigate to `/auth/student/signup` or `/auth/coach/signup`

### Mobile Responsive Notes

- **Card width:** 90vw, 20px margin sides
- **Input font-size:** 16px (prevents iOS zoom)
- **Touch targets:** All buttons and links are 44px min-height
- **Spacing:** Single-column layout, full-width inputs

---

## SCREEN 2: REGISTER SCREEN (SEEDED ACCOUNTS ONLY)

**URL:** `/auth/student/signup` or `/auth/coach/signup`

This is NOT a traditional signup. The MVP uses seeded accounts only. The register screen shows a message explaining account activation is by invitation only.

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│  Account Activation Required            │
│                                         │
│  Account activation is by invitation    │
│  only. If you were given credentials    │
│  by your coach or school, please        │
│  contact them to activate your          │
│  account.                               │
│                                         │
│  [questions or assistance]              │
│  Contact: support@grittyfb.com          │
│                                         │
│  ─── or ───                             │
│                                         │
│  Have an account?                       │
│  [Sign In]                              │
│                                         │
└─────────────────────────────────────────┘
```

### Components

#### Header
- **Title:** "Account Activation Required"
- **Subtitle:** "Account activation is by invitation only. If you were given credentials by your coach or school, please contact them to activate your account."
- **data-testid:** `auth-header-title`, `auth-header-subtitle`

#### Info Section
- **Label:** "[questions or assistance]"
- **Text:** "Contact: support@grittyfb.com"
- **Font-size:** 0.875rem (14px)
- **Color:** `#6B6B6B` (Stone Gray)
- **Margin-top:** 16px (md)
- **data-testid:** `info-contact`

#### Links

1. **[Sign In]**
   - **Type:** Text Link
   - **Text before link:** "Have an account?"
   - **Alignment:** Center
   - **Margin-top:** 24px (lg)
   - **data-testid:** `link-sign-in`
   - **On click:** Navigate to `/auth/student/login` or `/auth/coach/login`

### Logic Notes

- **This screen is not a functional form.** It's an informational screen displayed when:
  - User tries to create a new account via direct URL access
  - User's invite code is invalid or expired
  - User is navigated here from an invitation email flow (Phase 2)
- **No form submission.** Only navigation links available.

---

## SCREEN 3: PENDING ACTIVATION SCREEN

**URL:** `/auth/pending-activation`

Shown when a user with an active auth session has account_status = 'pending_activation' in the users table.

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│  Account Pending Activation             │
│                                         │
│  Your account is awaiting activation    │
│  from an administrator. You will        │
│  receive an email when your account     │
│  is ready to use.                       │
│                                         │
│  Status: Pending                        │
│  Email sent to: student@example.com     │
│                                         │
│  Didn't receive an email?               │
│  [Resend Activation Email]              │
│                                         │
│  ─── or ───                             │
│                                         │
│  [Sign Out]                             │
│                                         │
└─────────────────────────────────────────┘
```

### Components

#### Header
- **Title:** "Account Pending Activation"
- **Subtitle:** "Your account is awaiting activation from an administrator. You will receive an email when your account is ready to use."
- **data-testid:** `auth-header-title`, `auth-header-subtitle`

#### Status Section
- **Label:** "Status:"
- **Value:** "Pending"
- **Font-size:** 1rem (16px)
- **Color:** `#FF9800` (Warning orange)
- **Margin-top:** 16px (md)
- **data-testid:** `status-activation`

#### Email Confirmation
- **Label:** "Email sent to:"
- **Value:** "[user's email address]"
- **Font-size:** 0.875rem (14px)
- **Color:** `#6B6B6B` (Stone Gray)
- **Margin-top:** 8px (sm)
- **data-testid:** `info-email-address`

#### Buttons & Links

1. **[Resend Activation Email]**
   - **Type:** Secondary Button
   - **Width:** 100%
   - **Margin-top:** 24px (lg)
   - **data-testid:** `button-resend-activation`
   - **On click:**
     - POST to `/api/auth/resend-activation-email` with user_id
     - On success: Show toast "Activation email sent. Check your inbox."
     - On error: Show error toast "Failed to resend email. Contact support."
     - Disable button for 60 seconds after click

2. **Divider**
   - **Text:** "or"
   - **Margin:** 24px 0 (lg)
   - **data-testid:** `divider`

3. **[Sign Out]**
   - **Type:** Text Link
   - **Alignment:** Center
   - **data-testid:** `link-sign-out`
   - **On click:**
     - Clear session (Supabase signOut())
     - Clear local storage
     - Navigate to `/`
     - Show toast "You've been signed out"

### Logic Notes

- **This screen is shown during session restore** if:
  - User has active session (getSession() returns session)
  - users.account_status = 'pending_activation'
- **Shown instead of dashboard or GRIT FIT results**
- **User cannot access app features** until account_status is changed to 'active'

---

## SCREEN 4: EMAIL VERIFICATION SCREEN

**URL:** `/auth/verify-email`

Shown when a user has created an auth account but has not yet verified their email. (Phase 1 MVP may skip this; included for Phase 1b planning.)

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│  Verify Your Email                      │
│                                         │
│  We've sent a verification link to      │
│  your email address. Click the link     │
│  to confirm your email and activate     │
│  your account.                          │
│                                         │
│  Email: student@example.com             │
│                                         │
│  [Resend Verification Email]            │
│                                         │
│  Verification link expires in:          │
│  ⏱ 24 hours                             │
│                                         │
│  ─── or ───                             │
│                                         │
│  [Sign Out]                             │
│                                         │
└─────────────────────────────────────────┘
```

### Components

#### Header
- **Title:** "Verify Your Email"
- **Subtitle:** "We've sent a verification link to your email address. Click the link to confirm your email and activate your account."
- **data-testid:** `auth-header-title`, `auth-header-subtitle`

#### Email Display
- **Label:** "Email:"
- **Value:** "[user's email]"
- **Font-size:** 1rem (16px)
- **Color:** `#2C2C2C` (Charcoal)
- **Margin-top:** 16px (md)
- **data-testid:** `info-email-address`

#### Buttons & Links

1. **[Resend Verification Email]**
   - **Type:** Secondary Button
   - **Width:** 100%
   - **Margin-top:** 24px (lg)
   - **data-testid:** `button-resend-verification`
   - **On click:**
     - POST to `/api/auth/resend-verification-email` with user_id
     - On success: Show toast "Verification email sent. Check your inbox."
     - On error: Show error toast "Failed to send email. Try again later."
     - Disable button for 60 seconds

2. **Expiration Timer**
   - **Label:** "Verification link expires in:"
   - **Value:** "⏱ 24 hours" (or countdown)
   - **Font-size:** 0.875rem (14px)
   - **Color:** `#FF9800` (Warning orange)
   - **Margin-top:** 16px (md)
   - **data-testid:** `timer-verification`

3. **Divider**
   - **Text:** "or"
   - **Margin:** 24px 0 (lg)
   - **data-testid:** `divider`

4. **[Sign Out]**
   - **Type:** Text Link
   - **Alignment:** Center
   - **data-testid:** `link-sign-out`
   - **On click:**
     - Clear session
     - Navigate to `/`

### Logic Notes

- **Shown during session restore** if:
  - User has active session
  - Supabase auth.email_confirmed = false
  - Account has not been activated yet
- **Automatic redirect:** If user clicks link in email, Supabase handles verification and redirects to `/grit-fit/results` or `/coach/dashboard`

---

## GLOBAL ERROR HANDLING

### Server-Side Error Messages

**Generic errors (shown in toast or inline):**
- **"Invalid email or password"** — For login failures (do not reveal if email exists)
- **"Email is required"** — For empty email field
- **"Password is required"** — For empty password field
- **"Please enter a valid email"** — For malformed email
- **"An error occurred. Please try again later."** — For unexpected server errors

### Client-Side Error States

**Error toast (top-right, auto-dismiss after 5s):**
- **Background:** `#FFF5F5` (Light red)
- **Border:** `1px solid #F44336` (Error red)
- **Text color:** `#C62828` (Dark red)
- **Icon:** Red error icon
- **data-testid:** `toast-error`

**Inline error messages (below input field):**
- **Font-size:** 0.875rem (14px)
- **Color:** `#F44336` (Error red)
- **Margin-top:** 4px (xs)
- **Aria-live:** polite
- **data-testid:** `error-[fieldname]`

---

## RESPONSIVE DESIGN

### Desktop (≥ 1024px)
- **Auth card:** Fixed 400px width, centered
- **Inputs:** Full-width within card (352px)
- **Buttons:** Full-width
- **Font sizes:** As specified above

### Tablet (768px – 1023px)
- **Auth card:** 90vw width (max 400px)
- **Spacing:** Slightly reduced (lg = 20px instead of 24px)
- **Everything else:** Same as desktop

### Mobile (< 768px)
- **Auth card:** 90vw width, 20px margin sides
- **Padding:** 24px instead of 32px
- **Input font-size:** 16px (prevents iOS zoom on focus)
- **Touch targets:** Minimum 44px × 44px (all buttons, links)
- **Spacing:** Reduced (md = 12px, lg = 16px)
- **Text:** Body text reduced by 1px on mobile
- **Layout:** Single column, all elements full-width

**Example mobile adjustments:**
```css
@media (max-width: 767px) {
  .auth-card {
    width: 90vw;
    padding: 24px;
  }

  input, button {
    font-size: 16px;
  }

  .form-field {
    margin-bottom: 12px;
  }
}
```

---

## ACCESSIBILITY

### Focus Management
- **Tab order:** Top-to-bottom, left-to-right
- **Focus indicator:** 2px outline at `#8B3A3A` with 2px offset
- **Skip links:** None needed for auth screens

### Color & Contrast
- **Text:** Minimum 4.5:1 contrast ratio (WCAG AA)
- **UI components:** Minimum 3:1 contrast ratio
- **Buttons & links:** Never rely on color alone; use text + icon if applicable

### ARIA Labels & Descriptions
- **Error messages:** aria-live="polite" for real-time announcement
- **Password strength:** aria-describedby linking to strength text
- **Links:** aria-label for clarity (e.g., "Forgot password link")
- **Disabled buttons:** aria-disabled="true"
- **Loading state:** aria-busy="true" during submission

### Mobile Keyboard
- **Email input:** type="email" → native email keyboard
- **Password input:** type="password" → native password keyboard
- **Zoom prevention:** font-size: 16px on input elements (iOS)
- **Tap targets:** Minimum 44px × 44px

---

## DATA ATTRIBUTES FOR QA (Quin)

All interactive elements must have `data-testid` attributes for regression testing:

**Form fields:**
- `input-email`
- `input-password`
- `input-confirm-password`

**Error messages:**
- `error-email`
- `error-password`
- `error-confirm-password`

**Buttons:**
- `button-sign-in`
- `button-register` (Phase 2)
- `button-resend-activation`
- `button-resend-verification`

**Links:**
- `link-forgot-password`
- `link-create-account`
- `link-sign-in`
- `link-sign-out`

**Containers:**
- `auth-page-layout`
- `auth-card`
- `form-field-[fieldname]`
- `label-[fieldname]`

**Messages & Status:**
- `auth-header-title`
- `auth-header-subtitle`
- `status-activation`
- `info-email-address`
- `info-contact`
- `timer-verification`
- `divider`
- `toast-error`

---

## IMPLEMENTATION CHECKLIST

- [ ] AuthPageLayout component (full-height flex container)
- [ ] AuthCard component (400px card with shadow)
- [ ] AuthHeader component (title + subtitle)
- [ ] FormField wrapper component
- [ ] Label component (with required indicator)
- [ ] TextInput component (email, text, with focus/error states)
- [ ] PasswordInput component (with visibility toggle)
- [ ] PrimaryButton component (Maroon, full-width)
- [ ] SecondaryButton component (outlined Maroon)
- [ ] TextLink component (no border, hover underline)
- [ ] Divider component (with optional "or" text)
- [ ] ErrorMessage component (red, below field)
- [ ] Toast notification system (error, success, info, warning)
- [ ] Login screen page component
- [ ] Register info screen page component
- [ ] Pending activation screen page component
- [ ] Email verification screen page component
- [ ] Responsive styles (@media queries for mobile)
- [ ] All data-testid attributes assigned
- [ ] ARIA labels and roles implemented
- [ ] Keyboard navigation tested
- [ ] Touch targets verified (44px minimum)

---

## APPROVAL GATE

This spec is ready for Nova implementation.

**Sign-off:**
- [x] Quill (UX design, layout, responsive behavior, accessibility)
- [ ] Nova (component implementation, styling)
- [ ] Quin (test plan and automation coverage)

---

*Login & Register UX Spec v1.0 — Production Ready. Nova implements exactly as written.*
