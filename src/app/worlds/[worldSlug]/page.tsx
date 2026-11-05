import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";
import { demoWorld } from "@/data/demo-world";

type Props = { params: Promise<{ worldSlug: string }>; searchParams: Promise<{ doc?: string }> };

export default async function WorldPage({ params, searchParams }: Props) {
  const [{ worldSlug }, { doc }] = await Promise.all([params, searchParams]);
  if (worldSlug !== demoWorld.slug) notFound();
  const document = demoWorld.documents.find((item) => item.id === doc) ?? demoWorld.documents[0];
  if (!document) notFound();
  return <Workspace world={demoWorld} document={document} />;
}