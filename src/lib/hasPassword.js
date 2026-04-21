// Sprint 001 D2 — "Has Password" derivation.
// Returns true when the auth.users row has a non-empty encrypted_password.

export function hasPassword(authUser) {
  if (!authUser || typeof authUser !== 'object') return false;
  const pw = authUser.encrypted_password;
  if (typeof pw !== 'string') return false;
  return pw.trim().length > 0;
}
