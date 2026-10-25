-- Post Reviewer schema
-- Access model: every table has RLS enabled with NO policies, and anon/authenticated
-- have no grants. All reads/writes go through the Next.js server using the
-- service-role key, after checking either (a) the signed-in user is a team member,
-- or (b) the request carries a valid org share token.

create extension if not exists pgcrypto;

create table if not exists public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  headline text not null default '',
  avatar_url text,
  linkedin_url text,
  created_at timestamptz not null default now()
);
create index if not exists people_org_id_idx on public.people (org_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  body text not null default '',
  -- { kind: 'none'|'images'|'video'|'document'|'link'|'poll', ...kind-specific fields }
  media jsonb not null default '{"kind":"none"}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'posted')),
  scheduled_for timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_org_id_idx on public.posts (org_id);
create index if not exists posts_person_id_idx on public.posts (person_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_name text not null,
  author_type text not null check (author_type in ('client', 'team')),
  body text not null,
  quote text,
  post_version int not null default 1,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_id_idx on public.comments (post_id);

alter table public.team_members enable row level security;
alter table public.orgs enable row level security;
alter table public.people enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

revoke all on public.team_members, public.orgs, public.people, public.posts, public.comments
  from anon, authenticated;
grant all on public.team_members, public.orgs, public.people, public.posts, public.comments
  to service_role;

-- Public bucket for post media (images, videos, document slides, avatars).
-- Uploads happen via server-issued signed upload URLs, so no storage policies are needed.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;
