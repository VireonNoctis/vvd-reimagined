"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CardMediaAsset } from "@/domain/world";

type Props = {
  worldSlug: string;
  documentId: string;
  initialAssets: CardMediaAsset[];
};

function endpoint(worldSlug: string): string {
  return "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const result = await response.json().catch(() => ({})) as { error?: string };
  return result.error || fallback;
}

function Preview({ worldSlug, asset }: { worldSlug: string; asset: CardMediaAsset }) {
  const src = endpoint(worldSlug) + "/" + encodeURIComponent(asset.id) + "/download";
  if (asset.contentType.startsWith("image/")) {
    return <Image src={src} alt={asset.fileName} width={320} height={220} unoptimized />;
  }
  return (
    <a className="card-media-file" href={src} target="_blank" rel="noreferrer">
      <span>{asset.contentType.startsWith("video/") ? "VIDEO" : "AUDIO"}</span>
      <strong>Open file</strong>
    </a>
  );
}

export function CardMediaManager({ worldSlug, documentId, initialAssets }: Props) {
  const [attached, setAttached] = useState(initialAssets);
  const [available, setAvailable] = useState<CardMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(endpoint(worldSlug), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "The Gallery could not be loaded."));
        return await response.json() as CardMediaAsset[];
      })
      .then((assets) => {
        setAvailable(assets.filter((asset) => asset.documentId === null));
        setError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "The Gallery could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [worldSlug]);

  async function attach(asset: CardMediaAsset) {
    setBusyId(asset.id);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" +
          encodeURIComponent(documentId) + "/media/" + encodeURIComponent(asset.id),
        { method: "POST" }
      );
      if (!response.ok) throw new Error(await responseError(response, "This media could not be attached."));
      const result = await response.json() as CardMediaAsset;
      setAttached((current) => [...current.filter((item) => item.id !== result.id), result]);
      setAvailable((current) => current.filter((item) => item.id !== result.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This media could not be attached.");
    } finally {
      setBusyId("");
    }
  }

  async function detach(asset: CardMediaAsset) {
    setBusyId(asset.id);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" +
          encodeURIComponent(documentId) + "/media/" + encodeURIComponent(asset.id),
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error(await responseError(response, "This media could not be detached."));
      setAttached((current) => current.filter((item) => item.id !== asset.id));
      setAvailable((current) => [{ ...asset, documentId: null }, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This media could not be detached.");
    } finally {
      setBusyId("");
    }
  }

  const mediaLibrary = "/worlds/" + encodeURIComponent(worldSlug) + "/media";

  return (
    <section className="card-media-manager" aria-labelledby="card-media-heading">
      <div className="card-media-heading">
        <div>
          <span className="eyebrow">PRIVATE GALLERY</span>
          <h3 id="card-media-heading">Attachments <small>{attached.length}</small></h3>
        </div>
        <Link href={mediaLibrary}>Open Gallery ↗</Link>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      {attached.length > 0 ? (
        <div className="card-media-list">
          {attached.map((asset) => (
            <article className="card-media-item" key={asset.id}>
              <div className="card-media-preview">
                <Preview worldSlug={worldSlug} asset={asset} />
              </div>
              <div className="card-media-copy">
                <strong title={asset.fileName}>{asset.fileName}</strong>
                <span>{asset.contentType} · {formatSize(asset.sizeBytes)}</span>
                <button
                  className="text-link"
                  type="button"
                  onClick={() => void detach(asset)}
                  disabled={Boolean(busyId)}
                >{busyId === asset.id ? "Removing…" : "Detach"}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="card-media-empty">No media attached to this record yet.</p>
      )}

      <div className="card-media-available">
        <span className="eyebrow">UNASSIGNED MEDIA</span>
        {loading ? (
          <p className="card-media-empty">Loading Gallery…</p>
        ) : available.length > 0 ? (
          <div className="card-media-available-list">
            {available.map((asset) => (
              <div className="card-media-available-item" key={asset.id}>
                <span>{asset.contentType.startsWith("image/") ? "IMAGE" : asset.contentType.startsWith("video/") ? "VIDEO" : "AUDIO"}</span>
                <strong title={asset.fileName}>{asset.fileName}</strong>
                <button
                  className="editor-secondary-button"
                  type="button"
                  onClick={() => void attach(asset)}
                  disabled={Boolean(busyId)}
                >{busyId === asset.id ? "Attaching…" : "Attach"}</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="card-media-empty">Nothing available. Add files to the <Link href={mediaLibrary}>private Gallery</Link> first.</p>
        )}
      </div>
    </section>
  );
}
