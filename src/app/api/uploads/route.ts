import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { UPLOAD_KINDS, type UploadKind } from "@/lib/schema";
import { supabaseAdmin, BUCKET_PRIVATE } from "@/lib/supabase/admin";
import { getCustomer } from "@/lib/data";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const body = z.object({
  kind: z.enum(Object.keys(UPLOAD_KINDS) as [UploadKind, ...UploadKind[]]),
  draftId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/**
 * Issues a one-time signed upload URL so the browser uploads straight to private
 * Supabase Storage (with progress) instead of streaming files through our server.
 */
export async function POST(req: Request) {
  if (!rateLimit(`up:${clientIp(req)}`, 60, 10 * 60_000))
    return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  const { kind, draftId, customerId, contentType, size } = parsed.data;

  const rule = UPLOAD_KINDS[kind];
  if (!(rule.mimes as readonly string[]).includes(contentType))
    return NextResponse.json({ error: kind === "resume" ? "Please upload a PDF." : "Please upload a JPG, PNG or WEBP image." }, { status: 415 });
  if (size > rule.maxMB * 1024 * 1024)
    return NextResponse.json({ error: `File is larger than ${rule.maxMB} MB.` }, { status: 413 });

  let folder: string;
  if (kind === "payment") {
    if (!customerId) return NextResponse.json({ error: "Missing submission" }, { status: 400 });
    const c = await getCustomer(customerId);
    if (!c) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (c.status === "approved" || c.status === "pending")
      return NextResponse.json({ error: "Payment is already submitted for this portfolio." }, { status: 409 });
    folder = `payments/${customerId}`;
  } else {
    if (!draftId) return NextResponse.json({ error: "Missing draft" }, { status: 400 });
    folder = `drafts/${draftId}/${kind}`;
  }

  const path = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.${EXT[contentType]}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_PRIVATE).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Upload service unavailable" }, { status: 500 });
  return NextResponse.json({ path, signedUrl: data.signedUrl });
}
