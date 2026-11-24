# IDENTITY.

Cinematic personal-portfolio studio. Customers arrive from Instagram, fill in a 10-step form, pay ₹50 by UPI, and — once an admin verifies the payment — get a public portfolio at `yourbrand.com/p/their-name`.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion (Framer Motion) · GSAP ScrollTrigger · Lenis · raw WebGL shaders · Supabase (Postgres, Storage, Auth) · Zod

---

## Customer journey

| Route | What happens |
| --- | --- |
| `/` | Landing page: WebGL ink hero, process, demo portfolios, pricing, FAQ |
| `/demo/[slug]` | Four sample portfolios (fictional people), rendered by the same component as real ones |
| `/create` | 10-step onboarding. Autosaves to the device, validates every step, uploads straight to Supabase Storage with progress |
| `/pay/[id]` | UPI QR (`public/payment-qr.png`), copy UPI ID, "Pay with UPI app" deep link with ₹50 prefilled, UTR + screenshot |
| `/status/[id]` | Private status page (unguessable UUID link): submission ID, verification status, delivery note, live link + share buttons |
| `/p/[slug]` | The published portfolio. Reads **only** the public snapshot |
| `/admin` | Stats, search, filters, approve/reject, publish/unpublish, preview, edit, delete, settings |

### Payment safety
Payments are **verified manually**. Submitting the payment form only stores a claim with status `pending`; nothing is ever marked paid automatically. Built-in guards:
- A UTR can't be reused by two live submissions (unique index on non-rejected payments).
- One pending claim per customer.
- Only an admin can approve. Approval publishes the portfolio; rejection lets the customer resubmit and shows them your note.

---

## Run locally

Requirements: Node 20+, Docker (for the local Supabase stack).

```bash
npm install
```

```bash
npx supabase start
```

`supabase start` applies `supabase/migrations/*` automatically. Then:

```bash
cp .env.example .env.local
```

Fill `.env.local` using the URL, anon key and service-role key printed by `npx supabase status`. Then create your admin account and run the app:

```bash
npm run create-admin -- you@example.com 'a-long-strong-password'
```

```bash
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.

---

## Deploy (Vercel + Supabase Cloud)

1. **Create a Supabase project.** Then run the migration, either via the CLI:
   ```bash
   npx supabase link --project-ref YOUR_REF
   ```
   ```bash
   npx supabase db push
   ```
   or paste `supabase/migrations/20261124000000_init.sql` into the SQL editor. This creates every table, RLS policy, RPC and both storage buckets.
2. **Disable public sign-ups:** Supabase dashboard → Authentication → Providers/Settings → turn off "Allow new users to sign up". Admins are created only with the script below.
3. **Deploy to Vercel** and set the environment variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**secret** — never prefix with `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://yourbrand.com`; it's used to build portfolio links)
   - `NEXT_PUBLIC_UPI_ID`, `NEXT_PUBLIC_UPI_NAME`, `NEXT_PUBLIC_PRICE_INR`
   - optional: `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`
4. **Create an admin** against production (with the production values in your env):
   ```bash
   node --env-file=.env.production.local scripts/create-admin.mjs you@example.com 'strong-password'
   ```
5. **Payment QR:** replace `public/payment-qr.png` with your own QR if it changes. The current file is a cleaned-up crop of the QR you supplied; it was decoded and verified to point to `fulbandheishan@okicici`.

---

## Security model

- All customer tables have **RLS enabled with no anon policies**. The public anon key can't read or write customer data (verified: an anonymous REST read returns `[]`). Every database access goes through server code using the service role, after validation.
- Admin = Supabase Auth user **and** a row in `public.admins`. Each admin page and server action re-checks this on the server. Credentials never ship to the browser.
- Uploads: the server validates type and size and issues a one-time signed upload URL into the private `uploads` bucket, under a per-draft folder. Submissions are rejected if they reference files outside their own folder.
- Publishing copies only the photo, resume and project images into the public `portfolio-assets` bucket under random names, and stores a **snapshot** of public fields. Unpublishing removes those files. Payment screenshots never become public.
- The phone number is hidden unless the customer turns on "Show phone on my website".
- Public endpoints are rate-limited per IP (in-memory, best-effort). For large-scale traffic, swap `src/lib/rate-limit.ts` for Upstash/Redis.

---

## Project map

```
src/app/(site)/          landing, create, pay, status (with nav)
src/app/p/[slug]         public portfolios
src/app/demo/[slug]      sample portfolios
src/app/admin/           login, dashboard, customer detail/edit/preview, settings, server actions
src/app/api/             uploads (signed URLs), submissions, payments
src/components/gl/       WebGL: InkField (hero) and MeltImage (pixel-stretch reveal)
src/components/motion/   Lenis smooth scroll, cursor, magnetic, reveals, loader, page transitions
src/components/form/     onboarding wizard, fields, uploader
src/components/portfolio portfolio renderer + 4 themes
src/lib/                 schema (zod), data layer, config, auth, demos
supabase/migrations/     database schema
scripts/                 create-admin, capture-demos (regenerates landing previews), gen-demo-art
```

### Regenerating demo previews
After changing the portfolio design, run the dev server and then:

```bash
npm run capture-demos
```

This captures fresh screenshots into `public/demos/`.

## Motion and accessibility
Every animation respects `prefers-reduced-motion`. Under reduced motion: no loader, no smooth scroll, static shaders, and plain fades. The custom cursor appears only on fine pointers. On touch devices, scrolling stays native and shaders run at lower resolution with fewer octaves. WebGL contexts pause when off-screen and fall back to plain images if unavailable.
