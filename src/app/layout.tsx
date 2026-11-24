import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/motion/SmoothScroll";
import { TransitionProvider } from "@/components/motion/PageTransition";
import Cursor from "@/components/motion/Cursor";
import { siteConfig } from "@/lib/config";

const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", weight: ["400", "500", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "500", "700", "900"],
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: { default: "IDENTITY. — Your story. Your space. Your website.", template: "%s — IDENTITY." },
  description: "Your own professional portfolio website, designed around you. Built to make an impression.",
  openGraph: {
    title: "IDENTITY. — Your story. Your space. Your website.",
    description: "A personal portfolio website, designed around you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070606",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${space.variable} ${inter.variable} ${playfair.variable} ${mono.variable}`}>
      <body>
        <SmoothScroll>
          <TransitionProvider>
            {children}
            <Cursor />
          </TransitionProvider>
        </SmoothScroll>
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
