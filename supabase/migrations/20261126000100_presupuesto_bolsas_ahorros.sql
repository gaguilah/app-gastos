-- Etapa 6 (issue #11): presupuesto y período, ingresos, bolsas y ahorros.
-- Reglas 3.1 (día de inicio, presupuesto por defecto y ajuste del período), 3.2 (alertas al bajar
-- un ingreso al presupuesto), 3.4 (bolsas: crear, renombrar, recargar, trasladar, eliminar),
-- 3.5 (ingresos) y 3.15 (metas: crear, editar, aportar, retirar, pausar, reanudar, eliminar).
-- Todo corre con los permisos de quien llama (RLS): un id de otro usuario "no existe".
-- Errores con código P0001 (regla) o P0002 (no existe) y una clave, como en las Etapas 3 y 5.

-- ---------------------------------------------------------------- cambios de tablas
-- Traslado entre bolsas (supuesto 2): salida y entrada enlazadas, sin meta.
-- Saldo inicial en cualquier bolsa (supuesto 3), no solo en las metas.
alter table public.movimientos_bolsa
  drop constraint movimientos_bolsa_tipo_check,
  drop constraint movimientos_bolsa_check,
  drop constraint movimientos_bolsa_check1;
alter table public.movimientos_bolsa
  add constraint movimientos_bolsa_tipo_check
    check (tipo in ('recarga', 'ajuste', 'saldo_inicial', 'aporte', 'retiro', 'traslado')),
  -- Recargas, ajustes (hacia arriba) y saldos iniciales solo entran.
  add constraint movimientos_bolsa_sentido_tipo_check
    check (tipo in ('aporte', 'retiro', 'traslado') or sentido = 'entrada'),
  -- Aportes y retiros siempre son de una meta; recargas, ajustes y traslados nunca.
  add constraint movimientos_bolsa_meta_check
    check (case when tipo in ('aporte', 'retiro') then meta_id is not null
                when tipo = 'saldo_inicial' then true
                else meta_id is null end);

-- Motivo del último ajuste del presupuesto del período (supuesto 10).
alter table public.periodos add column nota_presupuesto text;

-- Ícono de la meta (supuesto 18), con el selector de íconos de categorías.
alter table public.metas_ahorro add column icono text not null default 'piggy-bank' check (btrim(icono) <> '');

-- ---------------------------------------------------------------- vistas de bolsas
-- Movimientos de cada bolsa (supuesto 7): lo que suma o resta a su saldo, con signo.
-- Solo lo confirmado, igual que saldos_bolsa. contraparte: la otra bolsa o el medio de un
-- traslado, aporte o retiro; la categoría de un ingreso; el lugar de un gasto.
create view public.movimientos_de_bolsa with (security_invoker = true) as
select m.id, m.user_id, m.bolsa_id, m.tipo, m.fecha, m.created_at, m.nota as titulo,
       (case when m.sentido = 'entrada' then m.valor else -m.valor end)::bigint as valor,
       coalesce(
         (select ob.nombre from public.movimientos_bolsa o join public.bolsas ob on ob.id = o.bolsa_id
           where o.id = m.enlace_id),
         (select ob.nombre from public.movimientos_bolsa o join public.bolsas ob on ob.id = o.bolsa_id
           where o.enlace_id = m.id limit 1),
         (select f.nombre from public.formas_pago f where f.id = m.medio_id)) as contraparte,
       m.meta_id
  from public.movimientos_bolsa m
 where m.estado = 'confirmado'
union all
select i.id, i.user_id, i.bolsa_id, 'ingreso', i.fecha, i.created_at, i.titulo, i.valor,
       i.categoria_nombre, null
  from public.ingresos i
 where i.bolsa_id is not null
union all
select g.id, g.user_id, g.bolsa_id, 'gasto', g.fecha, g.created_at, g.titulo, -g.valor,
       (select l.nombre from public.lugares l where l.id = g.lugar_id), null
  from public.gastos g
 where g.bolsa_id is not null and g.estado = 'confirmado';

-- Bolsa que es origen de un gasto periódico, una deuda o un aporte periódico activos: no se
-- elimina (supuesto 5). La usan eliminar_bolsa y uso_bolsas, para que el menú diga por qué.
create function public.bolsa_en_uso_por_reglas(p_bolsa_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.reglas_periodicas where bolsa_id = p_bolsa_id and not pausada)
      or exists (select 1 from public.estado_deudas e join public.deudas d on d.id = e.deuda_id
                  where d.bolsa_id = p_bolsa_id and e.estado = 'activa')
      or exists (select 1 from public.reglas_aporte r join public.metas_ahorro m on m.id = r.meta_id
                  where r.bolsa_id = p_bolsa_id and not r.pausada and m.eliminada_at is null);
$$;

-- "14 movimientos · último: Almuerzo, hoy". Incluye las bolsas sin movimientos (0, null).
create view public.uso_bolsas with (security_invoker = true) as
select b.id as bolsa_id, b.user_id,
       (select count(*)::int from public.movimientos_de_bolsa m where m.bolsa_id = b.id) as usos,
       u.fecha as ultimo, u.titulo as ultimo_titulo, u.tipo as ultimo_tipo,
       public.bolsa_en_uso_por_reglas(b.id) as en_uso_por_reglas
  from public.bolsas b
  left join lateral (
    select m.fecha, m.titulo, m.tipo from public.movimientos_de_bolsa m
     where m.bolsa_id = b.id order by m.fecha desc, m.created_at desc limit 1
  ) u on true;

-- ---------------------------------------------------------------- bolsas
-- Bolsa de forma de pago (no de una meta) y activa, de quien llama; si no, bolsa.no_existe.
create function public.bolsa_activa(p_bolsa_id uuid)
returns public.bolsas
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.bolsas;
begin
  select * into v from public.bolsas
   where id = p_bolsa_id and forma_pago_id is not null and not archivada;
  if not found then
    raise exception 'bolsa.no_existe' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Nombre libre entre las bolsas activas de quien llama, comparado normalizado (supuesto 4).
create function public.exigir_nombre_bolsa_libre(p_nombre text, p_excepto uuid default null)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bolsas
     where forma_pago_id is not null and not archivada
       and id is distinct from p_excepto
       and public.normalizar_nombre(nombre) = public.normalizar_nombre(p_nombre)
  ) then
    raise exception 'bolsa.nombre_repetido' using errcode = 'P0001';
  end if;
