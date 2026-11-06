import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";
import { worldRepository } from "@/server/worlds/repository";
import { apiConfigured, requireAccount } from "@/server/api";

type Props = { params: Promise<{ worldSlug: string }>; searchParams: Promise<{ doc?: string | string[]; era?: string | string[] }> };

export default async function WorldPage({ params, searchParams }: Props) {
  await requireAccount();
  const [{ worldSlug }, { doc, era }] = await Promise.all([params, searchParams]);
  const eraId = Array.isArray(era) ? era[0] : era;
  const world = await worldRepository.findBySlug(worldSlug, eraId);
  if (!world) notFound();

  const documentId = Array.isArray(doc) ? doc[0] : doc;
  const document = world.documents.find((item) => item.id === documentId) ?? world.documents[0] ?? null;

  return <Workspace key={world.activeEraId + ":" + (document?.id ?? "empty-world")} world={world} document={document} interactive={apiConfigured} />;
}