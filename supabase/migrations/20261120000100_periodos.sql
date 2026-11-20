-- Etapa 3 · Períodos (plan 3.1, issue #8, supuestos 1 a 4).
-- Toda regla que depende de la fecha recibe "hoy" por parámetro; hoy_bogota() es solo el valor por defecto.

-- Hoy en la zona horaria de negocio.
create function public.hoy_bogota()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- Fecha del día p_dia en el mes de p_mes; si el día no existe en ese mes, el último día del mes.
create function public.dia_en_mes(p_mes date, p_dia integer)
returns date
language sql
immutable
set search_path = ''
as $$
  -- make_date en lugar de date_trunc, que pasaría por timestamptz y no sería inmutable.
  with mes as (
    select make_date(extract(year from p_mes)::integer, extract(month from p_mes)::integer, 1) as primero
  )
  select primero + (least(p_dia, extract(day from (primero + interval '1 month - 1 day'))::integer) - 1)
    from mes;
$$;

-- Período que contiene p_hoy con el día de inicio p_dia (supuesto 2).
create function public.calcular_periodo(p_hoy date, p_dia integer)
returns table (fecha_inicio date, fecha_fin date)
language sql
immutable
set search_path = ''
as $$
  with inicio as (
    select case
             when public.dia_en_mes(p_hoy, p_dia) <= p_hoy then public.dia_en_mes(p_hoy, p_dia)
             else public.dia_en_mes((p_hoy - interval '1 month')::date, p_dia)
           end as d
  )
  select d, public.dia_en_mes((d + interval '1 month')::date, p_dia) - 1
    from inicio;
$$;

-- Crea los períodos que falten hasta p_hoy para p_user_id y devuelve el que contiene p_hoy.
-- - Sin períodos: crea el de hoy.
-- - Con períodos: continúa desde el último sin huecos (supuesto 4); cada uno termina el día antes
--   de la siguiente fecha con el día de inicio vigente, así un cambio de día de inicio no recorta
--   el período abierto y deja uno de transición (supuesto 3).
-- Corre con los permisos de quien llama (RLS aplica). La tarea diaria la llama como servidor.
create function public.asegurar_periodos_de(p_user_id uuid, p_hoy date)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  v_dia smallint;
  v_presupuesto bigint;
  v_ultimo date;
  v_inicio date;
  v_siguiente date;
  v_periodo public.periodos;
begin
  select dia_inicio, presupuesto_defecto into v_dia, v_presupuesto
    from public.perfiles where user_id = p_user_id;
  if not found then
    return null;
  end if;

  select max(fecha_fin) into v_ultimo from public.periodos where user_id = p_user_id;

  if v_ultimo is null then
    insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
    select p_user_id, c.fecha_inicio, c.fecha_fin, v_presupuesto
      from public.calcular_periodo(p_hoy, v_dia) c
    on conflict do nothing;
  else
    while v_ultimo < p_hoy loop
      v_inicio := v_ultimo + 1;
      v_siguiente := public.dia_en_mes(v_inicio, v_dia);
      if v_siguiente <= v_inicio then
        v_siguiente := public.dia_en_mes((v_inicio + interval '1 month')::date, v_dia);
      end if;
      insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
      values (p_user_id, v_inicio, v_siguiente - 1, v_presupuesto)
      on conflict do nothing;
      v_ultimo := v_siguiente - 1;
    end loop;
  end if;

  select * into v_periodo from public.periodos
   where user_id = p_user_id and p_hoy between fecha_inicio and fecha_fin;
  return v_periodo;
end;
$$;

-- Versión que llama la app: siempre para el usuario de la sesión, nunca para otro.
-- security definer porque asegurar_periodos_de no se expone por la API; el usuario queda fijo en auth.uid().
create function public.asegurar_periodos(p_hoy date default public.hoy_bogota())
returns public.periodos
language sql
security definer
set search_path = ''
as $$
  select * from public.asegurar_periodos_de((select auth.uid()), p_hoy);
$$;

revoke all on function public.hoy_bogota() from public, anon;
revoke all on function public.dia_en_mes(date, integer) from public, anon;
revoke all on function public.calcular_periodo(date, integer) from public, anon;
revoke all on function public.asegurar_periodos(date) from public, anon;
revoke all on function public.asegurar_periodos_de(uuid, date) from public, anon, authenticated;
grant execute on function public.hoy_bogota() to authenticated;
grant execute on function public.dia_en_mes(date, integer) to authenticated;
grant execute on function public.calcular_periodo(date, integer) to authenticated;
grant execute on function public.asegurar_periodos(date) to authenticated;
