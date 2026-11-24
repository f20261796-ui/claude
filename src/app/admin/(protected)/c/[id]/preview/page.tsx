import { notFound } from "next/navigation";
import Portfolio from "@/components/portfolio/Portfolio";
import { previewSnapshot } from "@/lib/data";

export default async function AdminPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await previewSnapshot(id);
  if (!data) notFound();
  return (
    <div className="-mx-4 -my-8 md:-mx-8 md:-my-10">
      <div className="sticky top-[57px] z-50 bg-amber-400 px-4 py-2 text-center font-mono text-xs uppercase tracking-wider text-ink">
        Private admin preview — not public
      </div>
      <Portfolio data={data} />
    </div>
  );
}
