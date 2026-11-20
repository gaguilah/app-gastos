-- Etapa 3 · Gastos periódicos (plan 3.6; issue #8, supuestos 9 a 14).
-- La regla es una plantilla: genera gastos pendientes de confirmar con su copia de los datos,
-- así editar la regla nunca cambia lo ya generado.

-- Primera fecha de la serie que cae en p_desde o después. Parte de una estimación del número
-- de repetición y avanza, para no recorrer la serie desde el inicio.
create function public.primera_fecha_serie_desde(
  p_frecuencia text,
  p_intervalo integer,
  p_dia integer,
  p_inicio date,
  p_desde date
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_dias integer := greatest(p_desde - p_inicio, 0);
  v_meses integer := greatest((extract(year from p_desde)::integer - extract(year from p_inicio)::integer) * 12
                              + extract(month from p_desde)::integer - extract(month from p_inicio)::integer, 0);
  v_n integer;
  v_fecha date;
begin
  v_n := case p_frecuencia
           when 'diaria' then v_dias
           when 'cada_n_dias' then v_dias / p_intervalo
           when 'semanal' then v_dias / 7
           when 'cada_n_semanas' then v_dias / (7 * p_intervalo)
           when 'mensual' then v_meses
           when 'bimestral' then v_meses / 2
           when 'trimestral' then v_meses / 3
           when 'anual' then v_meses / 12
           when 'cada_n_meses' then v_meses / p_intervalo
           when 'quincenal' then v_meses * 2
           else 0
         end;
  v_n := greatest(v_n - 2, 0);
  loop
    v_fecha := public.fecha_serie(p_frecuencia, p_intervalo, p_dia, p_inicio, v_n);
    exit when v_fecha >= p_desde;
    v_n := v_n + 1;
  end loop;
  return v_fecha;
end;
$$;

-- Al crear una regla, la próxima fecha es la primera de su serie (el cliente no la decide).
create function public.reglas_periodicas_proxima_inicial()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Con datos incompletos o inválidos no calcula nada: así responden RLS y las restricciones.
  if new.frecuencia is null or new.fecha_inicio is null then
    return new;
  end if;
  new.proxima_fecha := public.fecha_serie(new.frecuencia, new.intervalo, new.dia, new.fecha_inicio, 0);
  return new;
exception
  when raise_exception then
    return new;
end;
$$;

create trigger reglas_periodicas_proxima_inicial
  before insert on public.reglas_periodicas
  for each row execute function public.reglas_periodicas_proxima_inicial();

-- Genera los gastos pendientes de p_user_id hasta p_hoy (incluido) y devuelve cuántos creó.
-- Recupera fechas atrasadas, respeta pausas y repeticiones, y no duplica gracias a
-- unique (regla_id, fecha_programada). Solo la llama el servidor (tarea diaria).
create function public.generar_periodicos_de(p_user_id uuid, p_hoy date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  r public.reglas_periodicas;
  v_generados integer;
  v_total integer := 0;
  v_filas integer;
begin
  for r in
    select * from public.reglas_periodicas
     where user_id = p_user_id and not pausada and proxima_fecha <= p_hoy
     for update
  loop
    select count(*) into v_generados from public.gastos where regla_id = r.id;
    while r.proxima_fecha <= p_hoy
          and (r.repeticiones is null or v_generados < r.repeticiones) loop
      insert into public.gastos (user_id, titulo, fecha, valor, descripcion, estado, afecta_presupuesto,
                                 categoria_id, subcategoria_id, categoria_nombre, lugar_id, bolsa_id,
                                 medio_id, canal_id, regla_id, fecha_programada)
      values (r.user_id, r.titulo, r.proxima_fecha, r.valor, r.descripcion, 'pendiente', r.afecta_presupuesto,
              r.categoria_id, r.subcategoria_id, '', r.lugar_id, r.bolsa_id,
              r.medio_id, r.canal_id, r.id, r.proxima_fecha)
      on conflict (regla_id, fecha_programada) do nothing;
      get diagnostics v_filas = row_count;
      v_total := v_total + v_filas;
      v_generados := v_generados + v_filas;
      r.proxima_fecha := public.primera_fecha_serie_desde(r.frecuencia, r.intervalo, r.dia, r.fecha_inicio,
                                                          r.proxima_fecha + 1);
    end loop;
    update public.reglas_periodicas set proxima_fecha = r.proxima_fecha where id = r.id;
  end loop;
  return v_total;
end;
$$;

-- Reanuda una regla pausada: la próxima fecha salta a la primera de la serie desde hoy,
-- sin generar las del tiempo pausado (supuesto 12).
create function public.reanudar_regla(p_regla_id uuid, p_hoy date default public.hoy_bogota())
returns public.reglas_periodicas
language plpgsql
set search_path = ''
as $$
declare
  r public.reglas_periodicas;
begin
  select * into r from public.reglas_periodicas where id = p_regla_id for update;
  if not found then
    raise exception 'regla.no_existe' using errcode = 'P0002';
  end if;
  update public.reglas_periodicas
     set pausada = false,
         proxima_fecha = public.primera_fecha_serie_desde(frecuencia, intervalo, dia, fecha_inicio,
                                                          greatest(proxima_fecha, p_hoy))
   where id = p_regla_id
  returning * into r;
  return r;
end;
$$;

-- Confirma un gasto pendiente (periódico o cuota), con el valor ajustado si se envía (3.6, 3.8).
-- Si es una cuota, la marca como pagada. Corre con los permisos de quien llama.
create function public.confirmar_gasto_pendiente(p_gasto_id uuid, p_valor bigint default null)
returns public.gastos
language plpgsql
set search_path = ''
as $$
declare
  g public.gastos;
begin
  select * into g from public.gastos where id = p_gasto_id for update;
  if not found then
    raise exception 'gasto.no_existe' using errcode = 'P0002';
  end if;
  if g.estado <> 'pendiente' then
    raise exception 'pendiente.ya_confirmado' using errcode = 'P0001';
  end if;

  update public.gastos
     set estado = 'confirmado', valor = coalesce(p_valor, valor)
   where id = p_gasto_id
  returning * into g;

  if g.cuota_id is not null then
    update public.cuotas_deuda set pagada_at = now() where id = g.cuota_id;
  end if;
  return g;
end;
$$;

revoke all on function public.primera_fecha_serie_desde(text, integer, integer, date, date) from public, anon;
revoke all on function public.reglas_periodicas_proxima_inicial() from public, anon, authenticated;
revoke all on function public.generar_periodicos_de(uuid, date) from public, anon, authenticated;
revoke all on function public.reanudar_regla(uuid, date) from public, anon;
revoke all on function public.confirmar_gasto_pendiente(uuid, bigint) from public, anon;
grant execute on function public.primera_fecha_serie_desde(text, integer, integer, date, date) to authenticated;
grant execute on function public.reanudar_regla(uuid, date) to authenticated;
grant execute on function public.confirmar_gasto_pendiente(uuid, bigint) to authenticated;
