-- Etapa 6A (issue #30): el presupuesto sale de los ingresos.
-- Reglas 3.1 y 3.5 cambiadas el 27-nov-2026 por Giovanni: salario con parte para el presupuesto,
-- ingresos que suman o no al presupuesto, sin presupuesto por defecto ni ajuste manual, cierre con
-- sobrantes de salario y de presupuesto por separado, destinos del sobrante y volver a cerrar.
-- Todo corre con los permisos de quien llama (RLS). Errores P0001 (regla) o P0002 (no existe).
-- Nunca UPDATE ni DELETE sin WHERE: safeupdate los rechaza en el proyecto real.

-- ---------------------------------------------------------------- lo que se quita
drop trigger periodos_resumen on public.periodos;
drop trigger periodos_alertas on public.periodos;
drop function public.resumen_por_presupuesto();
drop function public.alertas_por_presupuesto();
drop function public.cambiar_presupuesto_defecto(bigint, boolean, date);
drop function public.ajustar_presupuesto_periodo(uuid, bigint, text);
drop view public.disponible_periodo;

alter table public.perfiles drop column presupuesto_defecto;
alter table public.periodos drop column presupuesto, drop column nota_presupuesto;

-- ---------------------------------------------------------------- tablas
-- Salario base (decisión 2): con él abre cada período. La parte para el presupuesto no pasa del salario.
alter table public.perfiles
  add column salario_base bigint not null default 0 check (salario_base >= 0),
  add column presupuesto_salario_base bigint not null default 0 check (presupuesto_salario_base >= 0),
  add column categoria_salario_id uuid,
  add constraint perfiles_presupuesto_salario_check check (presupuesto_salario_base <= salario_base),
  add constraint perfiles_categoria_salario_fkey foreign key (categoria_salario_id, user_id)
    references public.categorias (id, user_id) on delete set null (categoria_salario_id);

create index perfiles_categoria_salario_idx on public.perfiles (categoria_salario_id, user_id);

-- Salario (decisión 1) y casilla «Suma al presupuesto» (decisión 3, supuesto S3).
alter table public.ingresos
  add column es_salario boolean not null default false,
  add column monto_presupuesto bigint,
  add column suma_presupuesto boolean not null default false;

-- S11: lo que iba al presupuesto (sin bolsa) sigue sumando.
update public.ingresos set suma_presupuesto = true where bolsa_id is null;

alter table public.ingresos
  add constraint ingresos_salario_check check (
    case when es_salario
      then bolsa_id is null and not suma_presupuesto and prestamo_id is null and deuda_id is null
           and monto_presupuesto is not null and monto_presupuesto between 0 and valor
      else monto_presupuesto is null end);

-- Última vez que se volvió a cerrar (S9).
alter table public.periodos add column recerrado_at timestamptz;

-- Destino de un sobrante (S7): entrada en una bolsa o en la bolsa de una meta.
alter table public.movimientos_bolsa
  add column periodo_origen_id uuid,
  add column origen_sobrante text check (origen_sobrante in ('salario', 'presupuesto')),
  add constraint movimientos_bolsa_periodo_origen_fkey foreign key (periodo_origen_id, user_id)
    references public.periodos (id, user_id) on delete cascade;
alter table public.movimientos_bolsa
  drop constraint movimientos_bolsa_tipo_check,
  drop constraint movimientos_bolsa_meta_check;
alter table public.movimientos_bolsa
  add constraint movimientos_bolsa_tipo_check
    check (tipo in ('recarga', 'ajuste', 'saldo_inicial', 'aporte', 'retiro', 'traslado', 'sobrante')),
  add constraint movimientos_bolsa_meta_check
    check (case when tipo in ('aporte', 'retiro') then meta_id is not null
                when tipo in ('saldo_inicial', 'sobrante') then true
                else meta_id is null end),
  add constraint movimientos_bolsa_sobrante_check
    check ((tipo = 'sobrante') = (periodo_origen_id is not null)
           and (periodo_origen_id is null) = (origen_sobrante is null));

create index movimientos_bolsa_periodo_origen_idx on public.movimientos_bolsa (periodo_origen_id, user_id);

-- ---------------------------------------------------------------- salario
-- Valida el salario con claves traducibles: sin bolsa, parte para el presupuesto entre 0 y el
-- salario, y uno solo por período (S2). La tabla lo vuelve a exigir con su check.
create function public.ingresos_salario_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.es_salario then
    return new;
  end if;
  new.suma_presupuesto := false;
  if new.bolsa_id is not null or new.prestamo_id is not null or new.deuda_id is not null then
    raise exception 'salario.con_bolsa' using errcode = 'P0001';
  end if;
  if new.monto_presupuesto is null or new.monto_presupuesto < 0 or new.monto_presupuesto > new.valor then
    raise exception 'salario.monto_invalido' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.ingresos i join public.periodos p
        on p.user_id = new.user_id and i.fecha between p.fecha_inicio and p.fecha_fin
     where i.user_id = new.user_id and i.es_salario and i.id <> new.id
       and new.fecha between p.fecha_inicio and p.fecha_fin
  ) then
    raise exception 'salario.duplicado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger ingresos_salario_validar
  before insert or update on public.ingresos
  for each row execute function public.ingresos_salario_validar();

