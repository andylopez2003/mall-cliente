-- Permite a clientes editar sus propios pedidos pendientes (dirección y teléfono).
-- Ejecutar en Supabase SQL Editor.

drop policy if exists "public update pedido pendiente" on public.pedidos;
create policy "public update pedido pendiente" on public.pedidos
for update to public
using (estado = 'pendiente')
with check (estado = 'pendiente');
