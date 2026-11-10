import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateWorldForm } from "@/components/worlds/create-world-form";
import { apiConfigured, requireAccount } from "@/server/api";

export default async function NewWorldPage() {
  if (!apiConfigured) redirect("/");
  await requireAccount();

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
        <Link className="text-link auth-back-link" href="/">Back to worlds</Link>
      </header>
      <section className="auth-panel world-create-panel">
        <span className="eyebrow">A NEW PLACE TO BEGIN</span>
        <h1>Give your world a name.</h1>
        <p className="auth-intro">Start with the idea. Shape the details as you build.</p>
        <CreateWorldForm />
      </section>
      <footer className="auth-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
    </main>
  );
}
