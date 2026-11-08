import { notFound } from "next/navigation";
import { VisualToolWorkspace } from "@/components/visual/visual-tool-workspace";
import type { VisualToolDocument, VisualToolKind } from "@/domain/visual-tools";
import type { CardMediaAsset } from "@/domain/world";
import { worldRepository } from "@/server/worlds/repository";
import { apiConfigured, apiRequest, requireAccount } from "@/server/api";

type Props = {
  params: Promise<{ worldSlug: string; toolKind: string }>;
  searchParams: Promise<{ era?: string | string[] }>;
};

const kinds = new Set<VisualToolKind>(["map", "relation_tree", "canvas", "timeline"]);

export default async function VisualToolPage({ params, searchParams }: Props) {
  await requireAccount();
  const [{ worldSlug, toolKind }, { era }] = await Promise.all([params, searchParams]);
  if (!kinds.has(toolKind as VisualToolKind)) notFound();

  const eraId = Array.isArray(era) ? era[0] : era;
  const world = await worldRepository.findBySlug(worldSlug, eraId);
  if (!world) notFound();

  const kind = toolKind as VisualToolKind;
  const initialDocuments = apiConfigured
    ? await apiRequest<VisualToolDocument[]>(
        "/v1/worlds/" + encodeURIComponent(worldSlug) + "/visual-tools/" + kind
          + "?eraId=" + encodeURIComponent(world.activeEraId)
      )
    : [];
  const gallery = apiConfigured
    ? await apiRequest<CardMediaAsset[]>("/v1/worlds/" + encodeURIComponent(worldSlug) + "/media")
    : [];

  return (
    <VisualToolWorkspace
      key={world.activeEraId + ":" + kind}
      worldSlug={world.slug}
      worldName={world.name}
      activeEraId={world.activeEraId}
      eras={world.eras}
      cards={world.documents}
      media={gallery}
      kind={kind}
      initialDocuments={initialDocuments}
      interactive={apiConfigured}
    />
  );
}
