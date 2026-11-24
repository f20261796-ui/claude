-- ════════════════════════════════════════════════════════════════════
-- IDENTITY. — core schema
-- All customer data is accessed server-side with the service role.
-- RLS is enabled everywhere with NO anon policies, so the public
-- anon key can never read or write customer data directly.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enums ───────────────────────────────────────────────────────────
create type public.customer_status as enum ('awaiting_payment', 'pending', 'approved', 'rejected');
create type public.payment_status  as enum ('pending', 'approved', 'rejected');
create type public.design_style    as enum ('minimalist', 'futuristic', 'cinematic', 'colourful');

-- ── Admins ──────────────────────────────────────────────────────────
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ── Customers ───────────────────────────────────────────────────────
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  ref_code       text not null unique,
  draft_id       uuid not null unique,               -- client draft id; makes submission idempotent
  status         public.customer_status not null default 'awaiting_payment',
  full_name      text not null check (char_length(full_name) between 1 and 120),
  headline       text check (char_length(headline) <= 160),
  email          text not null check (char_length(email) <= 254),
  phone          text check (char_length(phone) <= 32),
  show_phone     boolean not null default false,
  city           text check (char_length(city) <= 120),
  intro          text check (char_length(intro) <= 400),
  about          text check (char_length(about) <= 4000),
  photo_path     text,
  resume_path    text,
  design_style   public.design_style not null default 'cinematic',
  accent_color   text not null default '#e1121b' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  linkedin_url   text,
  github_url     text,
  instagram_url  text,
  x_url          text,
  behance_url    text,
  website_url    text,
  extra_links    jsonb not null default '[]'::jsonb,  -- [{label, url}]
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index customers_status_idx on public.customers (status, created_at desc);
create index customers_search_idx on public.customers using gin (
  to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(ref_code,''))
);

create table public.education (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  institution text not null,
  degree      text,
  field       text,
  start_year  text,
  end_year    text,
  grade       text
);
create index on public.education (customer_id, position);

create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  name        text not null,
  level       int not null default 3 check (level between 1 and 5)
);
create index on public.skills (customer_id, position);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  title       text not null,
  description text,
  tech        text[] not null default '{}',
  image_path  text,
  github_url  text,
  live_url    text
);
create index on public.projects (customer_id, position);

create table public.experience (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  company     text not null,
  role        text,
  kind        text,      -- full-time | internship | freelance | volunteering | other
  duration    text,
  description text
);
create index on public.experience (customer_id, position);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  title       text not null,
  description text,
  issuer      text,
  date        text,
  link        text
);
create index on public.achievements (customer_id, position);

create table public.certifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  position    int not null default 0,
  title       text not null,
  description text,
  issuer      text,
  date        text,
  link        text
);
create index on public.certifications (customer_id, position);

