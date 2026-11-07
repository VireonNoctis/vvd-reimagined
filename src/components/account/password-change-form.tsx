"use client";

import { useState, type FormEvent } from "react";

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Use between 12 and 128 characters for your new password.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Your password could not be changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      window.dispatchEvent(new Event("vvd:sessions-changed"));
      setSuccess("Password changed. Other browsers have been signed out.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="password-change-form" onSubmit={submit}>
      <label>
        <span>Current password</span>
        <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" maxLength={128} required disabled={busy} />
      </label>
      <label>
        <span>New password</span>
        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} />
        <small>12–128 characters. Choose one you do not use elsewhere.</small>
      </label>
      <label>
        <span>Confirm new password</span>
        <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} />
      </label>
      {error && <p className="account-form-error" role="alert">{error}</p>}
      {success && <p className="account-form-success" role="status">{success}</p>}
      <button className="security-primary-button" type="submit" disabled={busy || !currentPassword || !newPassword || !confirmation}>
        {busy ? "Updating password…" : "Update password"}<span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
