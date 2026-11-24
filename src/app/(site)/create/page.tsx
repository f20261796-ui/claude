import type { Metadata } from "next";
import CreateWizard from "@/components/form/CreateWizard";

export const metadata: Metadata = { title: "Create your portfolio", robots: { index: false } };

export default function CreatePage() {
  return (
    <main>
      <CreateWizard />
    </main>
  );
}
