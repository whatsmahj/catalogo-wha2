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
-- 5.b) COLUMNAS ADICIONALES (entrega, pagos y SEO)
--      Se añaden con IF NOT EXISTS: seguro de re-ejecutar.
-- ------------------------------------------------------------
 alter table public.businesses
  add column if not exists delivery_fee    numeric(12,2) default 0,
  add column if not exists delivery_time   text default '',
  add column if not exists delivery_notes  text default '',
  add column if not exists payment_notes   text default '',
  add column if not exists seo_title       text default '',
  add column if not exists seo_description text default '',
  add column if not exists seo_keywords    text default '',
  add column if not exists seo_image       text default '';

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
-- Crea el bucket y, si ya existía como privado, lo vuelve PÚBLICO.
insert into storage.buckets (id, name, public, file_size_limit)
values ('catalog-images', 'catalog-images', true, 10485760)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760;

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


-- ===========================================================
-- 10) ADMINISTRACIÓN (super admin)
-- -----------------------------------------------------------
-- Un administrador puede ver y gestionar TODAS las cuentas.
-- La seguridad real está AQUÍ (RLS), nunca en el frontend.
-- ===========================================================

-- 9.1 Guardar el correo del propietario en cada negocio (para el panel)
alter table public.businesses add column if not exists owner_email text;

update public.businesses b
   set owner_email = u.email
  from auth.users u
 where u.id = b.owner_id and b.owner_email is null;

-- 9.2 Tabla de administradores
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);

alter table public.admins enable row level security;

-- 9.3 Función helper (SECURITY DEFINER: evita recursión en RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- 9.4 Políticas de la tabla admins
drop policy if exists "admins_read" on public.admins;
create policy "admins_read" on public.admins
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- 9.5 Políticas de administrador sobre las tablas de datos
drop policy if exists "businesses_admin_all" on public.businesses;
create policy "businesses_admin_all" on public.businesses
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "library_admin_all" on public.library;
create policy "library_admin_all" on public.library
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 9.6 Storage: el admin puede gestionar cualquier imagen
drop policy if exists "storage_admin_all" on storage.objects;
create policy "storage_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin())
  with check (bucket_id = 'catalog-images' and public.is_admin());

-- 9.7 Trigger: guardar también el correo del dueño al crear el negocio
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.businesses (owner_id, owner_email, name, slug)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'business_name', 'Mi negocio'),
    coalesce(new.raw_user_meta_data->>'slug', 'negocio-' || substr(new.id::text, 1, 6))
  );
  return new;
end;
$$;

-- ===========================================================
-- 9.8 HAZTE ADMINISTRADOR  (ejecuta esto UNA sola vez)
-- -----------------------------------------------------------
-- Cambia el correo por EL TUYO y ejecuta SOLO estas 3 líneas:
--
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'tu-correo@ejemplo.com'
--   on conflict (user_id) do nothing;
--
-- Comprueba que quedó bien:
--   select * from public.admins;
-- ===========================================================


-- ===========================================================
-- 11) MÉTRICAS DEL PANEL DE ADMINISTRACIÓN
-- -----------------------------------------------------------
-- Contador de visitas + consultas agregadas para el panel.
-- Todas las consultas comprueban public.is_admin() para que
-- NADIE que no sea admin pueda leer datos de otras cuentas.
-- ===========================================================

-- 11.1 Contador de visitas por producto
alter table public.products add column if not exists views integer not null default 0;

