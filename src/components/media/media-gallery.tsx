"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

type MediaAsset = {
  id: string;
  documentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type UploadTicket = {
  id: string;
  uploadUrl: string;
  expiresAt: string;
  contentType: string;
};

type Props = { worldSlug: string; initialAssets: MediaAsset[] };

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"
].join(",");

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function endpoint(worldSlug: string, suffix = ""): string {
  return "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media" + suffix;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

function MediaPreview({ worldSlug, asset }: { worldSlug: string; asset: MediaAsset }) {
  const src = endpoint(worldSlug, "/" + encodeURIComponent(asset.id) + "/download");
  if (asset.contentType.startsWith("image/")) {
    return <Image className="media-preview-image" src={src} alt={asset.fileName} width={480} height={320} unoptimized />;
  }
  return (
    <a className="media-file-preview" href={src} target="_blank" rel="noreferrer">
      <span>{asset.contentType.startsWith("video/") ? "VIDEO" : "AUDIO"}</span>
      <strong>Open media</strong>
    </a>
  );
}

export function MediaGallery({ worldSlug, initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = event.currentTarget;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const ticketResponse = await fetch(endpoint(worldSlug, "/uploads"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size
        })
      });
      if (!ticketResponse.ok) throw new Error(await errorMessage(ticketResponse, "An upload could not be created."));
      const ticket = await ticketResponse.json() as UploadTicket;

      const uploadResponse = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": ticket.contentType },
        body: file
      });
      if (!uploadResponse.ok) throw new Error("The storage service rejected the upload. Check its bucket CORS settings.");
      const completeResponse = await fetch(endpoint(worldSlug, "/" + encodeURIComponent(ticket.id) + "/complete"), {
        method: "POST"
      });
      if (!completeResponse.ok) throw new Error(await errorMessage(completeResponse, "The upload could not be verified."));
      const asset = await completeResponse.json() as MediaAsset;
      setAssets((current) => [asset, ...current]);
      setFile(null);
      const input = form.querySelector("input[type=file]") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Added to the private Gallery.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The upload could not be completed.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm("Delete " + asset.fileName + " from this world's private Gallery?")) return;
    setBusyId(asset.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint(worldSlug, "/" + encodeURIComponent(asset.id)), { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessage(response, "This media item could not be deleted."));
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This media item could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="media-gallery">
      <form className="media-upload-form" onSubmit={(event) => void upload(event)}>
        <label className="media-file-picker">
          <span className="eyebrow">ADD TO GALLERY</span>
          <strong>{file ? file.name : "Choose an image, video or audio file"}</strong>
          <small>Images up to 50 MB · Audio up to 60 MB · Video up to 250 MB</small>
          <input type="file" accept={ACCEPTED_TYPES} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="media-upload-button" type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload privately"}
        </button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="media-notice" role="status">{notice}</p>}
      {assets.length ? (
        <div className="media-grid">
          {assets.map((asset) => (
            <article className="media-card" key={asset.id}>
              <div className="media-preview"><MediaPreview worldSlug={worldSlug} asset={asset} /></div>
              <div className="media-card-info">
                <div><strong title={asset.fileName}>{asset.fileName}</strong><span>{asset.contentType} · {formatSize(asset.sizeBytes)}</span></div>
                <button className="session-revoke" type="button" disabled={Boolean(busyId)} onClick={() => void remove(asset)}>
                  {busyId === asset.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="archive-empty media-empty"><span className="eyebrow">PRIVATE BY DEFAULT</span><h2>Your Gallery is empty.</h2><p>Upload media to keep it with this world, away from public object URLs.</p></div>
      )}
    </div>
  );
}
