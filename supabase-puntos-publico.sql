-- Permite a clientes ver sus puntos desde la app de clientes (busqueda por DPI).
-- También permite cupones de regalo sin cliente vinculado.
-- Ejecutar en Supabase SQL Editor.

-- 1. Lectura publica de puntos (para Mis Puntos en app cliente)
drop policy if exists "public select puntos" on public.puntos;
create policy "public select puntos" on public.puntos
for select to public
using (true);

-- 2. Hacer cliente_id nullable en cupones (para cupones de regalo sin cliente vinculado)
alter table public.cupones alter column cliente_id drop not null;
