-- Etapa 3 · Ahorros: aportes periódicos y estado de las metas (plan 3.15; issue #8, supuestos 14 y 18).
-- reglas_aporte no tiene fecha de inicio: la serie se ancla en su próxima fecha y su día del mes,
-- que es suficiente para semanal, quincenal y mensual.

-- Al crear una regla, la próxima fecha es la primera de la serie desde la fecha pedida.
create function public.reglas_aporte_proxima_inicial()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Con datos incompletos o inválidos no calcula nada: así responden RLS y las restricciones.
  if new.frecuencia is null or new.proxima_fecha is null then
    return new;
  end if;
  new.proxima_fecha := public.primera_fecha_serie_desde(new.frecuencia, 1, new.dia, new.proxima_fecha, new.proxima_fecha);
  return new;
exception
  when raise_exception then
    return new;
end;
$$;

create trigger reglas_aporte_proxima_inicial
  before insert on public.reglas_aporte
  for each row execute function public.reglas_aporte_proxima_inicial();

-- Genera los aportes pendientes de p_user_id hasta p_hoy (incluido) y devuelve cuántos creó.
-- El pendiente es la entrada a la bolsa de la meta; si el origen es una bolsa, la salida se crea
-- al confirmar. No genera para metas pausadas o eliminadas, ni después de la fecha final.
-- Sin duplicar: unique (regla_aporte_id, fecha_programada). Solo la llama el servidor.
create function public.generar_aportes_de(p_user_id uuid, p_hoy date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  r public.reglas_aporte;
  m public.metas_ahorro;
  v_total integer := 0;
  v_filas integer;
begin
  for r in
    select ra.* from public.reglas_aporte ra
      join public.metas_ahorro ma on ma.id = ra.meta_id
     where ra.user_id = p_user_id and not ra.pausada and not ma.pausada and ma.eliminada_at is null
       and ra.proxima_fecha <= p_hoy
       for update of ra
  loop
    select * into m from public.metas_ahorro where id = r.meta_id;
    while r.proxima_fecha <= p_hoy and r.proxima_fecha <= m.fecha_final loop
      insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, medio_id,
                                            afecta_presupuesto, regla_aporte_id, fecha_programada, estado)
      values (r.user_id, m.bolsa_id, 'aporte', 'entrada', r.proxima_fecha, r.valor, m.id, r.medio_id,
              r.afecta_presupuesto, r.id, r.proxima_fecha, 'pendiente')
      on conflict (regla_aporte_id, fecha_programada) do nothing;
      get diagnostics v_filas = row_count;
      v_total := v_total + v_filas;
      r.proxima_fecha := public.primera_fecha_serie_desde(r.frecuencia, 1, r.dia, r.proxima_fecha, r.proxima_fecha + 1);
    end loop;
    update public.reglas_aporte set proxima_fecha = r.proxima_fecha where id = r.id;
  end loop;
  return v_total;
end;
$$;

-- Aporte pendiente de quien llama (RLS aplica) o error.
create function public.aporte_pendiente(p_movimiento_id uuid)
returns public.movimientos_bolsa
language plpgsql
set search_path = ''
as $$
declare
  v public.movimientos_bolsa;
begin
  select * into v from public.movimientos_bolsa
   where id = p_movimiento_id and regla_aporte_id is not null
     for update;
  if not found then
    raise exception 'aporte.no_existe' using errcode = 'P0002';
  end if;
  if v.estado <> 'pendiente' then
    raise exception 'pendiente.ya_confirmado' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Confirma un aporte pendiente, con el valor ajustado si se envía, solo esta vez o en adelante
-- (3.15). Si el origen de la regla es una bolsa, crea la salida de esa bolsa enlazada al aporte.
create function public.confirmar_aporte(
  p_movimiento_id uuid,
  p_valor bigint default null,
  p_en_adelante boolean default false
)
returns public.movimientos_bolsa
language plpgsql
set search_path = ''
as $$
declare
  v public.movimientos_bolsa;
  r public.reglas_aporte;
begin
  v := public.aporte_pendiente(p_movimiento_id);
  select * into r from public.reglas_aporte where id = v.regla_aporte_id;

  update public.movimientos_bolsa
     set estado = 'confirmado', valor = coalesce(p_valor, valor)
   where id = v.id
  returning * into v;

  if r.bolsa_id is not null then
    insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, enlace_id)
    values (v.user_id, r.bolsa_id, 'aporte', 'salida', v.fecha, v.valor, v.meta_id, v.id);
  end if;

  if p_en_adelante and p_valor is not null then
    update public.reglas_aporte set valor = p_valor where id = r.id;
  end if;
  return v;
end;
$$;

