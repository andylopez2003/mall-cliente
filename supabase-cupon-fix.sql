-- Solucion definitiva para cupones de un solo uso.
-- Ejecutar en Supabase SQL Editor.

-- 1. Columna en pedidos para saber que cupon uso ese pedido (para poder restaurarlo si se cancela)
alter table public.pedidos add column if not exists cupon_canjeado_id uuid
  references public.cupones(id) on delete set null;

-- 2. Politica: el cliente (anonimo) puede marcar un cupon activo como canjeado
--    Esto ocurre de inmediato al confirmar el pedido, bloqueando el reuso.
drop policy if exists "public canjear cupon activo" on public.cupones;
drop policy if exists "public reservar cupon" on public.cupones;

create policy "public canjear cupon activo" on public.cupones
for update to public
using  (estado = 'activo')
with check (estado = 'canjeado');
