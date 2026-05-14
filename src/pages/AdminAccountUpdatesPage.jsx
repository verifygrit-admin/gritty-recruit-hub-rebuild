// AdminAccountUpdatesPage — Sprint 027.
// Mounts at /admin/account-updates inside the existing AdminRoute guard.
// Wraps AccountUpdatesShell in a local ToastProvider — admin routes do not
// use the global Layout (which is where ToastProvider lives in the rest of
// the app), so the shell needs its own toast scope for selection-cap and
// success/error toasts.

import { ToastProvider } from '../components/Toast.jsx';
import AccountUpdatesShell from '../components/account-updates/AccountUpdatesShell.jsx';

export default function AdminAccountUpdatesPage() {
  return (
    <ToastProvider>
      <AccountUpdatesShell />
    </ToastProvider>
  );
}
