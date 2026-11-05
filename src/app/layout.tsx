import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "vvd Reimagined", template: "%s · vvd Reimagined" },
  description: "An independent reconstruction of a connected worldbuilding workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}