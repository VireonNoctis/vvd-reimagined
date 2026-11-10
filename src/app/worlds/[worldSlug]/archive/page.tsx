import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveList } from "@/components/workspace/archive-list";
import { Icon } from "@/components/ui/icon";
import { apiConfigured, apiRequest, requireAccount } from "@/server/api";
import { worldRepository } from "@/server/worlds/repository";

type Props = { params: Promise<{ worldSlug: string }> };
type ArchivedDocument = {
  id: string;
  name: string;
  entityType: "character" | "place" | "faction";
  version: number;
  archivedAt: string;
};

export default async function WorldArchivePage({ params }: Props) {
  if (!apiConfigured) notFound();
  await requireAccount();
  const { worldSlug } = await params;
  const world = await worldRepository.findBySlug(worldSlug);
  if (!world) notFound();

  const archived = await apiRequest<ArchivedDocument[]>(
    "/v1/worlds/" + encodeURIComponent(worldSlug) + "/archive"
  );

  return (
    <main className="archive-page">
      <header className="archive-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="Back to worlds">v</Link>
        <Link className="text-link" href={"/worlds/" + encodeURIComponent(worldSlug)}><Icon name="arrow-left" size={14} /> Back to {world.name}</Link>
      </header>
      <section className="archive-content">
        <span className="eyebrow">WORLD / {world.name.toUpperCase()}</span>
        <h1>Archive.</h1>
        <p>Archived records stay part of the world and can be restored without losing their history or references.</p>
        <ArchiveList worldSlug={worldSlug} initialItems={archived} />
      </section>
      <footer className="worlds-footer"><span>VVD REIMAGINED</span><span>WORLD ARCHIVE</span></footer>
    </main>
  );
}
