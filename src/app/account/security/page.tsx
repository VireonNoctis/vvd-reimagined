import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionManager } from "@/components/account/session-manager";
import { apiConfigured, requireAccount } from "@/server/api";

export default async function AccountSecurityPage() {
  if (!apiConfigured) redirect("/");
  const account = await requireAccount();
  if (!account) redirect("/login");

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
        <Link className="text-link auth-back-link" href="/">Back to worlds</Link>
      </header>
      <section className="account-security-panel">
        <span className="eyebrow">ACCOUNT / SECURITY</span>
        <h1>{account.displayName}&apos;s account.</h1>
        <p className="auth-intro">{account.email}</p>
        <SessionManager />
      </section>
      <footer className="auth-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
    </main>
  );
}
