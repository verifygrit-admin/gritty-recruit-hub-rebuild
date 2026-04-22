/**
 * homeCopy — Sprint 004 Wave 2 (H1).
 *
 * Operator-editable copy for the Student Home welcome header.
 * Template function pattern — safer for downstream use (escapes, substitution).
 */

// Sprint 004 Phase 1 F1: second line ends with '.' (period), NOT '!'.
// Spec: first line ends with '!'; second line ends with '.'.
export const WELCOME_HEADER_TEMPLATE =
  'Welcome back, [First Name]!\nYour results are in! Check out your GRIT FIT matches and update your college football Short List.';

/**
 * Returns the welcome header with [First Name] substituted.
 * @param {string} firstName
 * @returns {string}
 */
export function welcomeHeader(firstName) {
  return WELCOME_HEADER_TEMPLATE.replace('[First Name]', firstName);
}
