-- Etapa 5 (issue #10): gestión de datos de referencia.
-- Reglas 3.8 (tarjetas sin números), 3.9 (lugares), 3.11 (categorías) y 3.14 (CRUD):
--   - crear o reactivar lugares y personas por nombre normalizado;
--   - eliminar = borrar si no hay uso, archivar si lo hay (el historial se conserva);
--   - unir duplicados del mismo tipo moviendo todas las referencias;
--   - posibles duplicados con pg_trgm y pares descartados ("No son el mismo");
--   - conteos de uso y fecha del último uso para las listas.
-- Todo corre con los permisos de quien llama (RLS): un id de otro usuario "no existe".

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------- pares_distintos
-- Pares de nombres parecidos que el usuario marcó como distintos (supuesto 7).
-- a_id < b_id para que cada par tenga una sola fila. Sin llave foránea porque apunta a
-- lugares o personas según la entidad; las funciones de eliminar y unir limpian sus filas.
create table public.pares_distintos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  entidad text not null check (entidad in ('lugar', 'persona')),
  a_id uuid not null,
  b_id uuid not null,
  check (a_id < b_id),
  unique (user_id, entidad, a_id, b_id)
);

alter table public.pares_distintos enable row level security;

create policy pares_distintos_select_propios on public.pares_distintos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy pares_distintos_insert_propios on public.pares_distintos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy pares_distintos_update_propios on public.pares_distintos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pares_distintos_delete_propios on public.pares_distintos for delete
  to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- vistas de uso
-- "22 gastos · último: Hoy" (supuesto 11). Incluyen los registros sin uso (0, null).

create view public.uso_categorias with (security_invoker = true) as
select c.id as categoria_id, c.user_id, count(m.fecha)::int as usos, max(m.fecha) as ultimo
  from public.categorias c
  left join (
    select user_id, categoria_id as id, fecha from public.gastos
    union all
    select user_id, subcategoria_id, fecha from public.gastos where subcategoria_id is not null
    union all
    select user_id, categoria_id, fecha from public.ingresos
    union all
    select user_id, subcategoria_id, fecha from public.ingresos where subcategoria_id is not null
  ) m on m.id = c.id and m.user_id = c.user_id
 group by c.id, c.user_id;

create view public.uso_lugares with (security_invoker = true) as
select l.id as lugar_id, l.user_id, count(g.id)::int as usos, max(g.fecha) as ultimo
  from public.lugares l
  left join public.gastos g on g.lugar_id = l.id and g.user_id = l.user_id
 group by l.id, l.user_id;

create view public.uso_personas with (security_invoker = true) as
select p.id as persona_id, p.user_id, count(m.fecha)::int as usos, max(m.fecha) as ultimo
  from public.personas p
  left join (
    select user_id, persona_id, fecha from public.prestamos
    union all
    select user_id, persona_id, fecha from public.deudas
  ) m on m.persona_id = p.id and m.user_id = p.user_id
 group by p.id, p.user_id;

create view public.uso_formas_pago with (security_invoker = true) as
select f.id as forma_pago_id, f.user_id, count(g.id)::int as usos, max(g.fecha) as ultimo
  from public.formas_pago f
  left join public.gastos g on (g.medio_id = f.id or g.canal_id = f.id) and g.user_id = f.user_id
 group by f.id, f.user_id;

-- ---------------------------------------------------------------- crear o reactivar
-- Devuelve el id y el estado: 'creado', 'existente' (ya había uno activo con ese nombre
-- normalizado) o 'reactivado' (había uno archivado y vuelve a estar activo).
create function public.crear_lugar(p_nombre text)
returns table (id uuid, estado text)
language plpgsql
set search_path = ''
as $$
declare
  v_norm text := public.normalizar_nombre(p_nombre);
  v_lugar public.lugares;
begin
  if coalesce(v_norm, '') = '' then
    raise exception 'lugar.nombre_vacio' using errcode = 'P0001';
  end if;

  select * into v_lugar from public.lugares l where l.nombre_normalizado = v_norm;
  if found then
    if v_lugar.archivado then
      update public.lugares l set archivado = false where l.id = v_lugar.id;
      return query select v_lugar.id, 'reactivado'::text;
    else
      return query select v_lugar.id, 'existente'::text;
    end if;
    return;
  end if;

  return query
    insert into public.lugares as l (nombre) values (btrim(regexp_replace(p_nombre, '\s+', ' ', 'g')))
    returning l.id, 'creado'::text;
