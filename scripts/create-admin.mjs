// Creates (or promotes) an administrator.
// Usage: node --env-file=.env.local scripts/create-admin.mjs you@example.com 'a-strong-password'
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password (min 10 chars)>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let userId;
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  // already exists → look it up and update the password
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const u = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (!u) throw created.error;
  await db.auth.admin.updateUserById(u.id, { password });
  userId = u.id;
} else userId = created.data.user.id;

const { error } = await db.from("admins").upsert({ user_id: userId });
if (error) throw error;
console.log(`✓ ${email} is now an IDENTITY. administrator`);
