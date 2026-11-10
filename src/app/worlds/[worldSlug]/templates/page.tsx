import { notFound } from "next/navigation";
import { CardTemplateManager } from "@/components/workspace/card-template-manager";
import { apiConfigured, requireAccount } from "@/server/api";
import { worldRepository } from "@/server/worlds/repository";

type Props = { params: Promise<{ worldSlug: string }> };

export default async function CardTemplatesPage({ params }: Props) {
  await requireAccount();
  const { worldSlug } = await params;
  const world = await worldRepository.findBySlug(worldSlug);
  if (!world) notFound();

  return <CardTemplateManager world={world} interactive={apiConfigured} />;
}
