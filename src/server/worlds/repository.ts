import "server-only";

import { demoWorld } from "@/data/demo-world";
import { getWorldIntegrityIssues, type World } from "@/domain/world";
import { apiConfigured, apiRequest, ApiError } from "@/server/api";

export interface WorldRepository {
  list(): Promise<readonly World[]>;
  findBySlug(slug: string, eraId?: string): Promise<World | null>;
}

class WorldRepositoryImpl implements WorldRepository {
  private readonly previewWorlds = [demoWorld];

  constructor() {
    if (!apiConfigured) {
      const issues = this.previewWorlds.flatMap(getWorldIntegrityIssues);
      if (issues.length) throw new Error("Invalid preview world data:\n" + issues.join("\n"));
    }
  }

  async list(): Promise<readonly World[]> {
    if (apiConfigured) return apiRequest<World[]>("/v1/worlds");
    return this.previewWorlds;
  }

  async findBySlug(slug: string, eraId?: string): Promise<World | null> {
    if (apiConfigured) {
      try {
        const query = eraId ? "?eraId=" + encodeURIComponent(eraId) : "";
        return await apiRequest<World>("/v1/worlds/" + encodeURIComponent(slug) + query);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }
    return this.previewWorlds.find((world) => world.slug === slug) ?? null;
  }
}

export const worldRepository: WorldRepository = new WorldRepositoryImpl();
