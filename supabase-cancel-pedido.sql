-- Permite a clientes cancelar sus propios pedidos que estén en estado pendiente.
-- Ejecutar en Supabase SQL Editor.

drop policy if exists "public cancel pedido pendiente" on public.pedidos;
create policy "public cancel pedido pendiente" on public.pedidos
for update to public
using  (estado = 'pendiente')
with check (estado = 'cancelado');
