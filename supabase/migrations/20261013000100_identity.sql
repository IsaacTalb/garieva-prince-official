-- Apply to a NEW, dedicated Garieva Prince database, not the legacy database.
begin;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text not null unique check (length(auth0_sub) between 1 and 255),
  email text,
  display_name text,
  username text check (username ~ '^[a-z0-9_]{3,30}$'),
  phone text,
  avatar_url text,
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_unique on public.users (lower(email)) where email is not null;
create unique index users_username_unique on public.users (username) where username is not null;

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on public.users
for each row execute function public.set_updated_at();

-- Auth0 sessions are checked by our server. No browser/PostgREST access policies.
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
revoke all on public.users, public.user_roles from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

commit;
