import { NextResponse } from "next/server";
import { submissionSchema, flattenErrors } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`sub:${clientIp(req)}`, 10, 10 * 60_000))
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });

  const parsed = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Some details need fixing.", fields: flattenErrors(parsed.error) }, { status: 422 });
  const data = parsed.data;

  // Every referenced file must live in this draft's own upload folder.
  const own = `drafts/${data.draftId}/`;
  const paths = [data.personal.photoPath, data.resumePath, ...data.projects.map((p) => p.imagePath)].filter(Boolean);
  if (paths.some((p) => !p.startsWith(own) || p.includes("..")))
    return NextResponse.json({ error: "Invalid file reference." }, { status: 400 });

  // de-duplicate skills (case-insensitive)
  const seen = new Set<string>();
  data.skills = data.skills.filter((s) => !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()));

  const { consent: _consent, ...payload } = data;
  void _consent;
  const { data: rows, error } = await supabaseAdmin().rpc("create_submission", { p: payload });
  if (error || !rows?.[0]) {
    console.error("create_submission failed", error);
    return NextResponse.json({ error: "We couldn't save your details. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ id: rows[0].id, ref: rows[0].ref_code });
}
