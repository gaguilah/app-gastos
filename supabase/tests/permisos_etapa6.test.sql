-- Permisos de las vistas y funciones de la Etapa 6 (issue #11): las de la app son para
-- authenticated y nunca para anon; las vistas son de solo lectura.
begin;
select plan(2);

select is_empty($$
  select f from unnest(array[
    'public.crear_bolsa(text, bigint, date)', 'public.renombrar_bolsa(uuid, text)',
    'public.recargar_bolsa(uuid, bigint, date, text)', 'public.trasladar(uuid, uuid, bigint, date, text)',
    'public.eliminar_bolsa(uuid, uuid, date)', 'public.vista_previa_periodos(integer, date)',
    'public.cambiar_presupuesto_defecto(bigint, boolean, date)', 'public.ajustar_presupuesto_periodo(uuid, bigint, text)',
    'public.sugerir_aporte(bigint, bigint, date, text, integer, date)',
    'public.crear_meta(text, text, bigint, date, bigint, bigint, text, integer, uuid, uuid, boolean, date)',
    'public.editar_meta(uuid, text, text, bigint, date, bigint, text, integer, uuid, uuid, boolean, date)',
    'public.aportar_meta(uuid, bigint, uuid, uuid, boolean, date, text)',
    'public.retirar_meta(uuid, bigint, uuid, text, date)', 'public.pausar_meta(uuid)',
    'public.reanudar_meta(uuid, date)', 'public.eliminar_meta(uuid, uuid, date)']) f
   where not has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') $$,
  'las funciones de la Etapa 6 son para authenticated y no para anon');

select is_empty($$
  select v from unnest(array['public.movimientos_de_bolsa', 'public.uso_bolsas']) v
   where not has_table_privilege('authenticated', v, 'select')
      or has_table_privilege('authenticated', v, 'insert, update, delete')
      or has_table_privilege('anon', v, 'select') $$,
  'las vistas nuevas son de solo lectura para authenticated y cerradas para anon');

select * from finish();
rollback;
