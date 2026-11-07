import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "vvd Reimagined", template: "%s · vvd Reimagined" },
  description: "An independent reconstruction of a connected worldbuilding workspace."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonces require this layout to render dynamically.
  await headers();
  return <html lang="en"><body>{children}</body></html>;
}