end;
$$;

-- Las tarjetas se crean desde Deudas (Etapa 9, supuesto 8).
create function public.crear_persona(p_nombre text, p_tipo text default 'persona')
returns table (id uuid, estado text)
language plpgsql
set search_path = ''
as $$
declare
  v_norm text := public.normalizar_nombre(p_nombre);
  v_persona public.personas;
begin
  if coalesce(v_norm, '') = '' then
    raise exception 'persona.nombre_vacio' using errcode = 'P0001';
  end if;
  if p_tipo is null or p_tipo not in ('persona', 'banco') then
    raise exception 'persona.tipo_invalido' using errcode = 'P0001';
  end if;

  select * into v_persona from public.personas p where p.nombre_normalizado = v_norm;
  if found then
    if v_persona.archivada then
      update public.personas p set archivada = false where p.id = v_persona.id;
      return query select v_persona.id, 'reactivado'::text;
    else
      return query select v_persona.id, 'existente'::text;
    end if;
    return;
  end if;

  return query
    insert into public.personas as p (nombre, tipo) values (btrim(regexp_replace(p_nombre, '\s+', ' ', 'g')), p_tipo)
    returning p.id, 'creado'::text;
end;
$$;

-- ---------------------------------------------------------------- eliminar o archivar
-- Intenta borrar; si una llave foránea lo impide (hay uso), archiva (supuesto 3).

