import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { MediaGallery } from "@/components/media/media-gallery";
import { apiConfigured, apiRequest, requireAccount } from "@/server/api";
import { worldRepository } from "@/server/worlds/repository";

type Props = { params: Promise<{ worldSlug: string }> };
type MediaAsset = {
  id: string;
  documentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export default async function WorldMediaPage({ params }: Props) {
  if (!apiConfigured) notFound();
  await requireAccount();
  const { worldSlug } = await params;
  const world = await worldRepository.findBySlug(worldSlug);
  if (!world) notFound();

  const assets = await apiRequest<MediaAsset[]>(
    "/v1/worlds/" + encodeURIComponent(worldSlug) + "/media"
  );

  return (
    <main className="archive-page">
      <header className="archive-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="Back to worlds">v</Link>
        <Link className="text-link" href={"/worlds/" + encodeURIComponent(worldSlug)}><Icon name="arrow-left" size={14} /> Back to {world.name}</Link>
      </header>
      <section className="media-content">
        <span className="eyebrow">WORLD / {world.name.toUpperCase()}</span>
        <h1>Private Gallery.</h1>
        <p>Images, video and audio stay in private object storage. Only members of this world can open them.</p>
        <MediaGallery worldSlug={worldSlug} initialAssets={assets} />
      </section>
      <footer className="worlds-footer"><span>VVD REIMAGINED</span><span>PRIVATE MEDIA</span></footer>
    </main>
  );
}