end;
$$;

-- Valor positivo de un movimiento; con p_cero se acepta también 0.
create function public.exigir_valor(p_valor bigint, p_cero boolean default false)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_valor is null or p_valor < 0 or (p_valor = 0 and not p_cero) then
    raise exception 'movimiento.valor_invalido' using errcode = 'P0001';
  end if;
end;
$$;

-- Crea la forma de pago de clase bolsa, la bolsa y su saldo inicial (supuesto 3). Devuelve la bolsa.
create function public.crear_bolsa(
  p_nombre text,
  p_saldo_inicial bigint default 0,
  p_fecha date default public.hoy_bogota()
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_nombre text := btrim(p_nombre);
  v_forma uuid;
  v_bolsa uuid;
begin
  perform public.exigir_valor(coalesce(p_saldo_inicial, 0), true);
  perform public.exigir_nombre_bolsa_libre(v_nombre);
  insert into public.formas_pago (nombre, clase) values (v_nombre, 'bolsa') returning id into v_forma;
  insert into public.bolsas (nombre, forma_pago_id) values (v_nombre, v_forma) returning id into v_bolsa;
  if coalesce(p_saldo_inicial, 0) > 0 then
    insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor)
    values (v_bolsa, 'saldo_inicial', 'entrada', p_fecha, p_saldo_inicial);
  end if;
  return v_bolsa;
end;
$$;