-- ── Payments ────────────────────────────────────────────────────────
create table public.payment_submissions (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.customers (id) on delete cascade,
  reference       text not null check (char_length(reference) between 6 and 40),
  screenshot_path text,
  amount          int  not null default 50,
  status          public.payment_status not null default 'pending',
  admin_note      text,
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index on public.payment_submissions (customer_id, created_at desc);
create index on public.payment_submissions (status);
-- The same UTR can never be used by two live (non-rejected) submissions.
create unique index payment_reference_live_uniq
  on public.payment_submissions (upper(reference)) where status <> 'rejected';
-- A customer can only have one pending payment at a time.
create unique index payment_one_pending_per_customer
  on public.payment_submissions (customer_id) where status = 'pending';

-- ── Published portfolios ────────────────────────────────────────────
-- `snapshot` holds ONLY the data meant to be public. The public page
-- reads nothing else.
create table public.published_portfolios (
  customer_id  uuid primary key references public.customers (id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_published boolean not null default false,
  snapshot     jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at   timestamptz not null default now()
);
create index on public.published_portfolios (slug) where is_published;

-- ── Settings ────────────────────────────────────────────────────────
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('delivery_message', to_jsonb('Portfolios are usually published within 24 hours of payment verification.'::text));

-- ── updated_at trigger ──────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger portfolios_touch before update on public.published_portfolios
  for each row execute function public.touch_updated_at();

-- ── RLS: deny-by-default; admins may read/write through their session ─
do $$
declare t text;
begin
  foreach t in array array['admins','customers','education','skills','projects','experience',
                           'achievements','certifications','payment_submissions','published_portfolios','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.gen_ref_code() returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := 'ID-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.customers where ref_code = code);
  end loop;
  return code;
end $$;

-- Replace all child rows of a customer from a JSON payload.
create or replace function public._write_children(p_id uuid, p jsonb) returns void
language plpgsql as $$
begin
  delete from public.education      where customer_id = p_id;
  delete from public.skills         where customer_id = p_id;
  delete from public.projects       where customer_id = p_id;
  delete from public.experience     where customer_id = p_id;
  delete from public.achievements   where customer_id = p_id;
  delete from public.certifications where customer_id = p_id;

  insert into public.education (customer_id, position, institution, degree, field, start_year, end_year, grade)
  select p_id, (o - 1)::int, e->>'institution', e->>'degree', e->>'field', e->>'startYear', e->>'endYear', e->>'grade'
  from jsonb_array_elements(coalesce(p->'education','[]')) with ordinality as x(e, o);

  insert into public.skills (customer_id, position, name, level)
  select p_id, (o - 1)::int, s->>'name', coalesce((s->>'level')::int, 3)
  from jsonb_array_elements(coalesce(p->'skills','[]')) with ordinality as x(s, o);

  insert into public.projects (customer_id, position, title, description, tech, image_path, github_url, live_url)
  select p_id, (o - 1)::int, j->>'title', j->>'description',
         coalesce(array(select jsonb_array_elements_text(coalesce(j->'tech','[]'))), '{}'),
         j->>'imagePath', j->>'githubUrl', j->>'liveUrl'
  from jsonb_array_elements(coalesce(p->'projects','[]')) with ordinality as x(j, o);

  insert into public.experience (customer_id, position, company, role, kind, duration, description)
  select p_id, (o - 1)::int, e->>'company', e->>'role', e->>'kind', e->>'duration', e->>'description'
  from jsonb_array_elements(coalesce(p->'experience','[]')) with ordinality as x(e, o);

  insert into public.achievements (customer_id, position, title, description, issuer, date, link)
  select p_id, (o - 1)::int, a->>'title', a->>'description', a->>'issuer', a->>'date', a->>'link'
  from jsonb_array_elements(coalesce(p->'achievements','[]')) with ordinality as x(a, o);

  insert into public.certifications (customer_id, position, title, description, issuer, date, link)
  select p_id, (o - 1)::int, c->>'title', c->>'description', c->>'issuer', c->>'date', c->>'link'
  from jsonb_array_elements(coalesce(p->'certifications','[]')) with ordinality as x(c, o);
end $$;

create or replace function public._customer_fields(p jsonb) returns jsonb language sql immutable as $$
  select p->'personal' || coalesce(p->'socials','{}') || coalesce(p->'design','{}') || jsonb_build_object('resumePath', p->>'resumePath')
$$;

-- Atomically create a customer and all child rows. Idempotent on draftId.
create or replace function public.create_submission(p jsonb)
returns table (id uuid, ref_code text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ref text;
  f jsonb := public._customer_fields(p);
begin
  select c.id, c.ref_code into v_id, v_ref from public.customers c where c.draft_id = (p->>'draftId')::uuid;
  if v_id is not null then
    return query select v_id, v_ref; return;
  end if;

  v_ref := public.gen_ref_code();
  insert into public.customers (
    ref_code, draft_id, full_name, headline, email, phone, show_phone, city, intro, about, photo_path,
    resume_path, design_style, accent_color,
    linkedin_url, github_url, instagram_url, x_url, behance_url, website_url, extra_links)
  values (
    v_ref, (p->>'draftId')::uuid, f->>'fullName', f->>'headline', f->>'email', f->>'phone',
    coalesce((f->>'showPhone')::boolean, false), f->>'city', f->>'intro', f->>'about', f->>'photoPath',
    f->>'resumePath', coalesce((f->>'style')::public.design_style, 'cinematic'), coalesce(f->>'accent', '#e1121b'),
    f->>'linkedin', f->>'github', f->>'instagram', f->>'x', f->>'behance', f->>'website',
    coalesce(f->'extra', '[]'::jsonb))
  returning customers.id into v_id;

  perform public._write_children(v_id, p);
  return query select v_id, v_ref;
end $$;

-- Atomically update a customer (admin edit).
create or replace function public.update_submission(p_id uuid, p jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare f jsonb := public._customer_fields(p);
begin
  update public.customers set
    full_name = f->>'fullName', headline = f->>'headline', email = f->>'email', phone = f->>'phone',
    show_phone = coalesce((f->>'showPhone')::boolean, false), city = f->>'city', intro = f->>'intro',
    about = f->>'about', photo_path = f->>'photoPath', resume_path = f->>'resumePath',
    design_style = coalesce((f->>'style')::public.design_style, 'cinematic'),
    accent_color = coalesce(f->>'accent', '#e1121b'),
    linkedin_url = f->>'linkedin', github_url = f->>'github', instagram_url = f->>'instagram',
    x_url = f->>'x', behance_url = f->>'behance', website_url = f->>'website',
    extra_links = coalesce(f->'extra', '[]'::jsonb)
  where id = p_id;
  if not found then raise exception 'customer not found'; end if;
  perform public._write_children(p_id, p);
end $$;

create or replace function public.admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'customers', (select count(*) from customers),
    'payments',  (select count(*) from payment_submissions),
    'pending',   (select count(*) from customers where status = 'pending'),
    'approved',  (select count(*) from customers where status = 'approved'),
    'rejected',  (select count(*) from customers where status = 'rejected'),
    'awaiting',  (select count(*) from customers where status = 'awaiting_payment'),
    'published', (select count(*) from published_portfolios where is_published),
    'revenue',   (select coalesce(sum(amount), 0) from payment_submissions where status = 'approved')
  );
$$;

-- Server-only functions: never callable with the public anon key.
revoke all on function public.create_submission(jsonb) from public, anon, authenticated;
revoke all on function public.update_submission(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_stats() from public, anon, authenticated;
revoke all on function public._write_children(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_submission(jsonb) to service_role;
grant execute on function public.update_submission(uuid, jsonb) to service_role;
grant execute on function public.admin_stats() to service_role;
grant execute on function public._write_children(uuid, jsonb) to service_role;

-- ── Storage ─────────────────────────────────────────────────────────
-- `uploads`: private. Customer photos, resumes, project images, payment proof.
-- `portfolio-assets`: public. Files copied here only when a portfolio is published.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 10485760,
    array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf']),
  ('portfolio-assets', 'portfolio-assets', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;
