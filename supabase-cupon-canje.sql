-- Permite que el cliente (usuario anonimo) marque su cupon como canjeado al usarlo en un pedido.
-- El cupon solo puede cambiar de 'activo' a 'canjeado' — nunca al reves.
-- Ejecutar en Supabase SQL Editor.

drop policy if exists "public canjear cupon activo" on public.cupones;
create policy "public canjear cupon activo" on public.cupones
for update to public
using  (estado = 'activo')
with check (estado = 'canjeado');