-- Omite un aporte pendiente: no mueve dinero y la fecha final de la meta no cambia (3.15).
create function public.omitir_aporte(p_movimiento_id uuid)
returns public.movimientos_bolsa
language plpgsql
set search_path = ''
as $$
declare
  v public.movimientos_bolsa;
begin
  v := public.aporte_pendiente(p_movimiento_id);
  update public.movimientos_bolsa set estado = 'omitido' where id = v.id returning * into v;
  return v;
end;
$$;

-- Estado de cada meta vigente a p_hoy (3.15, supuesto 18).
-- - ideal: lineal desde el saldo inicial el día de creación hasta el monto en la fecha final.
-- - aporte sugerido: lo que falta ÷ aportes de la regla que quedan hasta la fecha final.
-- - proyección: a este ritmo (lo aportado desde la creación ÷ días transcurridos) la cumple en…
create function public.estado_metas(p_hoy date default public.hoy_bogota())
returns table (
  meta_id uuid,
  user_id uuid,
  nombre text,
  monto_meta bigint,
  fecha_final date,
  saldo bigint,
  ritmo_ideal bigint,
  aportes_restantes integer,
  aporte_sugerido bigint,
  fecha_proyectada date,
  estado text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.metas_ahorro;
  r public.reglas_aporte;
  v_inicio date;
  v_inicial bigint;
  v_fecha date;
  v_falta bigint;
  v_dias integer;
begin
  for m in
    select * from public.metas_ahorro ma where ma.eliminada_at is null order by ma.id
  loop
    meta_id := m.id; user_id := m.user_id; nombre := m.nombre;
    monto_meta := m.monto_meta; fecha_final := m.fecha_final;
    v_inicio := (m.created_at at time zone 'America/Bogota')::date;

    select s.saldo into saldo from public.saldos_bolsa s where s.bolsa_id = m.bolsa_id;
    select coalesce(sum(mb.valor), 0) into v_inicial from public.movimientos_bolsa mb
     where mb.bolsa_id = m.bolsa_id and mb.tipo = 'saldo_inicial';
    v_falta := greatest(m.monto_meta - saldo, 0);

    ritmo_ideal := case
      when p_hoy >= m.fecha_final or m.fecha_final <= v_inicio then m.monto_meta
      when p_hoy <= v_inicio then v_inicial
      else v_inicial + (m.monto_meta - v_inicial) * (p_hoy - v_inicio) / (m.fecha_final - v_inicio)
    end;

    -- Aportes que quedan de la regla activa, desde hoy (o su próxima fecha) hasta la fecha final.
    aportes_restantes := null;
    select * into r from public.reglas_aporte ra where ra.meta_id = m.id and not ra.pausada
     order by ra.created_at limit 1;
    if found then
      aportes_restantes := 0;
      v_fecha := public.primera_fecha_serie_desde(r.frecuencia, 1, r.dia, r.proxima_fecha,
                                                  greatest(r.proxima_fecha, p_hoy));
      while v_fecha <= m.fecha_final loop
        aportes_restantes := aportes_restantes + 1;
        v_fecha := public.primera_fecha_serie_desde(r.frecuencia, 1, r.dia, r.proxima_fecha, v_fecha + 1);
      end loop;
    end if;
    aporte_sugerido := case
      when aportes_restantes is null then null
      when aportes_restantes = 0 then v_falta
      else (v_falta + aportes_restantes - 1) / aportes_restantes
    end;

    -- Proyección: días que faltan al ritmo promedio (redondeo hacia arriba).
    v_dias := p_hoy - v_inicio;
    fecha_proyectada := case
      when v_falta = 0 or v_dias <= 0 or saldo - v_inicial <= 0 then null
      else p_hoy + ((v_falta * v_dias + (saldo - v_inicial) - 1) / (saldo - v_inicial))::integer
    end;

    estado := case
      when saldo >= m.monto_meta then 'cumplida'
      when m.pausada then 'pausada'
      when saldo < ritmo_ideal then 'atrasada'
      else 'al_dia'
    end;
    return next;
  end loop;
end;
$$;

revoke all on function public.reglas_aporte_proxima_inicial() from public, anon, authenticated;
revoke all on function public.generar_aportes_de(uuid, date) from public, anon, authenticated;
revoke all on function public.aporte_pendiente(uuid) from public, anon;
revoke all on function public.confirmar_aporte(uuid, bigint, boolean) from public, anon;
revoke all on function public.omitir_aporte(uuid) from public, anon;
revoke all on function public.estado_metas(date) from public, anon;
grant execute on function public.aporte_pendiente(uuid) to authenticated;
grant execute on function public.confirmar_aporte(uuid, bigint, boolean) to authenticated;
grant execute on function public.omitir_aporte(uuid) to authenticated;
grant execute on function public.estado_metas(date) to authenticated;
