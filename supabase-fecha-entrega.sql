-- Agrega campo fecha_entrega a pedidos para soportar pedidos anticipados (otro dia).
-- Ejecutar en Supabase SQL Editor.

alter table public.pedidos
  add column if not exists fecha_entrega date;

-- Rellenar pedidos existentes usando la fecha en que se crearon
update public.pedidos
  set fecha_entrega = date(created_at)
  where fecha_entrega is null;

-- Indice para consultas rapidas por fecha de entrega
create index if not exists pedidos_fecha_entrega_idx on public.pedidos(fecha_entrega);
