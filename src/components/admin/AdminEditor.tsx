"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomer } from "@/app/admin/actions";
import { EXPERIENCE_KINDS } from "@/lib/schema";
import { SelectField, TextArea, TextField, Toggle } from "@/components/form/fields";
import Uploader from "@/components/form/Uploader";
import {
  DesignPicker,
  ListEditor,
  RecognitionFields,
  SkillsEditor,
  emptyEdu,
  emptyExp,
  emptyProject,
  emptyRec,
  type FormState,
} from "@/components/form/CreateWizard";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-8 rounded-2xl border border-line bg-ink-2/60 p-5 md:p-8">
      <h2 className="display text-2xl md:text-3xl">{title}<span className="text-blood">.</span></h2>
      {children}
    </section>
  );
}

/** Admin editor for every customer field. Re-publishes automatically when the portfolio is live. */
export default function AdminEditor({ id, initial }: { id: string; initial: FormState }) {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const up = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const p = form.personal;
  const setP = (patch: Partial<FormState["personal"]>) => up("personal", { ...p, ...patch });
  const target = { draftId: form.draftId };
  const preview = (path?: string) => (path ? `/api/uploads/view?draft=${form.draftId}&path=${encodeURIComponent(path)}` : "");

  const save = () =>
    start(async () => {
      const r = await updateCustomer(id, form);
      if (r.ok) {
        setErrors({});
        setMsg({ ok: true, text: r.message ?? "Saved" });
        router.refresh();
      } else {
        setErrors(r.fields ?? {});
        setMsg({ ok: false, text: r.error });
      }
    });

  return (
    <div className="space-y-6 pb-28">
      <Section title="Personal">
        <Uploader kind="photo" label="Profile photograph" shape="circle" value={p.photoPath ?? ""} previewUrl={preview(p.photoPath)} onChange={(v) => setP({ photoPath: v })} target={target} />
        <div className="grid gap-8 md:grid-cols-2">
          <TextField label="Full name" required value={p.fullName} onChange={(v) => setP({ fullName: v })} error={errors["personal.fullName"]} />
          <TextField label="Headline" value={p.headline ?? ""} onChange={(v) => setP({ headline: v })} />
          <TextField label="Email" required value={p.email} onChange={(v) => setP({ email: v })} error={errors["personal.email"]} />
          <TextField label="Phone" value={p.phone ?? ""} onChange={(v) => setP({ phone: v })} error={errors["personal.phone"]} />
          <TextField label="City" value={p.city ?? ""} onChange={(v) => setP({ city: v })} />
          <Toggle label="Show phone publicly" checked={!!p.showPhone} onChange={(v) => setP({ showPhone: v })} />
        </div>
        <TextArea label="Short introduction" max={400} rows={2} value={p.intro ?? ""} onChange={(v) => setP({ intro: v })} />
        <TextArea label="About" max={4000} rows={6} value={p.about ?? ""} onChange={(v) => setP({ about: v })} />
      </Section>

      <Section title="Education">
        <ListEditor items={form.education ?? []} onChange={(v) => up("education", v)} make={emptyEdu} addLabel="Add education" max={10} title={(e) => e.institution || "New"}
          render={(e, set, i) => (
            <>
              <TextField className="md:col-span-2" label="Institution" required value={e.institution} onChange={(v) => set({ ...e, institution: v })} error={errors[`education.${i}.institution`]} />
              <TextField label="Degree" value={e.degree ?? ""} onChange={(v) => set({ ...e, degree: v })} />
              <TextField label="Field" value={e.field ?? ""} onChange={(v) => set({ ...e, field: v })} />
              <TextField label="Start year" value={e.startYear ?? ""} onChange={(v) => set({ ...e, startYear: v })} />
              <TextField label="Graduation year" value={e.endYear ?? ""} onChange={(v) => set({ ...e, endYear: v })} />
              <TextField label="Grade" value={e.grade ?? ""} onChange={(v) => set({ ...e, grade: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Skills">
        <SkillsEditor skills={form.skills ?? []} onChange={(v) => up("skills", v)} />
      </Section>

      <Section title="Projects">
        <ListEditor items={form.projects ?? []} onChange={(v) => up("projects", v)} make={emptyProject} addLabel="Add project" max={12} title={(x) => x.title || "New"}
          render={(x, set, i) => (
            <>
              <TextField className="md:col-span-2" label="Title" required value={x.title} onChange={(v) => set({ ...x, title: v })} error={errors[`projects.${i}.title`]} />
              <TextArea className="md:col-span-2" label="Description" max={1500} rows={3} value={x.description ?? ""} onChange={(v) => set({ ...x, description: v })} />
              <TextField className="md:col-span-2" label="Technologies (comma separated)" value={(x.tech ?? []).join(", ")} onChange={(v) => set({ ...x, tech: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <div className="md:col-span-2"><Uploader kind="project" label="Image" value={x.imagePath ?? ""} previewUrl={preview(x.imagePath)} onChange={(v) => set({ ...x, imagePath: v })} target={target} /></div>
              <TextField label="GitHub" value={x.githubUrl ?? ""} onChange={(v) => set({ ...x, githubUrl: v })} error={errors[`projects.${i}.githubUrl`]} />
              <TextField label="Live demo" value={x.liveUrl ?? ""} onChange={(v) => set({ ...x, liveUrl: v })} error={errors[`projects.${i}.liveUrl`]} />
            </>
          )}
        />
      </Section>

      <Section title="Experience">
        <ListEditor items={form.experience ?? []} onChange={(v) => up("experience", v)} make={emptyExp} addLabel="Add experience" max={12} title={(x) => x.company || "New"}
          render={(x, set, i) => (
            <>
              <TextField label="Company" required value={x.company} onChange={(v) => set({ ...x, company: v })} error={errors[`experience.${i}.company`]} />
              <TextField label="Position" value={x.role ?? ""} onChange={(v) => set({ ...x, role: v })} />
              <TextField className="md:col-span-2" label="Duration" value={x.duration ?? ""} onChange={(v) => set({ ...x, duration: v })} />
              <SelectField className="md:col-span-2" label="Type" value={x.kind ?? ""} onChange={(v) => set({ ...x, kind: v })} options={EXPERIENCE_KINDS} />
              <TextArea className="md:col-span-2" label="Description" max={1500} rows={3} value={x.description ?? ""} onChange={(v) => set({ ...x, description: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Achievements">
        <ListEditor items={form.achievements ?? []} onChange={(v) => up("achievements", v)} make={emptyRec} addLabel="Add achievement" max={15} title={(a) => a.title || "New"}
          render={(a, set, i) => <RecognitionFields a={a} set={set} err={(k) => errors[`achievements.${i}.${k}`]} />} />
      </Section>
      <Section title="Certifications">
        <ListEditor items={form.certifications ?? []} onChange={(v) => up("certifications", v)} make={emptyRec} addLabel="Add certification" max={15} title={(a) => a.title || "New"}
          render={(a, set, i) => <RecognitionFields a={a} set={set} err={(k) => errors[`certifications.${i}.${k}`]} cert />} />
      </Section>

      <Section title="Links & resume">
        <div className="grid gap-8 md:grid-cols-2">
          {(["linkedin", "github", "instagram", "x", "behance", "website"] as const).map((k) => (
            <TextField key={k} label={k} value={form.socials[k] ?? ""} onChange={(v) => up("socials", { ...form.socials, [k]: v })} error={errors[`socials.${k}`]} />
          ))}
        </div>
        <Uploader kind="resume" label="Resume (PDF)" value={form.resumePath ?? ""} previewUrl={preview(form.resumePath)} onChange={(v) => up("resumePath", v)} target={target} />
      </Section>

      <Section title="Design">
        <DesignPicker value={form.design} onChange={(v) => up("design", v)} />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-end gap-4 border-t border-line bg-ink/90 px-4 py-3 backdrop-blur-xl md:px-8">
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-[#ff6b6f]"}`}>{msg.text}</span>}
        <button onClick={save} disabled={pending} className="label h-12 rounded-full bg-blood px-8 text-[11px] text-bone disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