create function public.eliminar_lugar(p_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.lugares where id = p_id;
  if not found then
    raise exception 'lugar.no_existe' using errcode = 'P0002';
  end if;
  begin
    delete from public.lugares where id = p_id;
    delete from public.pares_distintos where entidad = 'lugar' and p_id in (a_id, b_id);
    return 'eliminado';
  exception when foreign_key_violation then
    update public.lugares set archivado = true where id = p_id;
    return 'archivado';
  end;
end;
$$;

create function public.eliminar_persona(p_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.personas where id = p_id;
  if not found then
    raise exception 'persona.no_existe' using errcode = 'P0002';
  end if;
  begin
    delete from public.personas where id = p_id;
    delete from public.pares_distintos where entidad = 'persona' and p_id in (a_id, b_id);
    return 'eliminado';
  exception when foreign_key_violation then
    update public.personas set archivada = true where id = p_id;
    return 'archivado';
  end;
end;
$$;

create function public.eliminar_forma_pago(p_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.formas_pago where id = p_id;
  if not found then
    raise exception 'forma_pago.no_existe' using errcode = 'P0002';
  end if;
  begin
    delete from public.formas_pago where id = p_id;
    return 'eliminado';
  exception when foreign_key_violation then
    update public.formas_pago set archivada = true where id = p_id;
    return 'archivado';
  end;
end;
$$;

-- Una categoría principal se elimina o se archiva junto con sus subcategorías: si alguna
-- tiene uso, se archivan todas y no se borra ninguna. Las del sistema no se eliminan (3.14).
create function public.eliminar_categoria(p_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_categoria public.categorias;
begin
  select * into v_categoria from public.categorias where id = p_id;
  if not found then
    raise exception 'categoria.no_existe' using errcode = 'P0002';
  end if;
  if v_categoria.clave_sistema is not null then
    raise exception 'categoria.sistema' using errcode = 'P0001';
  end if;
  begin
    delete from public.categorias where padre_id = p_id;
    delete from public.categorias where id = p_id;
    return 'eliminado';
  exception when foreign_key_violation then
    update public.categorias set archivada = true where id = p_id or padre_id = p_id;
    return 'archivado';
  end;
end;
$$;

-- ---------------------------------------------------------------- unir duplicados
-- Mueve todas las referencias de p_origen a p_destino y borra p_origen (supuesto 6).
-- No se puede deshacer; corre en la transacción de quien llama.

create function public.unir_lugares(p_origen uuid, p_destino uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_origen = p_destino then
    raise exception 'unir.mismo' using errcode = 'P0001';
  end if;
  if (select count(*) from public.lugares where id in (p_origen, p_destino)) < 2 then
    raise exception 'lugar.no_existe' using errcode = 'P0002';
  end if;

  update public.gastos set lugar_id = p_destino where lugar_id = p_origen;
  update public.reglas_periodicas set lugar_id = p_destino where lugar_id = p_origen;
  delete from public.pares_distintos where entidad = 'lugar' and p_origen in (a_id, b_id);
  delete from public.lugares where id = p_origen;
end;
$$;

create function public.unir_personas(p_origen uuid, p_destino uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_tipos text[];
begin
  if p_origen = p_destino then
    raise exception 'unir.mismo' using errcode = 'P0001';
  end if;
  select array_agg(tipo) into v_tipos from public.personas where id in (p_origen, p_destino);
  if coalesce(cardinality(v_tipos), 0) < 2 then
    raise exception 'persona.no_existe' using errcode = 'P0002';
  end if;
  if v_tipos[1] <> v_tipos[2] then
    raise exception 'unir.tipo_distinto' using errcode = 'P0001';
  end if;

  update public.prestamos set persona_id = p_destino where persona_id = p_origen;
  update public.deudas set persona_id = p_destino where persona_id = p_origen;
  delete from public.pares_distintos where entidad = 'persona' and p_origen in (a_id, b_id);
  delete from public.personas where id = p_origen;
end;
$$;

create function public.unir_formas_pago(p_origen uuid, p_destino uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_clases text[];
begin
  if p_origen = p_destino then
    raise exception 'unir.mismo' using errcode = 'P0001';
  end if;
  select array_agg(clase) into v_clases from public.formas_pago where id in (p_origen, p_destino);
  if coalesce(cardinality(v_clases), 0) < 2 then
    raise exception 'forma_pago.no_existe' using errcode = 'P0002';
  end if;
  if v_clases[1] <> v_clases[2] then
    raise exception 'unir.clase_distinta' using errcode = 'P0001';
  end if;

  update public.gastos set medio_id = p_destino where medio_id = p_origen;
  update public.gastos set canal_id = p_destino where canal_id = p_origen;
  update public.reglas_periodicas set medio_id = p_destino where medio_id = p_origen;
  update public.reglas_periodicas set canal_id = p_destino where canal_id = p_origen;
  update public.deudas set medio_id = p_destino where medio_id = p_origen;
  update public.deudas set canal_id = p_destino where canal_id = p_origen;
  update public.movimientos_bolsa set medio_id = p_destino where medio_id = p_origen;
  update public.reglas_aporte set medio_id = p_destino where medio_id = p_origen;
  update public.bolsas set forma_pago_id = p_destino where forma_pago_id = p_origen;
  delete from public.formas_pago where id = p_origen;
end;
$$;

-- ---------------------------------------------------------------- posibles duplicados (3.9)
-- Pares activos con nombres parecidos (similitud de trigramas ≥ 0,5) o uno contenido en el
-- otro, sin los pares descartados. Las personas solo se comparan con las de su mismo tipo.
create function public.posibles_duplicados(p_entidad text)
returns table (a_id uuid, a_nombre text, b_id uuid, b_nombre text)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_entidad = 'lugar' then
    return query
      select a.id, a.nombre, b.id, b.nombre
        from public.lugares a
        join public.lugares b on b.user_id = a.user_id and a.id < b.id
       where not a.archivado and not b.archivado
         and (extensions.similarity(a.nombre_normalizado, b.nombre_normalizado) >= 0.5
              or strpos(a.nombre_normalizado, b.nombre_normalizado) > 0
              or strpos(b.nombre_normalizado, a.nombre_normalizado) > 0)
         and not exists (select 1 from public.pares_distintos d
                          where d.user_id = a.user_id and d.entidad = 'lugar' and d.a_id = a.id and d.b_id = b.id)
       order by a.nombre, b.nombre;
  elsif p_entidad = 'persona' then
    return query
      select a.id, a.nombre, b.id, b.nombre
        from public.personas a
        join public.personas b on b.user_id = a.user_id and a.id < b.id and b.tipo = a.tipo
       where not a.archivada and not b.archivada
         and (extensions.similarity(a.nombre_normalizado, b.nombre_normalizado) >= 0.5
              or strpos(a.nombre_normalizado, b.nombre_normalizado) > 0
              or strpos(b.nombre_normalizado, a.nombre_normalizado) > 0)
         and not exists (select 1 from public.pares_distintos d
                          where d.user_id = a.user_id and d.entidad = 'persona' and d.a_id = a.id and d.b_id = b.id)
       order by a.nombre, b.nombre;
  else
    raise exception 'duplicado.entidad_invalida' using errcode = 'P0001';
  end if;
end;
$$;

-- "No son el mismo": guarda el par en orden (a_id < b_id). Repetirlo no falla.
create function public.marcar_distintos(p_entidad text, p_a uuid, p_b uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_encontrados int;
begin
  if p_entidad = 'lugar' then
    select count(*) into v_encontrados from public.lugares where id in (p_a, p_b);
  elsif p_entidad = 'persona' then
    select count(*) into v_encontrados from public.personas where id in (p_a, p_b);
  else
    raise exception 'duplicado.entidad_invalida' using errcode = 'P0001';
  end if;
  if p_a = p_b then
    raise exception 'unir.mismo' using errcode = 'P0001';
  end if;
  if v_encontrados < 2 then
    raise exception 'duplicado.no_existe' using errcode = 'P0002';
  end if;

  insert into public.pares_distintos (entidad, a_id, b_id)
  values (p_entidad, least(p_a, p_b), greatest(p_a, p_b))
  on conflict (user_id, entidad, a_id, b_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------- sugerencias (3.9)
-- Lugares activos parecidos a lo escrito: primero los que empiezan igual, luego los más
-- usados y los más parecidos. Lo usa el formulario de gasto (Etapa 7).
create function public.sugerir_lugares(p_texto text, p_limite integer default 8)
returns table (id uuid, nombre text)
language sql
stable
set search_path = ''
as $$
  with t as (select public.normalizar_nombre(p_texto) as txt)
  select l.id, l.nombre
    from public.lugares l
    cross join t
    left join public.uso_lugares u on u.lugar_id = l.id
   where not l.archivado
     and coalesce(t.txt, '') <> ''
     and (starts_with(l.nombre_normalizado, t.txt)
          or strpos(l.nombre_normalizado, t.txt) > 0
          or extensions.similarity(l.nombre_normalizado, t.txt) >= 0.3)
   order by starts_with(l.nombre_normalizado, t.txt) desc,
            coalesce(u.usos, 0) desc,
            extensions.similarity(l.nombre_normalizado, t.txt) desc,
            l.nombre
   limit greatest(coalesce(p_limite, 8), 1)
$$;

-- ---------------------------------------------------------------- permisos
-- Vistas: authenticated solo lee; anon nada. Funciones: authenticated sí, anon no.
revoke all on public.uso_categorias, public.uso_lugares, public.uso_personas, public.uso_formas_pago
  from public, anon, authenticated;
grant select on public.uso_categorias, public.uso_lugares, public.uso_personas, public.uso_formas_pago
  to authenticated;

revoke all on function
  public.crear_lugar(text), public.crear_persona(text, text),
  public.eliminar_lugar(uuid), public.eliminar_persona(uuid), public.eliminar_forma_pago(uuid),
  public.eliminar_categoria(uuid),
  public.unir_lugares(uuid, uuid), public.unir_personas(uuid, uuid), public.unir_formas_pago(uuid, uuid),
  public.posibles_duplicados(text), public.marcar_distintos(text, uuid, uuid), public.sugerir_lugares(text, integer)
  from public, anon;
grant execute on function
  public.crear_lugar(text), public.crear_persona(text, text),
  public.eliminar_lugar(uuid), public.eliminar_persona(uuid), public.eliminar_forma_pago(uuid),
  public.eliminar_categoria(uuid),
  public.unir_lugares(uuid, uuid), public.unir_personas(uuid, uuid), public.unir_formas_pago(uuid, uuid),
  public.posibles_duplicados(text), public.marcar_distintos(text, uuid, uuid), public.sugerir_lugares(text, integer)
  to authenticated;
