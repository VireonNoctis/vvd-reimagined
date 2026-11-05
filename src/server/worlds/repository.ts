import "server-only";

import { demoWorld } from "@/data/demo-world";
import { getWorldIntegrityIssues, type World } from "@/domain/world";

export interface WorldRepository {
  list(): Promise<readonly World[]>;
  findBySlug(slug: string): Promise<World | null>;
}

class PreviewWorldRepository implements WorldRepository {
  private readonly worlds = [demoWorld];

  constructor() {
    const issues = this.worlds.flatMap(getWorldIntegrityIssues);
    if (issues.length > 0) {
      throw new Error("Invalid preview world data:\n" + issues.join("\n"));
    }
  }

  async list(): Promise<readonly World[]> {
    return this.worlds;
  }

  async findBySlug(slug: string): Promise<World | null> {
    return this.worlds.find((world) => world.slug === slug) ?? null;
  }
}

export const worldRepository: WorldRepository = new PreviewWorldRepository();
