-- Etapa 3 · Saldos de bolsas, disponible del período y ajuste de saldo
-- (plan 3.1, 3.4 y 3.15; issue #8, supuestos 5 a 7). Todo se deriva de los movimientos.

-- Saldo de cada bolsa = movimientos confirmados (entradas − salidas) + ingresos con destino la bolsa
-- − gastos confirmados con origen la bolsa. No depende del período; puede ser negativo.
create view public.saldos_bolsa
with (security_invoker = on)
as
select b.id as bolsa_id,
       b.user_id,
       (coalesce((select sum(case when m.sentido = 'entrada' then m.valor else -m.valor end)
                   from public.movimientos_bolsa m
                  where m.bolsa_id = b.id and m.estado = 'confirmado'), 0)
     + coalesce((select sum(i.valor) from public.ingresos i where i.bolsa_id = b.id), 0)
     - coalesce((select sum(g.valor) from public.gastos g
                  where g.bolsa_id = b.id and g.estado = 'confirmado'), 0))::bigint as saldo
  from public.bolsas b;

-- Disponible = presupuesto + ingresos a presupuesto − gastos confirmados que afectan el presupuesto
-- − aportes confirmados desde medio directo que afectan el presupuesto. Los aportes van aparte
-- porque no son gasto en las estadísticas.
create view public.disponible_periodo
with (security_invoker = on)
as
select t.periodo_id, t.user_id, t.fecha_inicio, t.fecha_fin, t.presupuesto,
       t.ingresos_presupuesto, t.gastado, t.aportes_presupuesto,
       t.presupuesto + t.ingresos_presupuesto - t.gastado - t.aportes_presupuesto as disponible
  from (
    select p.id as periodo_id, p.user_id, p.fecha_inicio, p.fecha_fin, p.presupuesto,
           coalesce((select sum(i.valor) from public.ingresos i
                      where i.user_id = p.user_id and i.bolsa_id is null
                        and i.fecha between p.fecha_inicio and p.fecha_fin), 0)::bigint as ingresos_presupuesto,
           coalesce((select sum(g.valor) from public.gastos g
                      where g.user_id = p.user_id and g.estado = 'confirmado' and g.afecta_presupuesto
                        and g.fecha between p.fecha_inicio and p.fecha_fin), 0)::bigint as gastado,
           coalesce((select sum(m.valor) from public.movimientos_bolsa m
                      where m.user_id = p.user_id and m.tipo = 'aporte' and m.afecta_presupuesto
                        and m.estado = 'confirmado'
                        and m.fecha between p.fecha_inicio and p.fecha_fin), 0)::bigint as aportes_presupuesto
      from public.periodos p
  ) t;

-- Los índices (user_id, fecha) de gastos, ingresos y movimientos_bolsa ya existen desde la Etapa 2.

-- Ajusta una bolsa al saldo contado (3.4). Si falta dinero, crea un gasto "Gasto desconocido"
-- por la diferencia; si sobra, un movimiento de ajuste de entrada; si cuadra, nada.
-- Devuelve el id del gasto o del movimiento creado, o null. Corre con los permisos de quien llama.
create function public.ajustar_saldo(
  p_bolsa_id uuid,
  p_saldo_real bigint,
  p_fecha date default public.hoy_bogota(),
  p_nota text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
  v_saldo bigint;
  v_categoria public.categorias;
  v_id uuid;
begin
  if p_saldo_real is null or p_saldo_real < 0 then
    raise exception 'ajuste.saldo_invalido' using errcode = 'P0001';
  end if;

  select s.user_id, s.saldo into v_user, v_saldo
    from public.saldos_bolsa s where s.bolsa_id = p_bolsa_id;
  if not found then
    raise exception 'bolsa.no_existe' using errcode = 'P0002';
  end if;

  if p_saldo_real < v_saldo then
    select * into v_categoria from public.categorias
     where user_id = v_user and clave_sistema = 'gasto_desconocido';
    insert into public.gastos (user_id, titulo, fecha, valor, descripcion, categoria_id, categoria_nombre,
                               bolsa_id, es_ajuste, saldo_real)
    values (v_user, coalesce(nullif(btrim(p_nota), ''), v_categoria.nombre), p_fecha, v_saldo - p_saldo_real,
            p_nota, v_categoria.id, v_categoria.nombre, p_bolsa_id, true, p_saldo_real)
    returning id into v_id;
  elsif p_saldo_real > v_saldo then
    insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, nota, saldo_real)
    values (v_user, p_bolsa_id, 'ajuste', 'entrada', p_fecha, p_saldo_real - v_saldo, p_nota, p_saldo_real)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on public.saldos_bolsa, public.disponible_periodo from public, anon, authenticated;
grant select on public.saldos_bolsa, public.disponible_periodo to authenticated;
revoke all on function public.ajustar_saldo(uuid, bigint, date, text) from public, anon;
grant execute on function public.ajustar_saldo(uuid, bigint, date, text) to authenticated;