-- 11.2 Registrar una visita (lo llama el catálogo público, sin sesión)
create or replace function public.track_product_view(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set views = coalesce(views, 0) + 1
   where id = pid;
end;
$$;

grant execute on function public.track_product_view(uuid) to anon, authenticated;

-- 11.3 Altas por mes (últimos 12 meses)
create or replace function public.admin_signups_by_month()
returns table(month text, total bigint)
language sql
security definer
stable
set search_path = public
as $$
  select to_char(date_trunc('month', b.created_at), 'YYYY-MM') as month,
         count(*)::bigint as total
    from public.businesses b
   where public.is_admin()
     and b.created_at >= date_trunc('month', now()) - interval '11 months'
   group by 1
   order by 1;
$$;

grant execute on function public.admin_signups_by_month() to authenticated;

-- 11.4 Productos más vistos
create or replace function public.admin_top_products(lim int default 10)
returns table(id uuid, name text, views bigint, price numeric,
              business_name text, business_slug text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.name, coalesce(p.views, 0)::bigint, p.price, b.name, b.slug
    from public.products p
    join public.businesses b on b.id = p.business_id
   where public.is_admin()
   order by coalesce(p.views, 0) desc, p.created_at desc
   limit greatest(1, least(coalesce(lim, 10), 50));
$$;

grant execute on function public.admin_top_products(int) to authenticated;

-- 11.5 Cuentas con más pedidos
create or replace function public.admin_business_ranking()
returns table(business_id uuid, name text, slug text, orders bigint, revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select b.id, b.name, b.slug,
         count(o.id)::bigint,
         coalesce(sum(o.total), 0)::numeric
    from public.businesses b
    left join public.orders o on o.business_id = b.id
   where public.is_admin()
   group by b.id, b.name, b.slug
   order by count(o.id) desc, coalesce(sum(o.total), 0) desc
   limit 50;
$$;

grant execute on function public.admin_business_ranking() to authenticated;

-- Comprobación rápida (debe devolver datos solo si eres admin):
--   select public.is_admin();
-- ===========================================================


-- ===========================================================
-- 12) PRODUCTOS Y SERVICIOS
-- -----------------------------------------------------------
-- kind = 'product' (producto físico) | 'service' (servicio)
-- Un negocio puede tener los dos tipos mezclados en su catálogo.
-- ===========================================================

alter table public.products add column if not exists kind text not null default 'product';

create index if not exists products_kind_idx on public.products(kind);

-- Comprobación:
--   select kind, count(*) from public.products group by kind;
-- ===========================================================


-- ===========================================================
-- 13) SERVICIOS: DURACIÓN Y MODALIDAD
-- -----------------------------------------------------------
-- Solo se usan cuando products.kind = 'service'.
--   duration  -> "2 horas", "1 día"...
--   modality  -> "A domicilio", "En local", "Online"...
-- ===========================================================

alter table public.products add column if not exists duration text;
alter table public.products add column if not exists modality text;


-- ===========================================================
-- 14) DATOS DEL CLIENTE EN EL PEDIDO
-- -----------------------------------------------------------
-- Se rellenan desde el formulario del pedido en el catálogo.
-- ===========================================================

alter table public.orders add column if not exists customer_phone   text;
alter table public.orders add column if not exists customer_address text;
alter table public.orders add column if not exists customer_city    text;

-- Comprobación de todo lo anterior:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='products'
--      and column_name in ('kind','duration','modality');
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='orders'
--      and column_name in ('customer_phone','customer_address','customer_city');
-- ===========================================================


-- ===========================================================
-- 16) HORARIOS DE ATENCIÓN (para las citas)
-- -----------------------------------------------------------
--   open_time    -> apertura, "09:00"
--   close_time   -> cierre, "18:00"
--   slot_minutes -> cada cuántos minutos hay hueco (15, 30, 60...)
--   work_days    -> días que se atiende, 1=lunes ... 7=domingo
-- ===========================================================
alter table public.businesses add column if not exists open_time    text    default '09:00';
alter table public.businesses add column if not exists close_time   text    default '18:00';
alter table public.businesses add column if not exists slot_minutes integer default 30;
alter table public.businesses add column if not exists work_days    text    default '[1][2][3][4][5][6]';


-- ===========================================================
-- 17) CATEGORÍAS POR TIPO (productos / servicios)
-- ===========================================================
alter table public.categories add column if not exists kind text not null default 'product';
