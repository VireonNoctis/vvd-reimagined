import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/account/password-change-form";
import { SessionManager } from "@/components/account/session-manager";
import { SecurityEventLog } from "@/components/account/security-event-log";
import { apiConfigured, requireAccount } from "@/server/api";

export default async function AccountSecurityPage() {
  if (!apiConfigured) redirect("/");
  const account = await requireAccount();
  if (!account) redirect("/login");
  const initials = account.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  return (
    <main className="auth-page security-page">
      <header className="auth-topbar security-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
        <div className="security-topbar-actions">
          <span className="security-live"><i /> Account controls</span>
          <Link className="text-link auth-back-link" href="/">Back to worlds <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <div className="account-security-panel">
        <section className="security-intro">
          <span className="eyebrow">ACCOUNT / SECURITY</span>
          <h1>Keep your space yours.</h1>
          <p>Manage the devices that can reach your worlds and keep your sign-in details current.</p>
          <div className="security-identity">
            <span className="security-avatar">{initials || "V"}</span>
            <span><strong>{account.displayName}</strong><small>{account.email}</small></span>
            <span className="security-identity-mark"><i /> Signed in</span>
          </div>
        </section>

        <section className="security-overview" aria-label="Security overview">
          <article className="security-overview-card is-ready">
            <span className="security-card-mark">01</span>
            <div><span className="eyebrow">DEVICE ACCESS</span><strong>Session controls</strong><small>Review and end signed-in browsers.</small></div>
            <span className="security-card-state"><i /> Active</span>
          </article>
          <article className="security-overview-card">
            <span className="security-card-mark">02</span>
            <div><span className="eyebrow">SIGN-IN</span><strong>Password</strong><small>Change it with your current password.</small></div>
            <span className="security-card-state">Available</span>
          </article>
          <article className="security-overview-card is-pending">
            <span className="security-card-mark">03</span>
            <div><span className="eyebrow">ADDITIONAL PROTECTION</span><strong>Email recovery & MFA</strong><small>These controls are not configured yet.</small></div>
            <span className="security-card-state">Not enabled</span>
          </article>
        </section>

        <div className="security-settings-grid">
          <section className="security-settings-card password-settings">
            <div className="security-section-heading">
              <div><span className="eyebrow">SIGN-IN DETAILS</span><h2>Change password</h2></div>
              <span className="security-section-index">01 / 02</span>
            </div>
            <p className="security-section-copy">Your current password is required before a new one can be saved. Other browsers will be signed out automatically.</p>
            <PasswordChangeForm />
          </section>
          <section className="security-settings-card sessions-settings">
            <div className="security-section-heading">
              <div><span className="eyebrow">DEVICE ACCESS</span><h2>Your sessions</h2></div>
              <span className="security-section-index">02 / 02</span>
            </div>
            <p className="security-section-copy">See where your account is signed in. End one session or all other sessions without affecting this browser.</p>
            <SessionManager />
          </section>
        </div>

        <SecurityEventLog />

        <aside className="security-availability-note">
          <span className="security-note-mark">i</span>
          <p><strong>Recovery and two-step verification are not available yet.</strong> This build does not send recovery email or enroll authenticator apps. Do not rely on an unconfigured recovery method.</p>
        </aside>
      </div>
      <footer className="auth-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
    </main>
  );
}
