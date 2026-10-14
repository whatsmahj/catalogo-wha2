-- ============================================================
--  Catalogo Wha — Esquema de base de datos para Supabase
--  Ejecutar TODO este archivo en: Supabase → SQL Editor → Run
-- ============================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) NEGOCIOS
-- ------------------------------------------------------------
create table if not exists public.businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  slug         text not null unique,
  description  text default '',
  whatsapp     text default '',
  country      text default 'Marruecos',
  region       text default '',
  city         text default '',
  address      text default '',
  zip          text default '',
  timezone     text default 'Africa/Casablanca',
  currency     text default 'MAD',
  brand_color  text default '#6d28d9',
  logo_url     text default '',
  hero_enabled boolean default false,
  hero_title   text default '',
  hero_desc    text default '',
  hero_image   text default '',
  delivery     text default '',
  payments     text default '',
  published    boolean default true,
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------
-- 2) CATEGORÍAS
-- ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  slug        text not null,
  sort_order  int default 0,
  image_url   text default '',
  alt         text default '',
  created_at  timestamptz default now()
);
create index if not exists categories_business_idx on public.categories(business_id);

-- ------------------------------------------------------------
-- 3) PRODUCTOS
-- ------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  slug        text default '',
  description text default '',
  price       numeric(12,2) default 0,
  promo_price numeric(12,2),
  sort_order  int default 0,
  active      boolean default true,
  images      text[] default '{}',
  created_at  timestamptz default now()
);
create index if not exists products_business_idx on public.products(business_id);
create index if not exists products_category_idx on public.products(category_id);

-- ------------------------------------------------------------
-- 4) PEDIDOS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  code          text not null,
  customer_name text default '',
  note          text default '',
  items         jsonb default '[]'::jsonb,
  total         numeric(12,2) default 0,
  status        text default 'new',   -- new | confirmed | delivered | cancelled
  created_at    timestamptz default now()
);
create index if not exists orders_business_idx on public.orders(business_id);

-- ------------------------------------------------------------
-- 5) BIBLIOTECA DE IMÁGENES
-- ------------------------------------------------------------
create table if not exists public.library (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  url         text not null,
  name        text default '',
  created_at  timestamptz default now()
);
create index if not exists library_business_idx on public.library(business_id);

-- ------------------------------------------------------------
-- 6) SEGURIDAD (Row Level Security)
-- ------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.orders     enable row level security;
alter table public.library    enable row level security;

-- Helper: ¿el negocio pertenece al usuario actual?
create or replace function public.owns_business(bid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.owner_id = auth.uid());
$$;

-- BUSINESSES
drop policy if exists "biz_public_read" on public.businesses;
create policy "biz_public_read" on public.businesses
  for select using (published = true or owner_id = auth.uid());

drop policy if exists "biz_owner_insert" on public.businesses;
create policy "biz_owner_insert" on public.businesses
  for insert with check (owner_id = auth.uid());

drop policy if exists "biz_owner_update" on public.businesses;
create policy "biz_owner_update" on public.businesses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "biz_owner_delete" on public.businesses;
create policy "biz_owner_delete" on public.businesses
  for delete using (owner_id = auth.uid());

-- CATEGORIES
drop policy if exists "cat_public_read" on public.categories;
create policy "cat_public_read" on public.categories
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and (b.published = true or b.owner_id = auth.uid()))
  );
drop policy if exists "cat_owner_write" on public.categories;
create policy "cat_owner_write" on public.categories
  for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- PRODUCTS
drop policy if exists "prod_public_read" on public.products;
create policy "prod_public_read" on public.products
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and (b.published = true or b.owner_id = auth.uid()))
  );
drop policy if exists "prod_owner_write" on public.products;
create policy "prod_owner_write" on public.products
  for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- ORDERS: cualquiera puede crear un pedido; solo el dueño lee/gestiona
drop policy if exists "ord_public_insert" on public.orders;
create policy "ord_public_insert" on public.orders
  for insert with check (true);
drop policy if exists "ord_owner_read" on public.orders;
create policy "ord_owner_read" on public.orders
  for select using (public.owns_business(business_id));
drop policy if exists "ord_owner_update" on public.orders;
create policy "ord_owner_update" on public.orders
  for update using (public.owns_business(business_id)) with check (public.owns_business(business_id));
drop policy if exists "ord_owner_delete" on public.orders;
create policy "ord_owner_delete" on public.orders
  for delete using (public.owns_business(business_id));

-- LIBRARY
drop policy if exists "lib_public_read" on public.library;
create policy "lib_public_read" on public.library for select using (true);
drop policy if exists "lib_owner_write" on public.library;
create policy "lib_owner_write" on public.library
  for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- ------------------------------------------------------------
-- 7) CREAR NEGOCIO AUTOMÁTICAMENTE AL REGISTRARSE
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bname text;
  bslug text;
begin
  bname := coalesce(new.raw_user_meta_data->>'business_name', 'Mi negocio');
  bslug := coalesce(new.raw_user_meta_data->>'slug', 'negocio-' || substr(new.id::text, 1, 8));

  -- Evitar colisiones de slug
  if exists (select 1 from public.businesses where slug = bslug) then
    bslug := bslug || '-' || substr(new.id::text, 1, 4);
  end if;

  insert into public.businesses (owner_id, name, slug)
  values (new.id, bname, bslug)
  on conflict (slug) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 8) STORAGE: bucket público para imágenes del catálogo
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

drop policy if exists "catalog_images_read" on storage.objects;
create policy "catalog_images_read" on storage.objects
  for select using (bucket_id = 'catalog-images');

drop policy if exists "catalog_images_insert" on storage.objects;
create policy "catalog_images_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'catalog-images');

drop policy if exists "catalog_images_update" on storage.objects;
create policy "catalog_images_update" on storage.objects
  for update to authenticated using (bucket_id = 'catalog-images');

drop policy if exists "catalog_images_delete" on storage.objects;
create policy "catalog_images_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'catalog-images');

-- ------------------------------------------------------------
-- 9) CATÁLOGO DE DEMOSTRACIÓN (opcional)
--    Se crea solo si no existe un negocio con slug 'demo'.
--    Reemplaza el UUID por uno de tus usuarios si quieres editarlo.
-- ------------------------------------------------------------
-- (Descomenta si quieres un negocio demo visible en /catalogo.html?b=demo)
-- insert into public.businesses (owner_id, name, slug, description, whatsapp, published, hero_enabled, hero_title, hero_desc)
-- values ('00000000-0000-0000-0000-000000000000', 'Mi Negocio Demo', 'demo', 'Catálogo de demostración.', '212690157092', true, true, 'Bienvenido a mi catálogo', 'Productos de calidad, pedidos fáciles por WhatsApp.')
-- on conflict (slug) do nothing;

-- ============================================================
--  ¡Listo! Copia la URL y la anon key en assets/js/config.js
-- ============================================================
