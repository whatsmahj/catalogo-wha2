-- ===========================================================
-- Catalogo Wha — ACTUALIZACIÓN DE LA BASE DE DATOS
-- -----------------------------------------------------------
-- Pega TODO este archivo en el SQL Editor de Supabase y pulsa Run.
-- Es seguro repetirlo las veces que quieras: todo usa "if not exists".
-- No borra ni modifica ningún dato que ya tengas.
-- ===========================================================


-- ===========================================================
-- 12) PRODUCTOS Y SERVICIOS
-- -----------------------------------------------------------
-- kind = 'product' (producto físico) | 'service' (servicio)
-- ===========================================================
alter table public.products add column if not exists kind text not null default 'product';
create index if not exists products_kind_idx on public.products(kind);


-- ===========================================================
-- 13) SERVICIOS: DURACIÓN Y MODALIDAD
-- -----------------------------------------------------------
--   duration -> "2 horas", "1 día"...
--   modality -> "A domicilio", "En local", "Online"...
-- ===========================================================
alter table public.products add column if not exists duration text;
alter table public.products add column if not exists modality text;


-- ===========================================================
-- 14) DATOS DEL CLIENTE EN EL PEDIDO
-- ===========================================================
alter table public.orders add column if not exists customer_phone   text;
alter table public.orders add column if not exists customer_address text;
alter table public.orders add column if not exists customer_city    text;


-- ===========================================================
-- 15) CITAS PARA SERVICIOS
-- -----------------------------------------------------------
--   bookable       -> el servicio admite reservar fecha y hora
--   appointment_at -> fecha y hora de la cita del pedido
-- ===========================================================
alter table public.products add column if not exists bookable boolean not null default false;
alter table public.orders   add column if not exists appointment_at timestamptz;


-- ===========================================================
-- COMPROBACIÓN — debe devolver 2, 3 y 2
-- ===========================================================
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'products'
       and column_name in ('kind', 'duration', 'modality'))          as productos_columnas,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'orders'
       and column_name in ('customer_phone', 'customer_address', 'customer_city')) as pedidos_cliente,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'products'
       and column_name = 'bookable')                                 as reservas,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'orders'
       and column_name = 'appointment_at')                           as cita_pedido;
