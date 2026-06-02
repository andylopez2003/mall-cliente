-- Migracion para la app de clientes
-- Ejecutar en Supabase SQL Editor.

alter table public.pedidos
alter column cliente_id drop not null;

alter table public.usuarios
alter column id set default gen_random_uuid();

alter table public.usuarios
drop constraint if exists usuarios_email_key;

alter table public.usuarios
drop constraint if exists usuarios_telefono_key;

update public.usuarios
set email = null
where email = '';

alter table public.productos enable row level security;
alter table public.ofertas enable row level security;
alter table public.promociones enable row level security;
alter table public.configuracion enable row level security;
alter table public.usuarios enable row level security;
alter table public.pedidos enable row level security;
alter table public.detalle_pedidos enable row level security;
alter table public.cupones enable row level security;
alter table public.puntos enable row level security;

drop policy if exists "public read productos" on public.productos;
create policy "public read productos" on public.productos
for select to public
using (activo = true);

drop policy if exists "public read ofertas" on public.ofertas;
create policy "public read ofertas" on public.ofertas
for select to public
using (activa = true);

drop policy if exists "public read promociones" on public.promociones;
create policy "public read promociones" on public.promociones
for select to public
using (activa = true);

drop policy if exists "public read configuracion" on public.configuracion;
create policy "public read configuracion" on public.configuracion
for select to public
using (true);

drop policy if exists "public read clientes" on public.usuarios;
create policy "public read clientes" on public.usuarios
for select to public
using (rol = 'cliente');

drop policy if exists "public insert clientes" on public.usuarios;
create policy "public insert clientes" on public.usuarios
for insert to public
with check (rol = 'cliente');

drop policy if exists "public insert pedidos" on public.pedidos;
create policy "public insert pedidos" on public.pedidos
for insert to public
with check (true);

drop policy if exists "public select pedidos" on public.pedidos;
create policy "public select pedidos" on public.pedidos
for select to public
using (true);

drop policy if exists "public insert detalle pedidos" on public.detalle_pedidos;
create policy "public insert detalle pedidos" on public.detalle_pedidos
for insert to public
with check (true);

drop policy if exists "public select detalle pedidos" on public.detalle_pedidos;
create policy "public select detalle pedidos" on public.detalle_pedidos
for select to public
using (true);

drop policy if exists "public insert puntos" on public.puntos;
create policy "public insert puntos" on public.puntos
for insert to public
with check (true);

drop policy if exists "public select cupones" on public.cupones;
create policy "public select cupones" on public.cupones
for select to public
using (true);
