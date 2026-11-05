import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";
import { worldRepository } from "@/server/worlds/repository";
import { apiConfigured, requireAccount } from "@/server/api";

type Props = { params: Promise<{ worldSlug: string }>; searchParams: Promise<{ doc?: string | string[] }> };

export default async function WorldPage({ params, searchParams }: Props) {
  await requireAccount();
  const [{ worldSlug }, { doc }] = await Promise.all([params, searchParams]);
  const world = await worldRepository.findBySlug(worldSlug);
  if (!world) notFound();

  const documentId = Array.isArray(doc) ? doc[0] : doc;
  const document = world.documents.find((item) => item.id === documentId) ?? world.documents[0] ?? null;

  return <Workspace key={document?.id ?? "empty-world"} world={world} document={document} interactive={apiConfigured} />;
}