"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateWorldForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/v1/worlds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, genre })
      });
      const body = await response.json().catch(() => ({})) as { slug?: string; error?: string };
      if (!response.ok || !body.slug) throw new Error(body.error || "The world could not be created.");
      router.replace("/worlds/" + body.slug);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The world could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="world-create-form" onSubmit={submit}>
      <label><span>World name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required autoFocus /></label>
      <label><span>Genre or setting</span><input value={genre} onChange={(event) => setGenre(event.target.value)} maxLength={80} placeholder="Fantasy, science fiction, alternate history…" /></label>
      <label><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="A few lines about this world." /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="world-create-actions">
        <button className="text-link" type="button" onClick={() => router.back()}>Cancel</button>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Creating…" : "Create world"} <span aria-hidden="true">↗</span></button>
      </div>
    </form>
  );
}
