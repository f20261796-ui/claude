import { NextResponse } from "next/server";
import { supabaseAdmin, BUCKET_PRIVATE } from "@/lib/supabase/admin";

/** Lets a customer preview their own draft uploads. The draft id (a random UUID) is the capability. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const draft = u.searchParams.get("draft") ?? "";
  const path = u.searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(draft) || !path.startsWith(`drafts/${draft}/`) || path.includes(".."))
    return new NextResponse("Not found", { status: 404 });
  const { data } = await supabaseAdmin().storage.from(BUCKET_PRIVATE).createSignedUrl(path, 300);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
