"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function FieldError({ msg }: { msg?: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          role="alert"
          className="mt-2 text-sm text-[#ff6b6f]"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

type Base = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function TextField({
  label,
  hint,
  error,
  required,
  className = "",
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: Base & {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className={`group relative ${className}`}>
      <label htmlFor={id} className="label flex items-center gap-2 text-bone/55 transition-colors group-focus-within:text-blood">
        {label}
        {required ? <span className="text-blood">*</span> : <span className="normal-case tracking-normal text-bone/30">optional</span>}
      </label>
      <input
        id={id}
        className="field"
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
      />
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-blood transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-focus-within:scale-x-100" />
      {hint && !error && <p className="mt-2 text-xs text-bone/40">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  required,
  className = "",
  value,
  onChange,
  placeholder,
  max,
  rows = 4,
}: Base & { value: string; onChange: (v: string) => void; placeholder?: string; max: number; rows?: number }) {
  const id = useId();
  const len = (value ?? "").length;
  return (
    <div className={`group relative ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label flex items-center gap-2 text-bone/55 transition-colors group-focus-within:text-blood">
          {label}
          {required ? <span className="text-blood">*</span> : <span className="normal-case tracking-normal text-bone/30">optional</span>}
        </label>
        <span className={`font-mono text-[10px] ${len > max ? "text-[#ff6b6f]" : "text-bone/30"}`}>
          {len}/{max}
        </span>
      </div>
      <textarea
        id={id}
        className="field"
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {hint && !error && <p className="mt-2 text-xs text-bone/40">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}: Base & { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-bone/55">
        {label} <span className="normal-case tracking-normal text-bone/30">optional</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" id={id}>
        {options.map((o) => (
          <button
            type="button"
            key={o}
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(value === o ? "" : o)}
            className={`rounded-full border px-4 py-2 text-sm transition-all ${
              value === o ? "border-blood bg-blood text-bone" : "border-bone/20 text-bone/70 hover:border-bone/50"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-blood" : "bg-bone/15"}`}
      >
        <motion.span
          className="absolute top-1 h-5 w-5 rounded-full bg-bone"
          animate={{ left: checked ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      <span>
        <span className="text-bone">{label}</span>
        {hint && <span className="mt-1 block text-sm text-bone/45">{hint}</span>}
      </span>
    </label>
  );
}

/** Chips input: type and press Enter / comma to add. */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 40));
    onChange(next);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="label text-bone/55">
        {label} <span className="normal-case tracking-normal text-bone/30">optional</span>
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-line pb-3 focus-within:border-blood">
        <AnimatePresence initial={false}>
          {value.map((t) => (
            <motion.span
              key={t}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="flex items-center gap-2 rounded-full bg-bone/10 py-1.5 pl-3 pr-1.5 text-sm"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => onChange(value.filter((v) => v !== t))}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-bone/10 text-xs hover:bg-blood"
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-1.5 text-[1.0625rem] text-bone outline-none placeholder:text-bone/25"
          enterKeyHint="done"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions
            .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
            .slice(0, 10)
            .map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-bone/20 px-3 py-1.5 text-xs text-bone/60 transition-colors hover:border-blood hover:text-bone"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/** Small card wrapper for repeatable entries (education, projects...). */
export function EntryCard({
  index,
  title,
  onRemove,
  children,
}: {
  index: number;
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.3 } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border border-line bg-ink-2/80 p-5 md:p-7"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-xs text-blood">{String(index + 1).padStart(2, "0")}</span>
          <span className="truncate font-display text-lg font-bold uppercase tracking-tight text-bone/90">{title}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="label shrink-0 rounded-full border border-bone/15 px-3 py-2 text-[10px] text-bone/60 transition-colors hover:border-blood hover:text-blood"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 md:grid-cols-2">{children}</div>
    </motion.div>
  );
}

export function AddButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-bone/20 py-6 font-display text-sm font-bold uppercase tracking-tight text-bone/70 transition-all hover:border-blood hover:bg-blood/5 hover:text-bone disabled:opacity-30"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blood text-lg text-bone transition-transform duration-500 group-hover:rotate-90">
        +
      </span>
      {label}
    </button>
  );
}