-- Renombra la bolsa y su forma de pago a la vez (supuesto 4).
create function public.renombrar_bolsa(p_bolsa_id uuid, p_nombre text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v public.bolsas := public.bolsa_activa(p_bolsa_id);
  v_nombre text := btrim(p_nombre);
begin
  perform public.exigir_nombre_bolsa_libre(v_nombre, v.id);
  update public.bolsas set nombre = v_nombre where id = v.id;
  update public.formas_pago set nombre = v_nombre where id = v.forma_pago_id;
end;
$$;

-- Recarga (cajero, recarga de Nequi): suma a la bolsa y nunca toca el presupuesto (supuesto 1).
create function public.recargar_bolsa(
  p_bolsa_id uuid,
  p_valor bigint,
  p_fecha date default public.hoy_bogota(),
  p_nota text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v public.bolsas := public.bolsa_activa(p_bolsa_id);
  v_id uuid;
begin
  perform public.exigir_valor(p_valor);
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota)
  values (v.id, 'recarga', 'entrada', p_fecha, p_valor, nullif(btrim(p_nota), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Traslado entre dos bolsas (supuesto 2). Puede dejar el origen en negativo (3.4: advierte,
-- no bloquea). Devuelve la salida; la entrada apunta a ella con enlace_id.
create function public.trasladar(
  p_origen uuid,
  p_destino uuid,
  p_valor bigint,
  p_fecha date default public.hoy_bogota(),
  p_nota text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_origen public.bolsas := public.bolsa_activa(p_origen);
  v_destino public.bolsas := public.bolsa_activa(p_destino);
  v_salida uuid;
begin
  if v_origen.id = v_destino.id then
    raise exception 'traslado.misma_bolsa' using errcode = 'P0001';
  end if;
  perform public.exigir_valor(p_valor);
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota)
  values (v_origen.id, 'traslado', 'salida', p_fecha, p_valor, nullif(btrim(p_nota), ''))
  returning id into v_salida;
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, enlace_id)
  values (v_destino.id, 'traslado', 'entrada', p_fecha, p_valor, nullif(btrim(p_nota), ''), v_salida);
  return v_salida;
end;
$$;

-- Elimina una bolsa (supuesto 5). Si tiene saldo, lo pasa a p_destino o, sin destino, lo deja
-- como ajuste a $0. Sin movimientos se borra con su forma de pago; con movimientos, se archivan.
-- No se elimina si es origen de un gasto periódico, una deuda o un aporte periódico activos.
create function public.eliminar_bolsa(
  p_bolsa_id uuid,
  p_destino uuid default null,
  p_fecha date default public.hoy_bogota()
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.bolsas := public.bolsa_activa(p_bolsa_id);
  v_saldo bigint;
begin
  if public.bolsa_en_uso_por_reglas(v.id) then
    raise exception 'bolsa.en_uso_por_reglas' using errcode = 'P0001';
  end if;

  select saldo into v_saldo from public.saldos_bolsa where bolsa_id = v.id;
  if v_saldo <> 0 then
    if p_destino is null then
      perform public.ajustar_saldo(v.id, 0, p_fecha, null);
    elsif v_saldo > 0 then
      perform public.trasladar(v.id, p_destino, v_saldo, p_fecha);
    else
      perform public.trasladar(p_destino, v.id, -v_saldo, p_fecha);
    end if;
  end if;

  begin
    delete from public.bolsas where id = v.id;
    delete from public.formas_pago where id = v.forma_pago_id;
    return 'eliminado';
  exception when foreign_key_violation then
    update public.bolsas set archivada = true where id = v.id;
    update public.formas_pago set archivada = true where id = v.forma_pago_id;
    return 'archivado';
  end;
end;
$$;

-- ---------------------------------------------------------------- presupuesto y período
-- Fin del período que empieza en p_inicio con el día de inicio p_dia (3.1). Si el día no cae
-- después del inicio en ese mes, el período llega hasta el día anterior del mes siguiente;
-- así un cambio de día deja un período de transición corto.
create function public.fin_periodo_desde(p_inicio date, p_dia integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_siguiente date := public.dia_en_mes(p_inicio, p_dia);
begin
  if v_siguiente <= p_inicio then
    v_siguiente := public.dia_en_mes((p_inicio + interval '1 month')::date, p_dia);
  end if;
  return v_siguiente - 1;
end;
$$;

-- Misma lógica de antes, ahora con fin_periodo_desde, que comparte con la vista previa.
create or replace function public.asegurar_periodos_de(p_user_id uuid, p_hoy date)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  v_dia smallint;
  v_presupuesto bigint;
  v_ultimo date;
  v_fin date;
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
      v_fin := public.fin_periodo_desde(v_ultimo + 1, v_dia);
      insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
      values (p_user_id, v_ultimo + 1, v_fin, v_presupuesto)
      on conflict do nothing;
      v_ultimo := v_fin;
    end loop;
  end if;

  select * into v_periodo from public.periodos
   where user_id = p_user_id and p_hoy between fecha_inicio and fecha_fin;
  return v_periodo;
end;
$$;

-- Vista previa de un cambio de día de inicio (supuesto 8): el período actual (que no cambia)
-- y los dos siguientes, como los crearía asegurar_periodos.
create function public.vista_previa_periodos(p_dia integer, p_hoy date default public.hoy_bogota())
returns table (orden integer, fecha_inicio date, fecha_fin date)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_inicio date;
  v_fin date;
begin
  if p_dia is null or p_dia not between 1 and 31 then
    raise exception 'periodo.dia_invalido' using errcode = 'P0001';
  end if;
  select p.fecha_inicio, p.fecha_fin into v_inicio, v_fin
    from public.periodos p where p_hoy between p.fecha_inicio and p.fecha_fin;
  if not found then
    select c.fecha_inicio, c.fecha_fin into v_inicio, v_fin
      from public.perfiles pf, public.calcular_periodo(p_hoy, pf.dia_inicio) c;
  end if;
  for i in 1..3 loop
    orden := i; fecha_inicio := v_inicio; fecha_fin := v_fin;
    return next;
    v_inicio := v_fin + 1;
    v_fin := public.fin_periodo_desde(v_inicio, p_dia);
  end loop;
end;
$$;

-- Presupuesto con que abre cada período nuevo (supuesto 9); con p_actual también el período
-- en curso, si no está cerrado.
create function public.cambiar_presupuesto_defecto(
  p_valor bigint,
  p_actual boolean default false,
  p_hoy date default public.hoy_bogota()
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_valor is null or p_valor < 0 then
    raise exception 'presupuesto.valor_invalido' using errcode = 'P0001';
  end if;
  update public.perfiles set presupuesto_defecto = p_valor;
  if p_actual then
    update public.periodos set presupuesto = p_valor
     where p_hoy between fecha_inicio and fecha_fin and cerrado_at is null;
  end if;
end;
$$;

-- Ajuste del presupuesto del período en curso (supuesto 10): suma p_ajuste (puede ser negativo)
-- y guarda el motivo. Los cerrados no se tocan.
create function public.ajustar_presupuesto_periodo(p_periodo_id uuid, p_ajuste bigint, p_nota text default null)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  v public.periodos;
begin
  select * into v from public.periodos where id = p_periodo_id for update;
  if not found then
    raise exception 'periodo.no_existe' using errcode = 'P0002';
  end if;
  if v.cerrado_at is not null then
    raise exception 'periodo.cerrado' using errcode = 'P0001';
  end if;
  if p_ajuste is null or v.presupuesto + p_ajuste < 0 then
    raise exception 'presupuesto.valor_invalido' using errcode = 'P0001';
  end if;
  update public.periodos
     set presupuesto = v.presupuesto + p_ajuste, nota_presupuesto = nullif(btrim(p_nota), '')
   where id = v.id
  returning * into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------- ingresos
-- Borrar, bajar o pasar a una bolsa un ingreso al presupuesto sube el porcentaje usado del
-- período en que estaba (supuesto 17). Subirlo no puede cruzar umbrales, así que basta el viejo.
create function public.alertas_por_ingreso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.bolsa_id is null then
    perform public.registrar_alertas_en(old.user_id, old.fecha);
  end if;
  return null;
end;
$$;

create trigger ingresos_alertas
  after update of valor, fecha, bolsa_id or delete on public.ingresos
  for each row execute function public.alertas_por_ingreso();

-- ---------------------------------------------------------------- ahorros
-- Meta vigente (no eliminada) de quien llama; si no, meta.no_existe.
create function public.meta_vigente(p_meta_id uuid)
returns public.metas_ahorro
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.metas_ahorro;
begin
  select * into v from public.metas_ahorro where id = p_meta_id and eliminada_at is null;
  if not found then
    raise exception 'meta.no_existe' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Origen de un aporte (3.15): una bolsa activa o un medio directo, nunca los dos. Desde una bolsa
-- nunca afecta el presupuesto (decisión del 18-nov-2026).
create function public.exigir_origen_aporte(p_bolsa_id uuid, p_medio_id uuid, p_afecta boolean)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if (p_bolsa_id is null) = (p_medio_id is null) then
    raise exception 'aporte.origen_invalido' using errcode = 'P0001';
  end if;
  if p_bolsa_id is not null then
    if coalesce(p_afecta, false) then
      raise exception 'aporte.afecta_desde_bolsa' using errcode = 'P0001';
    end if;
    perform public.bolsa_activa(p_bolsa_id);
  elsif not exists (select 1 from public.formas_pago where id = p_medio_id and clase = 'medio' and not archivada) then
    raise exception 'forma_pago.no_existe' using errcode = 'P0002';
  end if;
end;
$$;

-- Aporte sugerido para llegar a la meta (supuesto 20): lo que falta repartido entre los aportes
-- de la serie que caben desde hoy hasta la fecha final, redondeando hacia arriba.
create function public.sugerir_aporte(
  p_monto bigint,
  p_saldo_inicial bigint,
  p_fecha_final date,
  p_frecuencia text,
  p_dia integer,
  p_hoy date default public.hoy_bogota()
)
returns table (aportes integer, aporte bigint, ultima_fecha date)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_fecha date;
  v_falta bigint := greatest(coalesce(p_monto, 0) - coalesce(p_saldo_inicial, 0), 0);
begin
  aportes := 0;
  v_fecha := public.primera_fecha_serie_desde(p_frecuencia, 1, p_dia, p_hoy, p_hoy);
  while v_fecha <= p_fecha_final loop
    aportes := aportes + 1;
    ultima_fecha := v_fecha;
    v_fecha := public.primera_fecha_serie_desde(p_frecuencia, 1, p_dia, p_hoy, v_fecha + 1);
  end loop;
  aporte := case when aportes = 0 then v_falta else (v_falta + aportes - 1) / aportes end;
  return next;
end;
$$;

-- Valida los datos de una meta (nombre lo valida la tabla).
create function public.exigir_datos_meta(p_monto bigint, p_fecha_final date, p_hoy date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'meta.monto_invalido' using errcode = 'P0001';
  end if;
  if p_fecha_final is null or p_fecha_final <= p_hoy then
    raise exception 'meta.fecha_invalida' using errcode = 'P0001';
  end if;
end;
$$;

-- Crea la bolsa propia, la meta, el saldo inicial y la regla de aporte opcional (supuesto 21).
-- Sin p_valor no hay aportes periódicos. Devuelve la meta.
create function public.crear_meta(
  p_nombre text,
  p_icono text,
  p_monto bigint,
  p_fecha_final date,
  p_saldo_inicial bigint default 0,
  p_valor bigint default null,
  p_frecuencia text default null,
  p_dia integer default null,
  p_bolsa_id uuid default null,
  p_medio_id uuid default null,
  p_afecta_presupuesto boolean default false,
  p_hoy date default public.hoy_bogota()
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_nombre text := btrim(p_nombre);
  v_bolsa uuid;
  v_meta uuid;
begin
  perform public.exigir_datos_meta(p_monto, p_fecha_final, p_hoy);
  perform public.exigir_valor(coalesce(p_saldo_inicial, 0), true);
  if p_valor is not null then
    perform public.exigir_valor(p_valor);
    perform public.exigir_origen_aporte(p_bolsa_id, p_medio_id, p_afecta_presupuesto);
  end if;

  insert into public.bolsas (nombre) values (v_nombre) returning id into v_bolsa;
  insert into public.metas_ahorro (nombre, icono, monto_meta, fecha_final, bolsa_id)
  values (v_nombre, coalesce(nullif(btrim(p_icono), ''), 'piggy-bank'), p_monto, p_fecha_final, v_bolsa)
  returning id into v_meta;
  if coalesce(p_saldo_inicial, 0) > 0 then
    insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, meta_id)
    values (v_bolsa, 'saldo_inicial', 'entrada', p_hoy, p_saldo_inicial, v_meta);
  end if;
  if p_valor is not null then
    -- El trigger de la tabla calcula la primera fecha desde hoy.
    insert into public.reglas_aporte (meta_id, valor, frecuencia, dia, bolsa_id, medio_id, afecta_presupuesto, proxima_fecha)
    values (v_meta, p_valor, p_frecuencia, p_dia, p_bolsa_id, p_medio_id,
            p_medio_id is not null and coalesce(p_afecta_presupuesto, false), p_hoy);
  end if;
  return v_meta;
end;
$$;

-- Edita la meta y su regla (supuesto 25). Cambiar la frecuencia o el día recalcula la próxima
-- fecha desde hoy; cambiar solo el valor o el origen no la mueve. Sin p_valor se quitan los
-- aportes periódicos: la regla se borra, o se pausa si ya generó aportes.
create function public.editar_meta(
  p_meta_id uuid,
  p_nombre text,
  p_icono text,
  p_monto bigint,
  p_fecha_final date,
  p_valor bigint default null,
  p_frecuencia text default null,
  p_dia integer default null,
  p_bolsa_id uuid default null,
  p_medio_id uuid default null,
  p_afecta_presupuesto boolean default false,
  p_hoy date default public.hoy_bogota()
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
  r public.reglas_aporte;
  v_nombre text := btrim(p_nombre);
begin
  perform public.exigir_datos_meta(p_monto, p_fecha_final, p_hoy);
  if p_valor is not null then
    perform public.exigir_valor(p_valor);
    perform public.exigir_origen_aporte(p_bolsa_id, p_medio_id, p_afecta_presupuesto);
  end if;

  update public.metas_ahorro
     set nombre = v_nombre, icono = coalesce(nullif(btrim(p_icono), ''), icono),
         monto_meta = p_monto, fecha_final = p_fecha_final
   where id = m.id;
  update public.bolsas set nombre = v_nombre where id = m.bolsa_id;

  select * into r from public.reglas_aporte where meta_id = m.id order by created_at limit 1 for update;
  if p_valor is null then
    if found then
      begin
        delete from public.reglas_aporte where id = r.id;
      exception when foreign_key_violation then
        update public.reglas_aporte set pausada = true where id = r.id;
      end;
    end if;
  elsif not found then
    insert into public.reglas_aporte (meta_id, valor, frecuencia, dia, bolsa_id, medio_id, afecta_presupuesto, proxima_fecha)
    values (m.id, p_valor, p_frecuencia, p_dia, p_bolsa_id, p_medio_id,
            p_medio_id is not null and coalesce(p_afecta_presupuesto, false), p_hoy);
  else
    update public.reglas_aporte
       set valor = p_valor, frecuencia = p_frecuencia, dia = p_dia,
           bolsa_id = p_bolsa_id, medio_id = p_medio_id,
           afecta_presupuesto = p_medio_id is not null and coalesce(p_afecta_presupuesto, false),
           pausada = false,
           proxima_fecha = case
             when p_frecuencia is distinct from r.frecuencia or p_dia is distinct from r.dia
               then public.primera_fecha_serie_desde(p_frecuencia, 1, p_dia, p_hoy, p_hoy)
             else r.proxima_fecha end
     where id = r.id;
  end if;
end;
$$;

-- Aporte manual (supuesto 22). Desde una bolsa: entrada en la meta y salida enlazada en la bolsa.
-- Desde un medio directo: solo la entrada, con la casilla de presupuesto. Devuelve la entrada.
create function public.aportar_meta(
  p_meta_id uuid,
  p_valor bigint,
  p_bolsa_id uuid default null,
  p_medio_id uuid default null,
  p_afecta_presupuesto boolean default false,
  p_fecha date default public.hoy_bogota(),
  p_nota text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
  v_entrada uuid;
begin
  perform public.exigir_valor(p_valor);
  perform public.exigir_origen_aporte(p_bolsa_id, p_medio_id, p_afecta_presupuesto);
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, meta_id, medio_id, afecta_presupuesto)
  values (m.bolsa_id, 'aporte', 'entrada', p_fecha, p_valor, nullif(btrim(p_nota), ''), m.id, p_medio_id,
          p_medio_id is not null and coalesce(p_afecta_presupuesto, false))
  returning id into v_entrada;
  if p_bolsa_id is not null then
    insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, meta_id, enlace_id)
    values (p_bolsa_id, 'aporte', 'salida', p_fecha, p_valor, nullif(btrim(p_nota), ''), m.id, v_entrada);
  end if;
  return v_entrada;
end;
$$;

-- Retiro de la meta hacia una bolsa, con motivo (supuesto 23). No pasa del saldo de la meta.
-- Devuelve la salida de la meta; la entrada en la bolsa apunta a ella.
create function public.retirar_meta(
  p_meta_id uuid,
  p_valor bigint,
  p_bolsa_id uuid,
  p_motivo text default null,
  p_fecha date default public.hoy_bogota()
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
  v_saldo bigint;
  v_salida uuid;
begin
  perform public.exigir_valor(p_valor);
  perform public.bolsa_activa(p_bolsa_id);
  select saldo into v_saldo from public.saldos_bolsa where bolsa_id = m.bolsa_id;
  if p_valor > v_saldo then
    raise exception 'meta.saldo_insuficiente' using errcode = 'P0001';
  end if;
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, meta_id)
  values (m.bolsa_id, 'retiro', 'salida', p_fecha, p_valor, nullif(btrim(p_motivo), ''), m.id)
  returning id into v_salida;
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, meta_id, enlace_id)
  values (p_bolsa_id, 'retiro', 'entrada', p_fecha, p_valor, nullif(btrim(p_motivo), ''), m.id, v_salida);
  return v_salida;
end;
$$;

-- Pausa la meta: no se generan aportes; lo ahorrado se queda (3.15).
create function public.pausar_meta(p_meta_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
begin
  update public.metas_ahorro set pausada = true where id = m.id;
end;
$$;

-- Reanuda la meta (supuesto 24): la próxima fecha salta a la primera de la serie desde hoy,
-- sin generar los aportes del tiempo pausado.
create function public.reanudar_meta(p_meta_id uuid, p_hoy date default public.hoy_bogota())
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
begin
  update public.metas_ahorro set pausada = false where id = m.id;
  update public.reglas_aporte
     set proxima_fecha = public.primera_fecha_serie_desde(frecuencia, 1, dia, proxima_fecha,
                                                         greatest(proxima_fecha, p_hoy))
   where meta_id = m.id;
end;
$$;

-- Elimina la meta (supuesto 26): lo ahorrado pasa a p_bolsa_id como retiro, los pendientes
-- quedan omitidos, la regla se pausa, la bolsa se archiva y la meta queda con eliminada_at.
create function public.eliminar_meta(
  p_meta_id uuid,
  p_bolsa_id uuid default null,
  p_fecha date default public.hoy_bogota()
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.metas_ahorro := public.meta_vigente(p_meta_id);
  v_saldo bigint;
begin
  select saldo into v_saldo from public.saldos_bolsa where bolsa_id = m.bolsa_id;
  if v_saldo > 0 then
    if p_bolsa_id is null then
      raise exception 'meta.destino_requerido' using errcode = 'P0001';
    end if;
    perform public.retirar_meta(m.id, v_saldo, p_bolsa_id, null, p_fecha);
  end if;
  update public.movimientos_bolsa set estado = 'omitido' where meta_id = m.id and estado = 'pendiente';
  update public.reglas_aporte set pausada = true where meta_id = m.id;
  update public.bolsas set archivada = true where id = m.bolsa_id;
  update public.metas_ahorro set eliminada_at = now() where id = m.id;
end;
$$;

-- ---------------------------------------------------------------- permisos
-- Vistas: authenticated solo lee; anon nada. Funciones de la app: authenticated sí, anon no.
-- Las auxiliares (bolsa_activa, exigir_*, meta_vigente) también se pueden llamar: solo validan
-- o leen con RLS. fin_periodo_desde es pura.
revoke all on public.movimientos_de_bolsa, public.uso_bolsas from public, anon, authenticated;
grant select on public.movimientos_de_bolsa, public.uso_bolsas to authenticated;

revoke all on function
  public.bolsa_activa(uuid), public.bolsa_en_uso_por_reglas(uuid), public.exigir_nombre_bolsa_libre(text, uuid), public.exigir_valor(bigint, boolean),
  public.crear_bolsa(text, bigint, date), public.renombrar_bolsa(uuid, text),
  public.recargar_bolsa(uuid, bigint, date, text), public.trasladar(uuid, uuid, bigint, date, text),
  public.eliminar_bolsa(uuid, uuid, date), public.fin_periodo_desde(date, integer),
  public.vista_previa_periodos(integer, date), public.cambiar_presupuesto_defecto(bigint, boolean, date),
  public.ajustar_presupuesto_periodo(uuid, bigint, text),
  public.meta_vigente(uuid), public.exigir_origen_aporte(uuid, uuid, boolean),
  public.sugerir_aporte(bigint, bigint, date, text, integer, date), public.exigir_datos_meta(bigint, date, date),
  public.crear_meta(text, text, bigint, date, bigint, bigint, text, integer, uuid, uuid, boolean, date),
  public.editar_meta(uuid, text, text, bigint, date, bigint, text, integer, uuid, uuid, boolean, date),
  public.aportar_meta(uuid, bigint, uuid, uuid, boolean, date, text),
  public.retirar_meta(uuid, bigint, uuid, text, date), public.pausar_meta(uuid),
  public.reanudar_meta(uuid, date), public.eliminar_meta(uuid, uuid, date)
  from public, anon;
grant execute on function
  public.bolsa_activa(uuid), public.bolsa_en_uso_por_reglas(uuid), public.exigir_nombre_bolsa_libre(text, uuid), public.exigir_valor(bigint, boolean),
  public.crear_bolsa(text, bigint, date), public.renombrar_bolsa(uuid, text),
  public.recargar_bolsa(uuid, bigint, date, text), public.trasladar(uuid, uuid, bigint, date, text),
  public.eliminar_bolsa(uuid, uuid, date), public.fin_periodo_desde(date, integer),
  public.vista_previa_periodos(integer, date), public.cambiar_presupuesto_defecto(bigint, boolean, date),
  public.ajustar_presupuesto_periodo(uuid, bigint, text),
  public.meta_vigente(uuid), public.exigir_origen_aporte(uuid, uuid, boolean),
  public.sugerir_aporte(bigint, bigint, date, text, integer, date), public.exigir_datos_meta(bigint, date, date),
  public.crear_meta(text, text, bigint, date, bigint, bigint, text, integer, uuid, uuid, boolean, date),
  public.editar_meta(uuid, text, text, bigint, date, bigint, text, integer, uuid, uuid, boolean, date),
  public.aportar_meta(uuid, bigint, uuid, uuid, boolean, date, text),
  public.retirar_meta(uuid, bigint, uuid, text, date), public.pausar_meta(uuid),
  public.reanudar_meta(uuid, date), public.eliminar_meta(uuid, uuid, date)
  to authenticated;
-- La función interna reemplazada conserva sus permisos (create or replace no los cambia).
revoke all on function public.alertas_por_ingreso() from public, anon, authenticated;
