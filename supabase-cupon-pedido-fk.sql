-- Asegura que cupones tenga columna pedido_id y su indice.
-- Ejecutar en Supabase SQL Editor.

alter table public.cupones
  add column if not exists pedido_id uuid references public.pedidos(id) on delete set null;

create index if not exists cupones_pedido_id_idx on public.cupones(pedido_id);
