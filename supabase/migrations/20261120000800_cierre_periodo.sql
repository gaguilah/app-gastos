-- Etapa 3 · Cierre de período y resumen (plan 3.1; issue #8, supuesto 19).
-- El resumen se guarda en periodos.resumen (jsonb). La parte de dinero se recalcula si llega algo
-- tardío con fecha del período cerrado; préstamos y cuotas pendientes quedan como al cierre.

-- Parte de dinero del resumen: presupuesto, ingresos, gastado, saldo y gasto por categoría.
create function public.resumen_dinero(p_periodo_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'presupuesto', d.presupuesto,
    'ingresos_presupuesto', d.ingresos_presupuesto,
    'ingresos_estadisticas', coalesce((select sum(i.valor) from public.ingresos i
                                        where i.user_id = d.user_id and i.cuenta_estadisticas
                                          and i.fecha between d.fecha_inicio and d.fecha_fin), 0),
    'gastado', d.gastado,
    'aportes_presupuesto', d.aportes_presupuesto,
    'saldo', d.disponible,
    -- Todos los gastos confirmados, también los que no afectan el presupuesto (estadística),
    -- con el nombre, ícono y color copiados al registrarlos.
    'por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', c.nombre, 'icono', c.icono, 'color', c.color, 'total', c.total)
                       order by c.total desc, c.nombre)
        from (select g.categoria_nombre as nombre, g.categoria_icono as icono, g.categoria_color as color,
                     sum(g.valor) as total
                from public.gastos g
               where g.user_id = d.user_id and g.estado = 'confirmado'
                 and g.fecha between d.fecha_inicio and d.fecha_fin
               group by g.categoria_nombre, g.categoria_icono, g.categoria_color) c), '[]'::jsonb)
  )
  from public.disponible_periodo d
  where d.periodo_id = p_periodo_id;
$$;

-- Cierra un período: guarda el resumen completo con lo pendiente en ese momento.
create function public.cerrar_periodo(p_periodo_id uuid)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  p public.periodos;
begin
  select * into p from public.periodos where id = p_periodo_id for update;
  if not found then
    raise exception 'periodo.no_existe' using errcode = 'P0002';
  end if;
  if p.cerrado_at is not null then
    return p;
  end if;

  update public.periodos
     set cerrado_at = now(),
         resumen = public.resumen_dinero(p.id) || jsonb_build_object(
           'prestamos_por_cobrar', (
             select jsonb_build_object('cantidad', count(*), 'saldo', coalesce(sum(e.saldo), 0))
               from public.estado_prestamos e
              where e.user_id = p.user_id and e.fecha <= p.fecha_fin
                and e.estado in ('pendiente', 'parcial')),
           'cuotas_pendientes', (
             select jsonb_build_object('cantidad', count(*), 'valor', coalesce(sum(c.valor), 0))
               from public.cuotas_deuda c
              where c.user_id = p.user_id and c.pagada_at is null))
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- Cierra los períodos vencidos (fecha_fin < p_hoy) de p_user_id y devuelve cuántos. Solo servidor.
create function public.cerrar_periodos_de(p_user_id uuid, p_hoy date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_total integer := 0;
begin
  for v_id in
    select id from public.periodos
     where user_id = p_user_id and cerrado_at is null and fecha_fin < p_hoy
     order by fecha_inicio
  loop
    perform public.cerrar_periodo(v_id);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

-- Recalcula la parte de dinero del período cerrado que contiene p_fecha.
create function public.recalcular_resumen_en(p_user_id uuid, p_fecha date)
returns void
language sql
set search_path = ''
as $$
  update public.periodos p
     set resumen = p.resumen || public.resumen_dinero(p.id)
   where p.user_id = p_user_id and p.cerrado_at is not null
     and p_fecha between p.fecha_inicio and p.fecha_fin;
$$;

create function public.resumen_por_movimiento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_resumen_en(old.user_id, old.fecha);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.fecha <> old.fecha) then
    perform public.recalcular_resumen_en(new.user_id, new.fecha);
  end if;
  return null;
end;
$$;

create function public.resumen_por_presupuesto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cerrado_at is not null then
    perform public.recalcular_resumen_en(new.user_id, new.fecha_inicio);
  end if;
  return null;
end;
$$;

create trigger gastos_resumen
  after insert or update or delete on public.gastos
  for each row execute function public.resumen_por_movimiento();

create trigger ingresos_resumen
  after insert or update or delete on public.ingresos
  for each row execute function public.resumen_por_movimiento();

create trigger movimientos_bolsa_resumen
  after insert or update or delete on public.movimientos_bolsa
  for each row execute function public.resumen_por_movimiento();

create trigger periodos_resumen
  after update of presupuesto on public.periodos
  for each row execute function public.resumen_por_presupuesto();

-- Los triggers corren con los permisos de quien escribe; con RLS, cada usuario solo recalcula lo suyo.
revoke all on function public.resumen_dinero(uuid) from public, anon;
revoke all on function public.recalcular_resumen_en(uuid, date) from public, anon;
grant execute on function public.resumen_dinero(uuid) to authenticated;
grant execute on function public.recalcular_resumen_en(uuid, date) to authenticated;
revoke all on function public.cerrar_periodo(uuid) from public, anon, authenticated;
revoke all on function public.cerrar_periodos_de(uuid, date) from public, anon, authenticated;
revoke all on function public.resumen_por_movimiento() from public, anon, authenticated;
revoke all on function public.resumen_por_presupuesto() from public, anon, authenticated;
