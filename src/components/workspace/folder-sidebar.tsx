"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { CardDocument } from "@/domain/world";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  worldSlug: string;
  document: CardDocument | null;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
};

async function responseError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

export function FolderSidebar({ worldSlug, document, selectedFolderId, onSelectFolder }: Props) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingParentId, setEditingParentId] = useState("");
  const [moveFolderId, setMoveFolderId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/folders", { cache: "no-store" });
        if (!response.ok) throw new Error(await responseError(response, "Folders could not be loaded."));
        const result = await response.json() as Folder[];
        if (active) setFolders(result);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Folders could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [worldSlug]);

folder move state effect  const options = useMemo(() => {
    const result: { id: string; label: string }[] = [];
    const append = (parent: string | null, depth: number) => {
      folders
        .filter((folder) => folder.parentId === parent)
        .sort((left, right) => left.name.localeCompare(right.name))
        .forEach((folder) => {
          result.push({ id: folder.id, label: "— ".repeat(depth) + folder.name });
          append(folder.id, depth + 1);
        });
    };
    append(null, 0);
    return result;
  }, [folders]);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, parentId: parentId || null })
      });
      if (!response.ok) throw new Error(await responseError(response, "Folder could not be created."));
      const folder = await response.json() as Folder;
      setFolders((current) => [...current, folder]);
      setName("");
      setParentId("");
      setCreating(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Folder could not be created.");
    } finally {
      setSaving(false);
    }
  }

  function editFolder(folder: Folder) {
    setEditingId(folder.id);
    setEditingName(folder.name);
    setEditingParentId(folder.parentId ?? "");
    setError("");
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const folder = folders.find((item) => item.id === editingId);
    if (!folder) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/folders/" + encodeURIComponent(folder.id), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editingName, parentId: editingParentId || null })
      });
      if (!response.ok) throw new Error(await responseError(response, "Folder could not be updated."));
      const updated = await response.json() as Folder;
      setFolders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Folder could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFolder(folder: Folder) {
    if (!window.confirm("Delete this empty folder? Move its records and child folders first.")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/folders/" + encodeURIComponent(folder.id), { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response, "Folder could not be deleted."));
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      if (selectedFolderId === folder.id) onSelectFolder(null);
      if (editingId === folder.id) setEditingId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Folder could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  async function moveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" + encodeURIComponent(document.id) + "/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: document.version, folderId: moveFolderId || null })
      });
      if (!response.ok) throw new Error(await responseError(response, "Record could not be moved."));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Record could not be moved.");
    } finally {
      setSaving(false);
    }
  }

  function renderTree(parent: string | null, depth: number): ReactNode {
    return folders
      .filter((folder) => folder.parentId === parent)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((folder) => (
        <div className="folder-tree-item" key={folder.id}>
          <div className="folder-tree-row" style={{ paddingLeft: 6 + depth * 12 }}>
            <button
              className={"folder-tree-select" + (selectedFolderId === folder.id ? " selected" : "")}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              aria-current={selectedFolderId === folder.id ? "true" : undefined}
            >
              <Icon name="folder" size={13} /><span>{folder.name}</span>
            </button>
            <button className="folder-tree-action" type="button" title="Edit folder" aria-label={"Edit " + folder.name} onClick={() => editFolder(folder)} disabled={saving}><Icon name="edit" size={12} /></button>
            <button className="folder-tree-action" type="button" title="Delete empty folder" aria-label={"Delete " + folder.name} onClick={() => void deleteFolder(folder)} disabled={saving}><Icon name="trash" size={12} /></button>
          </div>
          {editingId === folder.id && (
            <form className="folder-inline-form" onSubmit={(event) => void saveFolder(event)}>
              <input aria-label="Folder name" value={editingName} maxLength={80} onChange={(event) => setEditingName(event.target.value)} required />
              <select aria-label="Parent folder" value={editingParentId} onChange={(event) => setEditingParentId(event.target.value)}>
                <option value="">Top level</option>
                {options.filter((option) => option.id !== folder.id).map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
              </select>
              <div><button type="submit" disabled={saving}>Save</button><button type="button" onClick={() => setEditingId("")}>Cancel</button></div>
            </form>
          )}
          {renderTree(folder.id, depth + 1)}
        </div>
      ));
  }

  return (
    <section className="folder-navigation" aria-label="Folder navigation">
      <div className="folder-navigation-heading">
        <span>FOLDERS</span>
        <button type="button" onClick={() => setCreating((value) => !value)} aria-expanded={creating} title="Create folder"><Icon name="plus" size={13} /></button>
      </div>
      <button className={"folder-tree-select folder-all" + (!selectedFolderId ? " selected" : "")} type="button" onClick={() => onSelectFolder(null)}>
        <Icon name="files" size={13} /><span>All records</span>
      </button>
      {loading ? <p className="folder-hint">Loading folders…</p> : folders.length ? <div className="folder-tree">{renderTree(null, 0)}</div> : <p className="folder-hint">Keep cards organised with nested folders.</p>}
      {creating && (
        <form className="folder-create-form" onSubmit={(event) => void createFolder(event)}>
          <input aria-label="New folder name" placeholder="Folder name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required />
          <select aria-label="Parent folder" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">Top level</option>
            {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
          <div><button type="submit" disabled={saving}>Create folder</button><button type="button" onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      )}
      {document && (
        <form className="folder-move-form" onSubmit={(event) => void moveDocument(event)}>
          <label htmlFor="document-folder-target">Move selected record</label>
          <select id="document-folder-target" value={moveFolderId} onChange={(event) => setMoveFolderId(event.target.value)}>
            <option value="">No folder</option>
            {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
          <button type="submit" disabled={saving || moveFolderId === (document.folderId ?? "")}>{saving ? "Saving…" : "Move record"}</button>
        </form>
      )}
      {error && <p className="folder-error" role="alert">{error}</p>}
    </section>
  );
}
