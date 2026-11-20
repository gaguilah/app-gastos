-- Etapa 3 · Tarea diaria con pg_cron (issue #8, supuesto 20).
-- Para cada usuario: asegura los períodos hasta hoy, genera periódicos, cuotas y aportes pendientes
-- y cierra los períodos vencidos. Es idempotente: correrla dos veces el mismo día no duplica nada,
-- y si dejó de correr unos días (por ejemplo, con el proyecto pausado) se pone al día.

create extension if not exists pg_cron with schema pg_catalog;

-- Lo de un usuario. Devuelve cuánto hizo.
create function public.tarea_diaria_de(p_user_id uuid, p_hoy date)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_periodicos integer;
  v_cuotas integer;
  v_aportes integer;
  v_cerrados integer;
begin
  perform public.asegurar_periodos_de(p_user_id, p_hoy);
  v_periodicos := public.generar_periodicos_de(p_user_id, p_hoy);
  v_cuotas := public.generar_cuotas_de(p_user_id, p_hoy);
  v_aportes := public.generar_aportes_de(p_user_id, p_hoy);
  -- Al final, para que el resumen vea todo lo generado.
  v_cerrados := public.cerrar_periodos_de(p_user_id, p_hoy);
  return jsonb_build_object('periodos_cerrados', v_cerrados, 'periodicos', v_periodicos,
                            'cuotas', v_cuotas, 'aportes', v_aportes);
end;
$$;

-- Todos los usuarios. Solo la corre el servidor (pg_cron); no se expone por la API.
create function public.tarea_diaria(p_hoy date default public.hoy_bogota())
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
  v_uno jsonb;
  v_total jsonb := '{"usuarios": 0, "periodos_cerrados": 0, "periodicos": 0, "cuotas": 0, "aportes": 0}'::jsonb;
begin
  for v_user in select user_id from public.perfiles order by user_id loop
    v_uno := public.tarea_diaria_de(v_user, p_hoy);
    select jsonb_object_agg(k, coalesce((v_total->>k)::integer, 0) + coalesce((v_uno->>k)::integer, 0))
      into v_total
      from jsonb_object_keys(v_total) k;
    v_total := jsonb_set(v_total, '{usuarios}', to_jsonb((v_total->>'usuarios')::integer + 1));
  end loop;
  return v_total;
end;
$$;

-- Ponerse al día al abrir la app, sin esperar a la tarea de la noche (por ejemplo, una regla que
-- empieza hoy). Siempre para el usuario de la sesión y con hoy en Bogotá.
-- security definer porque las funciones internas no se exponen; el usuario queda fijo en auth.uid().
create function public.ponerse_al_dia()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.tarea_diaria_de((select auth.uid()), public.hoy_bogota())
   where (select auth.uid()) is not null;
$$;

revoke all on function public.tarea_diaria_de(uuid, date) from public, anon, authenticated;
revoke all on function public.tarea_diaria(date) from public, anon, authenticated;
revoke all on function public.ponerse_al_dia() from public, anon;
grant execute on function public.ponerse_al_dia() to authenticated;

-- 00:10 en Bogotá (UTC−5, sin horario de verano) = 05:10 UTC. cron.schedule con el mismo nombre
-- reemplaza la programación, así que la migración se puede aplicar de nuevo sin duplicarla.
select cron.schedule('tarea-diaria', '10 5 * * *', 'select public.tarea_diaria()');