-- Categoría con que se crea el salario: la configurada o la de ingreso llamada «Salario».
create function public.categoria_salario_de(p_user_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select c.id from public.perfiles pf join public.categorias c on c.id = pf.categoria_salario_id
      where pf.user_id = p_user_id and not c.archivada),
    (select c.id from public.categorias c
      where c.user_id = p_user_id and c.tipo = 'ingreso' and c.padre_id is null and not c.archivada
        and public.normalizar_nombre(c.nombre) = 'salario'
      order by c.created_at limit 1));
$$;

-- Crea el salario del período que empieza en p_inicio con el salario base (S1), si hay base,
-- categoría y todavía no tiene salario. Devuelve el ingreso creado o null.
create function public.crear_salario_en(p_user_id uuid, p_inicio date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  pf public.perfiles;
  v_categoria uuid := public.categoria_salario_de(p_user_id);
  v_id uuid;
begin
  select * into pf from public.perfiles where user_id = p_user_id;
  if not found or pf.salario_base = 0 or v_categoria is null then
    return null;
  end if;
  if exists (
    select 1 from public.ingresos i join public.periodos p
        on p.user_id = p_user_id and i.fecha between p.fecha_inicio and p.fecha_fin
     where i.user_id = p_user_id and i.es_salario and p_inicio between p.fecha_inicio and p.fecha_fin
  ) then
    return null;
  end if;
  insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
  select p_user_id, c.nombre, p_inicio, pf.salario_base, c.id, true, pf.presupuesto_salario_base
    from public.categorias c where c.id = v_categoria
  returning id into v_id;
  return v_id;
end;
$$;

-- Igual que en la Etapa 6, sin presupuesto en el período y con el salario de cada período nuevo.
create or replace function public.asegurar_periodos_de(p_user_id uuid, p_hoy date)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  v_dia smallint;
  v_ultimo date;
  v_fin date;
  v_inicio date;
  v_periodo public.periodos;
begin
  select dia_inicio into v_dia from public.perfiles where user_id = p_user_id;
  if not found then
    return null;
  end if;

  select max(fecha_fin) into v_ultimo from public.periodos where user_id = p_user_id;

  if v_ultimo is null then
    insert into public.periodos (user_id, fecha_inicio, fecha_fin)
    select p_user_id, c.fecha_inicio, c.fecha_fin
      from public.calcular_periodo(p_hoy, v_dia) c
    on conflict do nothing
    returning fecha_inicio into v_inicio;
    if v_inicio is not null then
      perform public.crear_salario_en(p_user_id, v_inicio);
    end if;
  else
    while v_ultimo < p_hoy loop
      v_fin := public.fin_periodo_desde(v_ultimo + 1, v_dia);
      insert into public.periodos (user_id, fecha_inicio, fecha_fin)
      values (p_user_id, v_ultimo + 1, v_fin)
      on conflict do nothing;
      perform public.crear_salario_en(p_user_id, v_ultimo + 1);
      v_ultimo := v_fin;
    end loop;
  end if;

  select * into v_periodo from public.periodos
   where user_id = p_user_id and p_hoy between fecha_inicio and fecha_fin;
  return v_periodo;
end;
$$;

-- Exige salario ≥ 0 y parte para el presupuesto entre 0 y el salario.
create function public.exigir_datos_salario(p_salario bigint, p_presupuesto bigint)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_salario is null or p_salario < 0 or p_presupuesto is null or p_presupuesto < 0
     or p_presupuesto > p_salario then
    raise exception 'salario.monto_invalido' using errcode = 'P0001';
  end if;
end;
$$;

-- Configura el salario base (decisión 2). Con p_actual también el salario del período en curso:
-- lo crea si no tiene o lo actualiza si lo tiene. Los cerrados no se tocan.
create function public.configurar_salario(
  p_salario bigint,
  p_presupuesto bigint,
  p_categoria_id uuid default null,
  p_actual boolean default false,
  p_hoy date default public.hoy_bogota()
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_periodo public.periodos;
begin
  perform public.exigir_datos_salario(p_salario, p_presupuesto);
  if p_categoria_id is not null and not exists (
    select 1 from public.categorias
     where id = p_categoria_id and tipo = 'ingreso' and padre_id is null and not archivada
  ) then
    raise exception 'categoria.no_existe' using errcode = 'P0002';
  end if;
  update public.perfiles
     set salario_base = p_salario, presupuesto_salario_base = p_presupuesto,
         categoria_salario_id = coalesce(p_categoria_id, categoria_salario_id)
   where user_id = v_user;
  if not coalesce(p_actual, false) then
    return;
  end if;
  select * into v_periodo from public.periodos
   where user_id = v_user and p_hoy between fecha_inicio and fecha_fin and cerrado_at is null;
  if not found then
    return;
  end if;
  update public.ingresos i
     set valor = p_salario, monto_presupuesto = p_presupuesto
   where i.user_id = v_user and i.es_salario
     and i.fecha between v_periodo.fecha_inicio and v_periodo.fecha_fin;
  if not found then
    perform public.crear_salario_en(v_user, v_periodo.fecha_inicio);
  end if;
end;
$$;

-- Cambia el salario de un período (decisión 2): «Solo este período» o, con p_desde_ahora,
-- también el salario base con que abren los siguientes. Devuelve el ingreso.
create function public.editar_salario(
  p_ingreso_id uuid,
  p_valor bigint,
  p_monto_presupuesto bigint,
  p_desde_ahora boolean default false
)
returns public.ingresos
language plpgsql
set search_path = ''
as $$
declare
  v public.ingresos;
begin
  perform public.exigir_datos_salario(p_valor, p_monto_presupuesto);
  update public.ingresos set valor = p_valor, monto_presupuesto = p_monto_presupuesto
   where id = p_ingreso_id and es_salario
  returning * into v;
  if not found then
    raise exception 'ingreso.no_existe' using errcode = 'P0002';
  end if;
  if coalesce(p_desde_ahora, false) then
    update public.perfiles set salario_base = p_valor, presupuesto_salario_base = p_monto_presupuesto
     where user_id = v.user_id;
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------- presupuesto derivado
-- Presupuesto = parte del salario para el presupuesto + ingresos que suman (decisión 4).
-- Disponible = presupuesto − gastos confirmados que afectan el presupuesto − aportes que lo afectan.
create view public.disponible_periodo
with (security_invoker = on)
as
select t.periodo_id, t.user_id, t.fecha_inicio, t.fecha_fin,
       (t.salario_presupuesto + t.ingresos_presupuesto)::bigint as presupuesto,
       t.ingresos_presupuesto, t.gastado, t.aportes_presupuesto,
       (t.salario_presupuesto + t.ingresos_presupuesto - t.gastado - t.aportes_presupuesto)::bigint as disponible,
       t.salario, t.salario_presupuesto
  from (
    select p.id as periodo_id, p.user_id, p.fecha_inicio, p.fecha_fin,
           coalesce((select sum(i.valor) from public.ingresos i
                      where i.user_id = p.user_id and i.es_salario
                        and i.fecha between p.fecha_inicio and p.fecha_fin), 0)::bigint as salario,
           coalesce((select sum(i.monto_presupuesto) from public.ingresos i
                      where i.user_id = p.user_id and i.es_salario
                        and i.fecha between p.fecha_inicio and p.fecha_fin), 0)::bigint as salario_presupuesto,
           coalesce((select sum(i.valor) from public.ingresos i
                      where i.user_id = p.user_id and i.suma_presupuesto
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

-- Alertas con la base nueva: el presupuesto derivado. Con presupuesto 0 no hay alertas.
create or replace function public.registrar_alertas(p_periodo_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  d public.disponible_periodo;
  v_usado bigint;
  v_porcentaje bigint;
  v_total integer;
begin
  select * into d from public.disponible_periodo where periodo_id = p_periodo_id;
  if not found or d.presupuesto <= 0 then
    return 0;
  end if;
  v_usado := d.presupuesto - d.disponible;
  v_porcentaje := v_usado * 100 / d.presupuesto;  -- división entera: floor para valores positivos

  insert into public.alertas_enviadas (user_id, periodo_id, umbral)
  select d.user_id, d.periodo_id, u
    from (select generate_series(70, 100, 5) as u
          union all
          select 101 where v_usado > d.presupuesto) umbrales
   where u <= v_porcentaje or u = 101
  on conflict (periodo_id, umbral) do nothing;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Quitar o bajar lo que un ingreso aportaba al presupuesto sube el porcentaje usado del período
-- en que estaba. Subirlo no puede cruzar umbrales, así que basta el viejo.
create or replace function public.alertas_por_ingreso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.es_salario or old.suma_presupuesto then
    perform public.registrar_alertas_en(old.user_id, old.fecha);
  end if;
  return null;
end;
$$;

drop trigger ingresos_alertas on public.ingresos;
create trigger ingresos_alertas
  after update of valor, fecha, bolsa_id, es_salario, monto_presupuesto, suma_presupuesto or delete
  on public.ingresos
  for each row execute function public.alertas_por_ingreso();

-- ---------------------------------------------------------------- saldos a una fecha
-- Saldo de cada bolsa al final de p_fecha, como saldos_bolsa pero solo con lo de esa fecha o antes.
-- Lo usan el cierre (bolsas al fin del período) y «Viene del período anterior» (S6).
create function public.saldos_bolsa_al(p_fecha date)
returns table (bolsa_id uuid, saldo bigint)
language sql
stable
set search_path = ''
as $$
  select b.id,
         (coalesce((select sum(case when m.sentido = 'entrada' then m.valor else -m.valor end)
                     from public.movimientos_bolsa m
                    where m.bolsa_id = b.id and m.estado = 'confirmado' and m.fecha <= p_fecha), 0)
       + coalesce((select sum(i.valor) from public.ingresos i
                    where i.bolsa_id = b.id and i.fecha <= p_fecha), 0)
       - coalesce((select sum(g.valor) from public.gastos g
                    where g.bolsa_id = b.id and g.estado = 'confirmado' and g.fecha <= p_fecha), 0))::bigint
    from public.bolsas b;
$$;

-- ---------------------------------------------------------------- cierre
-- Sobrantes de cada período (decisiones 6 y 7, S5): el del salario es lo que no fue al presupuesto;
-- el del presupuesto es el disponible si es positivo. Si se pasó, «excedido» y sobrante 0.
-- No destinado = sobrante − destinado; puede quedar negativo por un gasto atrasado (decisión 8).
create view public.cierre_periodos
with (security_invoker = on)
as
select d.periodo_id, d.user_id, d.fecha_inicio, d.fecha_fin, p.cerrado_at, p.recerrado_at,
       d.salario, d.salario_presupuesto, d.presupuesto, d.disponible,
       (d.salario - d.salario_presupuesto)::bigint as sobrante_salario,
       greatest(d.disponible, 0)::bigint as sobrante_presupuesto,
       greatest(-d.disponible, 0)::bigint as excedido,
       s.destinado_salario, s.destinado_presupuesto,
       (d.salario - d.salario_presupuesto - s.destinado_salario)::bigint as no_destinado_salario,
       (greatest(d.disponible, 0) - s.destinado_presupuesto)::bigint as no_destinado_presupuesto
  from public.disponible_periodo d
  join public.periodos p on p.id = d.periodo_id
  cross join lateral (
    select coalesce(sum(m.valor) filter (where m.origen_sobrante = 'salario'), 0)::bigint as destinado_salario,
           coalesce(sum(m.valor) filter (where m.origen_sobrante = 'presupuesto'), 0)::bigint as destinado_presupuesto
      from public.movimientos_bolsa m
     where m.periodo_origen_id = d.periodo_id
  ) s;

-- Destinos del sobrante de cada período, con la bolsa o la meta.
create view public.destinos_sobrante
with (security_invoker = on)
as
select m.id, m.user_id, m.periodo_origen_id as periodo_id, m.origen_sobrante as origen, m.fecha,
       m.valor, m.nota, m.bolsa_id, m.meta_id,
       coalesce(ma.nombre, b.nombre) as destino_nombre, ma.icono as meta_icono
  from public.movimientos_bolsa m
  join public.bolsas b on b.id = m.bolsa_id
  left join public.metas_ahorro ma on ma.id = m.meta_id
 where m.tipo = 'sobrante';

-- Parte de dinero del resumen: lo de antes más salario, sobrantes, destinos y bolsas al fin.
create or replace function public.resumen_dinero(p_periodo_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'presupuesto', c.presupuesto,
    'salario', c.salario,
    'salario_presupuesto', c.salario_presupuesto,
    'ingresos_presupuesto', d.ingresos_presupuesto,
    'ingresos_estadisticas', coalesce((select sum(i.valor) from public.ingresos i
                                        where i.user_id = d.user_id and i.cuenta_estadisticas
                                          and i.fecha between d.fecha_inicio and d.fecha_fin), 0),
    'gastado', d.gastado,
    'aportes_presupuesto', d.aportes_presupuesto,
    'saldo', d.disponible,
    'sobrante_salario', c.sobrante_salario,
    'sobrante_presupuesto', c.sobrante_presupuesto,
    'excedido', c.excedido,
    'destinado_salario', c.destinado_salario,
    'destinado_presupuesto', c.destinado_presupuesto,
    'no_destinado_salario', c.no_destinado_salario,
    'no_destinado_presupuesto', c.no_destinado_presupuesto,
    -- Bolsas de forma de pago (no las de las metas) con su saldo al fin del período.
    'bolsas', coalesce((
      select jsonb_agg(jsonb_build_object('bolsa_id', b.id, 'nombre', b.nombre, 'saldo', s.saldo)
                       order by b.nombre)
        from public.bolsas b join public.saldos_bolsa_al(d.fecha_fin) s on s.bolsa_id = b.id
       where b.user_id = d.user_id and b.forma_pago_id is not null and not b.archivada), '[]'::jsonb),
    'por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', g.nombre, 'icono', g.icono, 'color', g.color, 'total', g.total)
                       order by g.total desc, g.nombre)
        from (select g.categoria_nombre as nombre, g.categoria_icono as icono, g.categoria_color as color,
                     sum(g.valor) as total
                from public.gastos g
               where g.user_id = d.user_id and g.estado = 'confirmado'
                 and g.fecha between d.fecha_inicio and d.fecha_fin
               group by g.categoria_nombre, g.categoria_icono, g.categoria_color) g), '[]'::jsonb)
  )
  from public.disponible_periodo d
  join public.cierre_periodos c on c.periodo_id = d.periodo_id
  where d.periodo_id = p_periodo_id;
$$;

-- Resumen completo: dinero más lo pendiente de préstamos y cuotas en este momento.
create function public.resumen_completo(p_periodo_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.resumen_dinero(p.id) || jsonb_build_object(
    'prestamos_por_cobrar', (
      select jsonb_build_object('cantidad', count(*), 'saldo', coalesce(sum(e.saldo), 0))
        from public.estado_prestamos e
       where e.user_id = p.user_id and e.fecha <= p.fecha_fin
         and e.estado in ('pendiente', 'parcial')),
    'cuotas_pendientes', (
      select jsonb_build_object('cantidad', count(*), 'valor', coalesce(sum(c.valor), 0))
        from public.cuotas_deuda c
       where c.user_id = p.user_id and c.pagada_at is null))
  from public.periodos p
  where p.id = p_periodo_id;
$$;

create or replace function public.cerrar_periodo(p_periodo_id uuid)
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
  update public.periodos set cerrado_at = now(), resumen = public.resumen_completo(p.id)
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- Período cerrado de quien llama, bloqueado; si no existe, periodo.no_existe; si está abierto,
-- periodo.abierto.
create function public.periodo_cerrado(p_periodo_id uuid)
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
  if p.cerrado_at is null then
    raise exception 'periodo.abierto' using errcode = 'P0001';
  end if;
  return p;
end;
$$;

-- Volver a cerrar (decisión 5, S9): resumen completo de nuevo y fecha del último cierre.
create function public.volver_a_cerrar(p_periodo_id uuid)
returns public.periodos
language plpgsql
set search_path = ''
as $$
declare
  p public.periodos := public.periodo_cerrado(p_periodo_id);
begin
  update public.periodos set recerrado_at = now(), resumen = public.resumen_completo(p.id)
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- El resumen del período de origen se recalcula al destinar, editar o quitar un destino.
create function public.resumen_por_sobrante()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_periodo uuid := case when tg_op = 'DELETE' then old.periodo_origen_id else new.periodo_origen_id end;
begin
  if v_periodo is not null then
    update public.periodos set resumen = resumen || public.resumen_dinero(id)
     where id = v_periodo and cerrado_at is not null;
  end if;
  if tg_op = 'UPDATE' and old.periodo_origen_id is distinct from new.periodo_origen_id
     and old.periodo_origen_id is not null then
    update public.periodos set resumen = resumen || public.resumen_dinero(id)
     where id = old.periodo_origen_id and cerrado_at is not null;
  end if;
  return null;
end;
$$;

create trigger movimientos_bolsa_resumen_sobrante
  after insert or update or delete on public.movimientos_bolsa
  for each row execute function public.resumen_por_sobrante();

-- ---------------------------------------------------------------- destinos del sobrante
-- Lo que queda sin destinar de un origen en un período.
create function public.no_destinado(p_periodo_id uuid, p_origen text)
returns bigint
language sql
stable
set search_path = ''
as $$
  select case p_origen when 'salario' then c.no_destinado_salario else c.no_destinado_presupuesto end
    from public.cierre_periodos c where c.periodo_id = p_periodo_id;
$$;

-- Destina parte de un sobrante a una bolsa o a una meta (S7). Solo desde un período cerrado y sin
-- pasar de lo no destinado. Nunca toca el presupuesto. Devuelve el movimiento.
create function public.destinar_sobrante(
  p_periodo_id uuid,
  p_origen text,
  p_valor bigint,
  p_bolsa_id uuid default null,
  p_meta_id uuid default null,
  p_fecha date default public.hoy_bogota(),
  p_nota text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  p public.periodos := public.periodo_cerrado(p_periodo_id);
  v_bolsa uuid;
  v_id uuid;
begin
  if p_origen is null or p_origen not in ('salario', 'presupuesto') then
    raise exception 'sobrante.origen_invalido' using errcode = 'P0001';
  end if;
  perform public.exigir_valor(p_valor);
  if (p_bolsa_id is null) = (p_meta_id is null) then
    raise exception 'sobrante.destino_invalido' using errcode = 'P0001';
  end if;
  if p_bolsa_id is not null then
    v_bolsa := (public.bolsa_activa(p_bolsa_id)).id;
  else
    v_bolsa := (public.meta_vigente(p_meta_id)).bolsa_id;
  end if;
  if p_valor > public.no_destinado(p.id, p_origen) then
    raise exception 'sobrante.insuficiente' using errcode = 'P0001';
  end if;
  insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, nota, meta_id,
                                        periodo_origen_id, origen_sobrante)
  values (v_bolsa, 'sobrante', 'entrada', p_fecha, p_valor, nullif(btrim(p_nota), ''), p_meta_id,
          p.id, p_origen)
  returning id into v_id;
  return v_id;
end;
$$;

-- Cambia el valor de un destino; el nuevo no pasa de lo no destinado más lo que ya tenía.
create function public.editar_destino(p_movimiento_id uuid, p_valor bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.movimientos_bolsa;
begin
  select * into m from public.movimientos_bolsa where id = p_movimiento_id and tipo = 'sobrante';
  if not found then
    raise exception 'destino.no_existe' using errcode = 'P0002';
  end if;
  perform public.periodo_cerrado(m.periodo_origen_id);
  perform public.exigir_valor(p_valor);
  if p_valor - m.valor > public.no_destinado(m.periodo_origen_id, m.origen_sobrante) then
    raise exception 'sobrante.insuficiente' using errcode = 'P0001';
  end if;
  update public.movimientos_bolsa set valor = p_valor where id = m.id;
end;
$$;

-- Quita un destino: el valor vuelve a «No destinado» y sale de la bolsa o la meta.
create function public.eliminar_destino(p_movimiento_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.movimientos_bolsa where id = p_movimiento_id and tipo = 'sobrante';
  if not found then
    raise exception 'destino.no_existe' using errcode = 'P0002';
  end if;
end;
$$;

-- Advertencia del gasto atrasado (decisión 8, S8): true si el período cerrado que contiene
-- p_fecha tiene un no destinado negativo. Los formularios la consultan después de guardar.
create function public.advertencia_sobrante(p_fecha date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(bool_or(c.no_destinado_salario < 0 or c.no_destinado_presupuesto < 0), false)
    from public.cierre_periodos c
   where c.cerrado_at is not null and p_fecha between c.fecha_inicio and c.fecha_fin;
$$;

-- ---------------------------------------------------------------- vistas de bolsas
-- Movimientos de cada bolsa: el destino de un sobrante muestra de qué período viene.
create or replace view public.movimientos_de_bolsa with (security_invoker = true) as
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

-- ---------------------------------------------------------------- permisos
revoke all on function
  public.ingresos_salario_validar(), public.crear_salario_en(uuid, date), public.resumen_por_sobrante()
  from public, anon, authenticated;
revoke all on function
  public.categoria_salario_de(uuid), public.exigir_datos_salario(bigint, bigint),
  public.configurar_salario(bigint, bigint, uuid, boolean, date),
  public.editar_salario(uuid, bigint, bigint, boolean), public.saldos_bolsa_al(date),
  public.resumen_completo(uuid), public.periodo_cerrado(uuid), public.volver_a_cerrar(uuid),
  public.no_destinado(uuid, text),
  public.destinar_sobrante(uuid, text, bigint, uuid, uuid, date, text),
  public.editar_destino(uuid, bigint), public.eliminar_destino(uuid), public.advertencia_sobrante(date)
  from public, anon;
-- crear_salario_en la usa configurar_salario, que corre como quien llama; con RLS solo puede
-- crear el salario propio (para otro usuario no ve su perfil y no hace nada).
grant execute on function public.crear_salario_en(uuid, date) to authenticated;
grant execute on function
  public.categoria_salario_de(uuid), public.exigir_datos_salario(bigint, bigint),
  public.configurar_salario(bigint, bigint, uuid, boolean, date),
  public.editar_salario(uuid, bigint, bigint, boolean), public.saldos_bolsa_al(date),
  public.resumen_completo(uuid), public.periodo_cerrado(uuid), public.volver_a_cerrar(uuid),
  public.no_destinado(uuid, text),
  public.destinar_sobrante(uuid, text, bigint, uuid, uuid, date, text),
  public.editar_destino(uuid, bigint), public.eliminar_destino(uuid), public.advertencia_sobrante(date)
  to authenticated;

revoke all on public.disponible_periodo, public.cierre_periodos, public.destinos_sobrante
  from public, anon, authenticated;
grant select on public.disponible_periodo, public.cierre_periodos, public.destinos_sobrante to authenticated;
