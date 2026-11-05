import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "cookie", "origin"];
const FORWARDED_RESPONSE_HEADERS = ["cache-control", "content-type", "location", "set-cookie", "vary"];

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const origin = process.env.VVD_API_URL?.trim();
  if (!origin) {
    return Response.json({ error: "The API service is not configured." }, { status: 503 });
  }

  const { path } = await context.params;
  const base = origin.endsWith("/") ? origin : origin + "/";
  const target = new URL(path.map(encodeURIComponent).join("/"), base);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual"
  });

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
