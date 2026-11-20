-- Etapa 3 · Alertas de presupuesto (plan 3.2; issue #8, supuesto 8).
-- Se registran en alertas_enviadas; el envío del push (uno solo, con el umbral mayor) es de la Etapa 12.
-- Porcentaje = (base − disponible) × 100 ÷ base, en enteros, con base = presupuesto + ingresos a
-- presupuesto. Se registran todos los umbrales cruzados (70 a 100 cada 5) y 101 si se superó.
-- Base 0: no se avisa. Un umbral registrado no se borra aunque luego baje el porcentaje.

-- Registra los umbrales nuevos del período y devuelve cuántos registró.
create function public.registrar_alertas(p_periodo_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  d public.disponible_periodo;
  v_base bigint;
  v_usado bigint;
  v_porcentaje bigint;
  v_total integer;
begin
  select * into d from public.disponible_periodo where periodo_id = p_periodo_id;
  if not found then
    return 0;
  end if;
  v_base := d.presupuesto + d.ingresos_presupuesto;
  if v_base <= 0 then
    return 0;
  end if;
  v_usado := v_base - d.disponible;
  v_porcentaje := v_usado * 100 / v_base;  -- división entera: floor para valores positivos

  insert into public.alertas_enviadas (user_id, periodo_id, umbral)
  select d.user_id, d.periodo_id, u
    from (select generate_series(70, 100, 5) as u
          union all
          select 101 where v_usado > v_base) umbrales
   where u <= v_porcentaje or u = 101
  on conflict (periodo_id, umbral) do nothing;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Evalúa las alertas del período que contiene p_fecha para p_user_id.
create function public.registrar_alertas_en(p_user_id uuid, p_fecha date)
returns integer
language sql
set search_path = ''
as $$
  select coalesce(sum(public.registrar_alertas(p.id))::integer, 0)
    from public.periodos p
   where p.user_id = p_user_id and p_fecha between p.fecha_inicio and p.fecha_fin;
$$;

-- Triggers: gastos y aportes confirmados que afectan el presupuesto, y cambios del presupuesto.
create function public.alertas_por_movimiento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'confirmado' and new.afecta_presupuesto then
    perform public.registrar_alertas_en(new.user_id, new.fecha);
  end if;
  return null;
end;
$$;

create function public.alertas_por_presupuesto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.registrar_alertas(new.id);
  return null;
end;
$$;

create trigger gastos_alertas
  after insert or update of estado, valor, fecha, afecta_presupuesto on public.gastos
  for each row execute function public.alertas_por_movimiento();

create trigger movimientos_bolsa_alertas
  after insert or update of estado, valor, fecha, afecta_presupuesto on public.movimientos_bolsa
  for each row execute function public.alertas_por_movimiento();

create trigger periodos_alertas
  after update of presupuesto on public.periodos
  for each row when (new.presupuesto < old.presupuesto)
  execute function public.alertas_por_presupuesto();

-- Los triggers corren con los permisos de quien escribe, así que authenticated debe poder ejecutarlas;
-- con RLS, cada usuario solo puede registrar alertas de sus propios períodos.
revoke all on function public.registrar_alertas(uuid) from public, anon;
revoke all on function public.registrar_alertas_en(uuid, date) from public, anon;
grant execute on function public.registrar_alertas(uuid) to authenticated;
grant execute on function public.registrar_alertas_en(uuid, date) to authenticated;
revoke all on function public.alertas_por_movimiento() from public, anon, authenticated;
revoke all on function public.alertas_por_presupuesto() from public, anon, authenticated;
