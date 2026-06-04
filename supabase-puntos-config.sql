-- Nuevas claves de configuracion para el sistema de puntos.
-- Ejecutar en Supabase SQL Editor.

INSERT INTO public.configuracion (clave, valor, descripcion)
VALUES
  ('monto_minimo_puntos', '100', 'Compra minima en tienda para ganar puntos'),
  ('puntos_por_100',      '10',  'Puntos que gana el cliente por cada Q100 de compra'),
  ('valor_punto',         '1',   'Valor en quetzales de cada punto al canjear')
ON CONFLICT (clave) DO UPDATE
SET valor       = excluded.valor,
    descripcion = excluded.descripcion,
    updated_at  = now();
