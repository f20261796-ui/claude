"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UPLOAD_KINDS, type UploadKind } from "@/lib/schema";

/** Downscale large photos in the browser before upload (faster on mobile data, smaller storage). */
async function shrinkImage(file: File, maxDim = 2000): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export type UploadTarget = { draftId?: string; customerId?: string };

/** Asks our API for a signed URL, then PUTs the file straight to Supabase Storage with progress. */
export async function uploadFile(
  kind: UploadKind,
  original: File,
  target: UploadTarget,
  onProgress: (p: number) => void,
): Promise<string> {
  const file = kind === "resume" ? original : await shrinkImage(original);
  const rule = UPLOAD_KINDS[kind];
  if (!(rule.mimes as readonly string[]).includes(file.type))
    throw new Error(kind === "resume" ? "Please choose a PDF file." : "Please choose a JPG, PNG or WEBP image.");
  if (file.size > rule.maxMB * 1024 * 1024) throw new Error(`That file is over ${rule.maxMB} MB.`);

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, ...target, contentType: file.type, size: file.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", json.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed — please try again.")));
    xhr.onerror = () => reject(new Error("Network error — check your connection and retry."));
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", file);
    xhr.send(fd);
  });
  onProgress(1);
  return json.path as string;
}

export default function Uploader({
  kind,
  label,
  hint,
  value,
  onChange,
  target,
  previewUrl,
  shape = "rect",
}: {
  kind: UploadKind;
  label: string;
  hint?: string;
  value: string;
  onChange: (path: string) => void;
  target: UploadTarget;
  /** server preview URL for a previously uploaded file */
  previewUrl?: string;
  shape?: "rect" | "circle";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [local, setLocal] = useState<{ url: string; name: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const isPdf = kind === "resume";

  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local.url);
  }, [local]);

  const handle = async (file?: File | null) => {
    if (!file) return;
    setError("");
    setProgress(0);
    setLocal({ url: URL.createObjectURL(file), name: file.name });
    try {
      const path = await uploadFile(kind, file, target, setProgress);
      onChange(path);
      setTimeout(() => setProgress(null), 600);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
      setLocal(null);
    }
  };

  const preview = local?.url ?? (value ? previewUrl : "");
  const uploading = progress !== null && progress < 1;

  return (
    <div>
      <p className="label mb-3 text-bone/55">
        {label} <span className="normal-case tracking-normal text-bone/30">optional</span>
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`group relative flex items-center gap-5 overflow-hidden border border-dashed p-4 transition-colors ${
          shape === "circle" ? "rounded-[2rem]" : "rounded-2xl"
        } ${drag ? "border-blood bg-blood/10" : "border-bone/20 hover:border-bone/40"}`}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-ink-3 ${
            shape === "circle" ? "h-24 w-24 rounded-full" : isPdf ? "h-24 w-20 rounded-lg" : "h-24 w-32 rounded-lg"
          }`}
          aria-label={value ? `Replace ${label}` : `Upload ${label}`}
          data-cursor="Upload"
        >
          {preview && !isPdf ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : value || local ? (
            <span className="font-display text-sm font-bold text-blood">PDF</span>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-bone/50 transition-transform group-hover:-translate-y-1" aria-hidden>
              <path d="M12 16V4m0 0-5 5m5-5 5 5M4 20h16" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/70">
              <span className="font-mono text-sm">{Math.round((progress ?? 0) * 100)}%</span>
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-bone/80">
            {local?.name ?? (value ? (isPdf ? "Resume uploaded" : "Uploaded") : isPdf ? "Tap to upload a PDF" : "Tap to upload or drag an image")}
          </p>
          <p className="mt-1 text-xs text-bone/40">{hint ?? `${isPdf ? "PDF" : "JPG, PNG or WEBP"} · up to ${UPLOAD_KINDS[kind].maxMB} MB`}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="label rounded-full bg-bone/10 px-3 py-2 text-[10px] text-bone transition-colors hover:bg-blood"
            >
              {value ? "Replace" : "Choose file"}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setLocal(null);
                }}
                className="label rounded-full px-3 py-2 text-[10px] text-bone/50 hover:text-blood"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <AnimatePresence>
          {progress !== null && (
            <motion.div
              className="absolute inset-x-0 bottom-0 h-1 origin-left bg-blood"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress }}
              exit={{ opacity: 0 }}
              transition={{ ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <input
          ref={input}
          type="file"
          className="hidden"
          accept={UPLOAD_KINDS[kind].mimes.join(",")}
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#ff6b6f]">
          {error}
        </p>
      )}
    </div>
  );
}
