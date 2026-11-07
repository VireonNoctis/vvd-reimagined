import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

function connectOrigins(): string[] {
  const configured = process.env.VVD_CSP_CONNECT_ORIGINS?.split(/[ ,\\t\\r\\n]+/).filter(Boolean) ?? [];
  const development = process.env.NODE_ENV !== "production";

  return [...new Set(configured.map((origin) => {
    const url = new URL(origin);
    const localHttp = development
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    if (
      url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
      || (url.protocol !== "https:" && !localHttp)
      || url.origin !== origin
    ) {
      throw new Error("VVD_CSP_CONNECT_ORIGINS must contain exact HTTPS origins (or localhost origins in development).");
    }

    return url.origin;
  }))];
}

export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const connect = ["'self'", ...connectOrigins()];
  if (development) connect.push("ws:", "wss:");

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (development ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'nonce-" + nonce + "'",
    "style-src-attr 'unsafe-inline'",
    "script-src-attr 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src " + connect.join(" "),
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"])
  ];

  const policy = directives.join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
