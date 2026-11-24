import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSubmission } from "@/lib/data";
import AdminEditor from "@/components/admin/AdminEditor";
import type { FormState } from "@/components/form/CreateWizard";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadSubmission(id);
  if (!loaded) notFound();
  return (
    <main className="mx-auto max-w-4xl">
      <Link href={`/admin/c/${id}`} className="label text-[10px] text-ash hover:text-bone">← Back to {loaded.customer.full_name}</Link>
      <h1 className="display mb-8 mt-2 text-4xl md:text-6xl">Edit<span className="text-blood">.</span></h1>
      <AdminEditor id={id} initial={loaded.form as FormState} />
    </main>
  );
}
