begin;

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete restrict,
  name text not null check (length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or (opens_at is not null and closes_at > opens_at)),
  check (status not in ('scheduled', 'active') or opens_at is not null)
);
create index drops_collection_id on public.drops(collection_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  drop_id uuid references public.drops(id) on delete restrict,
  created_by uuid references public.users(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_public_catalog on public.products(created_at desc, id desc)
where status = 'published' and deleted_at is null;
create index products_drop_id on public.products(drop_id);
create index products_created_by on public.products(created_by);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  primary key(collection_id, product_id)
);
create index collection_products_product_id on public.collection_products(product_id);

-- Every sellable item is a stable variant, even if it has a single option.
-- No duplicate product-level stock balance. All amounts use currency minor units.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null check (length(sku) between 1 and 100),
  size text not null check (length(size) between 1 and 50),
  color text not null check (length(color) between 1 and 50),
  price_minor bigint not null check (price_minor between 0 and 9007199254740991),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0 and stock_reserved <= stock_on_hand),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_variants_sku on public.product_variants(lower(sku));
create unique index product_variants_options on public.product_variants(product_id, lower(size), lower(color));

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  object_key text not null unique check (object_key like 'product/%'),
  alt_text text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);
create index product_media_product_id on public.product_media(product_id, position);

create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger drops_updated_at before update on public.drops for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();

alter table public.collections enable row level security;
alter table public.drops enable row level security;
alter table public.products enable row level security;
alter table public.collection_products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
revoke all on public.collections, public.drops, public.products, public.collection_products, public.product_variants, public.product_media from public, anon, authenticated, service_role;

commit;
