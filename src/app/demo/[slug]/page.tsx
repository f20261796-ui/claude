import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Portfolio from "@/components/portfolio/Portfolio";
import DemoBanner from "@/components/portfolio/DemoBanner";
import { DEMOS, getDemo } from "@/lib/demos";

export function generateStaticParams() {
  return DEMOS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDemo((await params).slug);
  return { title: d ? `${d.name} (demo)` : "Demo", robots: { index: false } };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDemo((await params).slug);
  if (!d) notFound();
  return (
    <>
      <Portfolio data={d} />
      <DemoBanner />
    </>
  );
}
