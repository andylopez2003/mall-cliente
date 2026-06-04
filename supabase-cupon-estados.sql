-- Manejo completo del ciclo de vida del cupon.
-- Ejecutar en Supabase SQL Editor.

-- 1. Agregar estado 'en_uso' al cupon (activo mientras el pedido esta pendiente)
alter table public.cupones drop constraint if exists cupones_estado_check;
alter table public.cupones add constraint cupones_estado_check
  check (estado in ('activo', 'en_uso', 'canjeado', 'vencido', 'cancelado'));

-- 2. Agregar columna que registra que cupon fue usado en cada pedido
alter table public.pedidos add column if not exists cupon_canjeado_id uuid
  references public.cupones(id) on delete set null;

-- 3. Politica: el cliente (anonimo) solo puede reservar un cupon (activo -> en_uso)
--    El resto de transiciones (en_uso -> canjeado, en_uso -> activo) las hace el admin autenticado.
drop policy if exists "public canjear cupon activo" on public.cupones;
drop policy if exists "public reservar cupon" on public.cupones;
create policy "public reservar cupon" on public.cupones
for update to public
using  (estado = 'activo')
with check (estado = 'en_uso');
