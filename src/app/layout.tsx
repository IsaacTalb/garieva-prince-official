import type { Metadata } from "next";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Garieva Prince — Wear your own story", template: "%s | Garieva Prince" },
  description: "The independent house of Garieva Prince. Premium fashion and a new vision for digital ownership.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><SiteHeader /><main id="main">{children}</main><SiteFooter /></body></html>;
}
