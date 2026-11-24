import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import Portfolio from "@/components/portfolio/Portfolio";
import { getPublishedBySlug } from "@/lib/data";
import { portfolioUrl } from "@/lib/config";

// Always read the current publication state (admin can unpublish at any time).
export const dynamic = "force-dynamic";

const load = cache((slug: string) => getPublishedBySlug(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Not found" };
  const description = d.intro || d.headline || `${d.name}'s portfolio`;
  return {
    title: { absolute: `${d.name}${d.headline ? ` — ${d.headline}` : ""}` },
    description,
    alternates: { canonical: portfolioUrl(slug) },
    openGraph: { title: d.name, description, url: portfolioUrl(slug), images: d.photoUrl ? [d.photoUrl] : [], type: "profile" },
    twitter: { card: d.photoUrl ? "summary_large_image" : "summary", title: d.name, description },
  };
}

export default async function PublicPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  return <Portfolio data={d} />;
}
