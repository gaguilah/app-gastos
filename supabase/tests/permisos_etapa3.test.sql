-- Permisos de las vistas y funciones de la Etapa 3 (issue #8, supuesto 20): lo interno solo lo
-- corre el servidor; lo que llama la app es para authenticated y nunca para anon.
begin;
select plan(5);

-- Funciones internas: ni anon ni authenticated pueden ejecutarlas.
select is_empty($$
  select f from unnest(array[
    'public.asegurar_periodos_de(uuid, date)', 'public.generar_periodicos_de(uuid, date)',
    'public.generar_cuotas_de(uuid, date)', 'public.generar_aportes_de(uuid, date)',
    'public.cerrar_periodo(uuid)', 'public.cerrar_periodos_de(uuid, date)',
    'public.tarea_diaria_de(uuid, date)', 'public.tarea_diaria(date)']) f
   where has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') $$,
  'las funciones internas (generación, cierre y tarea diaria) no se pueden llamar por la API');

-- Funciones para la app: authenticated sí, anon no.
select is_empty($$
  select f from unnest(array[
    'public.hoy_bogota()', 'public.calcular_periodo(date, integer)', 'public.asegurar_periodos(date)',
    'public.fecha_serie(text, integer, integer, date, integer)', 'public.ajustar_saldo(uuid, bigint, date, text)',
    'public.reanudar_regla(uuid, date)', 'public.confirmar_gasto_pendiente(uuid, bigint)',
    'public.generar_plan_cuotas(uuid)', 'public.confirmar_aporte(uuid, bigint, boolean)',
    'public.omitir_aporte(uuid)', 'public.estado_metas(date)', 'public.ponerse_al_dia()']) f
   where not has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') $$,
  'las funciones de la app son para authenticated y no para anon');

-- Vistas: authenticated solo lee; anon nada.
select is_empty($$
  select v from unnest(array['public.saldos_bolsa', 'public.disponible_periodo',
                             'public.estado_deudas', 'public.estado_prestamos']) v
   where not has_table_privilege('authenticated', v, 'select')
      or has_table_privilege('authenticated', v, 'insert, update, delete')
      or has_table_privilege('anon', v, 'select') $$,
  'las vistas son de solo lectura para authenticated y cerradas para anon');

-- Las vistas respetan RLS.
select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce('security_invoker=on' = any(c.reloptions) or 'security_invoker=true' = any(c.reloptions), false) $$,
  'todas las vistas de public tienen security_invoker');

-- Las funciones security definer fijan search_path vacío.
select is_empty($$
  select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not coalesce('search_path=""' = any(p.proconfig), false) $$,
  'toda función security definer de public tiene search_path vacío');

select * from finish();
rollback;
