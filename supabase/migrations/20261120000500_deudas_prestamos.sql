-- Etapa 3 · Cuotas de deudas (3.8) y estado de préstamos (3.7). Issue #8, supuestos 14 a 17.
-- Sin intereses: el saldo es total − cuotas pagadas − abonos. Los estados se derivan.

-- Las cuotas fijas no pueden pasar del total: la última lleva la diferencia y no puede ser negativa.
create function public.deudas_validar_cuotas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.total_pagar - (new.num_cuotas - 1) * new.valor_cuota < 0 then
    raise exception 'deuda.cuotas_exceden_total' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger deudas_validar_cuotas
  before insert or update of total_pagar, num_cuotas, valor_cuota on public.deudas
  for each row execute function public.deudas_validar_cuotas();

-- Plan de cuotas de una deuda (supuesto 15): la primera en el primer día de pago posterior a la
-- fecha de la deuda, luego mensual (día 31 → último día en meses cortos). Todas valen valor_cuota
-- salvo la última, que lleva la diferencia hasta el total. La app la llama al crear la deuda y la
-- tarea diaria la repite para las deudas sin plan; si la deuda ya tiene cuotas, no hace nada.
-- Devuelve cuántas cuotas creó. Corre con los permisos de quien llama.
create function public.generar_plan_cuotas(p_deuda_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  d public.deudas;
  v_primera date;
  v_total integer;
begin
  select * into d from public.deudas where id = p_deuda_id for update;
  if not found then
    raise exception 'deuda.no_existe' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.cuotas_deuda where deuda_id = d.id) then
    return 0;
  end if;

  v_primera := public.primera_fecha_serie_desde('mensual', 1, d.dia_pago, d.fecha, d.fecha + 1);
  insert into public.cuotas_deuda (user_id, deuda_id, numero, fecha, valor)
  select d.user_id, d.id, k,
         public.fecha_serie('mensual', 1, d.dia_pago, v_primera, k - 1),
         case when k = d.num_cuotas then d.total_pagar - (d.num_cuotas - 1) * d.valor_cuota else d.valor_cuota end
    from generate_series(1, d.num_cuotas) k;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Crea los gastos pendientes de las cuotas que llegaron hasta p_hoy (incluido) y devuelve cuántos.
-- El título es el nombre de la persona o entidad; categoría, origen, canal y "afecta el presupuesto"
-- salen de la deuda. Sin duplicar: unique (cuota_id) en gastos. Solo la llama el servidor.
create function public.generar_cuotas_de(p_user_id uuid, p_hoy date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_total integer;
begin
  -- Red de seguridad: deudas que quedaron sin plan de cuotas.
  perform public.generar_plan_cuotas(d.id)
     from public.deudas d
    where d.user_id = p_user_id
      and not exists (select 1 from public.cuotas_deuda c where c.deuda_id = d.id);

  insert into public.gastos (user_id, titulo, fecha, valor, estado, afecta_presupuesto, categoria_id,
                             categoria_nombre, bolsa_id, medio_id, canal_id, cuota_id)
  select c.user_id, p.nombre, c.fecha, c.valor, 'pendiente', d.afecta_presupuesto, d.categoria_id,
         '', d.bolsa_id, d.medio_id, d.canal_id, c.id
    from public.cuotas_deuda c
    join public.deudas d on d.id = c.deuda_id
    join public.personas p on p.id = d.persona_id
   where c.user_id = p_user_id and c.fecha <= p_hoy and c.pagada_at is null
     and not exists (select 1 from public.gastos g where g.cuota_id = c.id)
  on conflict (cuota_id) do nothing;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Estado de cada deuda (3.8).
create view public.estado_deudas
with (security_invoker = on)
as
select t.*,
       t.total_pagar - t.pagado_cuotas - t.abonos as saldo,
       case when t.total_pagar - t.pagado_cuotas - t.abonos <= 0 then 'pagada' else 'activa' end as estado
  from (
    select d.id as deuda_id, d.user_id, d.persona_id, d.total_pagar, d.num_cuotas,
           coalesce((select sum(g.valor) from public.cuotas_deuda c
                       join public.gastos g on g.cuota_id = c.id and g.estado = 'confirmado'
                      where c.deuda_id = d.id), 0)::bigint as pagado_cuotas,
           coalesce((select sum(a.valor) from public.abonos_deuda a where a.deuda_id = d.id), 0)::bigint as abonos,
           (select count(*)::integer from public.cuotas_deuda c
             where c.deuda_id = d.id and c.pagada_at is not null) as cuotas_pagadas,
           (select min(c.fecha) from public.cuotas_deuda c
             where c.deuda_id = d.id and c.pagada_at is null) as proxima_cuota,
           (select max(c.fecha) from public.cuotas_deuda c
             where c.deuda_id = d.id and c.pagada_at is null) as fecha_ultima_cuota
      from public.deudas d
  ) t;

-- Estado de cada préstamo (3.7): lo cobrado son los ingresos ligados al préstamo.
create view public.estado_prestamos
with (security_invoker = on)
as
select t.*,
       greatest(t.monto - t.cobrado, 0) as saldo,
       case
         when t.no_recuperado then 'no_recuperado'
         when t.cobrado >= t.monto then 'pagado'
         when t.cobrado > 0 then 'parcial'
         else 'pendiente'
       end as estado
  from (
    select pr.id as prestamo_id, pr.user_id, pr.persona_id, pr.monto, pr.fecha, pr.fecha_acordada,
           pr.no_recuperado,
           coalesce((select sum(i.valor) from public.ingresos i where i.prestamo_id = pr.id), 0)::bigint as cobrado
      from public.prestamos pr
  ) t;

revoke all on function public.deudas_validar_cuotas() from public, anon, authenticated;
revoke all on function public.generar_plan_cuotas(uuid) from public, anon;
grant execute on function public.generar_plan_cuotas(uuid) to authenticated;
revoke all on function public.generar_cuotas_de(uuid, date) from public, anon, authenticated;
revoke all on public.estado_deudas, public.estado_prestamos from public, anon, authenticated;
grant select on public.estado_deudas, public.estado_prestamos to authenticated;
