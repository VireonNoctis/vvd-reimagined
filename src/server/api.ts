import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Account = {
  id: string;
  email: string;
  displayName: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiConfigured = Boolean(process.env.VVD_API_URL?.trim());

function apiUrl(path: string): URL {
  const origin = process.env.VVD_API_URL?.trim();
  if (!origin) throw new Error("VVD_API_URL is not configured.");
  return new URL(path, origin.endsWith("/") ? origin : origin + "/");
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies();
  const session = jar.get("vvd_session")?.value;
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");

  if (session) headers.set("cookie", "vvd_session=" + session);
  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual"
  });

  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Use the generic response when the API does not return JSON.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export async function requireAccount(): Promise<Account | null> {
  if (!apiConfigured) return null;

  try {
    return await apiRequest<Account>("/v1/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
}
