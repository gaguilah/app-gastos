-- Etapa 2 (issue #7), tarea 3: catálogos del usuario.
-- perfiles, categorias, formas_pago, bolsas, lugares y personas, con RLS por operación.
-- Reglas: 3.1 (día de inicio), 3.8 (tarjetas sin números), 3.9 (nombres normalizados),
-- 3.11 (categorías y subcategorías), 3.12 (formas de pago) y 3.14 (categorías del sistema).
-- Toda relación entre tablas del usuario usa llave compuesta (x_id, user_id) para que
-- ni con SQL directo una fila apunte a datos de otro usuario.

-- ---------------------------------------------------------------- perfiles
create table public.perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text,
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  dia_inicio smallint not null default 1 check (dia_inicio between 1 and 31),
  presupuesto_defecto bigint not null default 0 check (presupuesto_defecto >= 0),
  unique (user_id),
  unique (id, user_id)
);

-- ---------------------------------------------------------------- categorias
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null check (btrim(nombre) <> ''),
  icono text,
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  tipo text not null check (tipo in ('gasto', 'ingreso', 'prestamo', 'deuda')),
  clave_sistema text check (clave_sistema in (
    'gasto_desconocido', 'ingreso_prestamo', 'prestamo_realizado',
    'cobro_prestamo', 'prestamo_no_recuperado', 'pago_prestamos')),
  padre_id uuid,
  archivada boolean not null default false,
  unique (id, user_id),
  unique (user_id, clave_sistema),
  foreign key (padre_id, user_id) references public.categorias (id, user_id) on delete restrict,
  -- Una categoría principal tiene ícono y color; una subcategoría los hereda (3.11).
  check (
    (padre_id is null and icono is not null and color is not null)
    or (padre_id is not null and icono is null and color is null)
  ),
  -- Las del sistema son siempre principales.
  check (clave_sistema is null or padre_id is null)
);

create index categorias_padre_idx on public.categorias (padre_id, user_id);

-- Subcategorías: un solo nivel y el mismo tipo que su padre (3.11).
create function public.categorias_validar_jerarquia()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  padre public.categorias;
begin
  if new.padre_id is not null then
    select * into padre from public.categorias
     where id = new.padre_id and user_id = new.user_id;
    if padre.padre_id is not null then
      raise exception 'Las subcategorías tienen un solo nivel'
        using errcode = 'check_violation';
    end if;
    if padre.tipo <> new.tipo then
      raise exception 'Una subcategoría debe tener el tipo de su categoría'
        using errcode = 'check_violation';
    end if;
    if tg_op = 'UPDATE' and exists (
      select 1 from public.categorias where padre_id = new.id and user_id = new.user_id
    ) then
      raise exception 'Una categoría con subcategorías no puede volverse subcategoría'
        using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.tipo <> old.tipo and exists (
    select 1 from public.categorias where padre_id = new.id and user_id = new.user_id
  ) then
    raise exception 'No se puede cambiar el tipo de una categoría con subcategorías'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger categorias_validar_jerarquia
  before insert or update on public.categorias
  for each row execute function public.categorias_validar_jerarquia();

-- Categorías del sistema (3.14): el usuario las renombra y les cambia ícono y color,
-- pero no las crea, borra ni archiva, ni les cambia el tipo o la clave.
-- Solo las crean funciones del servidor (inicializar_usuario), que no corren como
-- los roles de la API.
create function public.categorias_proteger_sistema()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  es_api boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if new.clave_sistema is not null and es_api then
      raise exception 'Las categorías del sistema solo las crea la app';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.clave_sistema is null then
      if new.clave_sistema is not null then
        raise exception 'Una categoría no se puede convertir en categoría del sistema';
      end if;
    elsif new.clave_sistema is distinct from old.clave_sistema
       or new.tipo <> old.tipo
       or new.archivada
       or new.padre_id is not null then
      raise exception 'Las categorías del sistema solo se pueden renombrar y cambiar de ícono y color';
    end if;
    return new;
  end if;

  -- DELETE: los roles de la API nunca las borran; el borrado en cascada de un
  -- usuario (que no corre como esos roles) sí se las lleva.
  if old.clave_sistema is not null and es_api then
    raise exception 'Las categorías del sistema no se pueden borrar';
  end if;
  return old;
end;
$$;

create trigger categorias_proteger_sistema
  before insert or update or delete on public.categorias
  for each row execute function public.categorias_proteger_sistema();

-- ---------------------------------------------------------------- formas_pago
create table public.formas_pago (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null check (btrim(nombre) <> ''),
  clase text not null check (clase in ('bolsa', 'medio', 'canal')),
  archivada boolean not null default false,
  unique (id, user_id)
);

-- Lanza check_violation si una forma de pago del usuario no es de la clase esperada (3.12).
-- La usan los triggers de bolsas, gastos, deudas y aportes.
create function public.exigir_clase_forma_pago(p_forma_pago_id uuid, p_user_id uuid, p_clase text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  -- Si la forma de pago no es del usuario, no se responde aquí: la llave foránea
  -- compuesta da el error (23503) sin revelar nada de datos ajenos.
  if exists (
    select 1 from public.formas_pago
     where id = p_forma_pago_id and user_id = p_user_id and clase <> p_clase
  ) then
    raise exception 'La forma de pago debe ser de clase %', p_clase
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------- bolsas
create table public.bolsas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null check (btrim(nombre) <> ''),
  -- Nula en la bolsa propia de una meta de ahorro (3.15).
  forma_pago_id uuid,
  archivada boolean not null default false,
  unique (id, user_id),
  foreign key (forma_pago_id, user_id) references public.formas_pago (id, user_id) on delete restrict
);

create index bolsas_forma_pago_idx on public.bolsas (forma_pago_id, user_id);

create function public.bolsas_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_clase_forma_pago(new.forma_pago_id, new.user_id, 'bolsa');
  return new;
end;
$$;

create trigger bolsas_validar
  before insert or update on public.bolsas
  for each row execute function public.bolsas_validar();

-- ---------------------------------------------------------------- lugares (3.9)
create table public.lugares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null,
  nombre_normalizado text generated always as (public.normalizar_nombre(nombre)) stored,
  archivado boolean not null default false,
  unique (id, user_id),
  unique (user_id, nombre_normalizado),
  check (nombre_normalizado <> '')
);

-- ---------------------------------------------------------------- personas (3.7, 3.8)
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null,
  nombre_normalizado text generated always as (public.normalizar_nombre(nombre)) stored,
  tipo text not null check (tipo in ('persona', 'banco', 'tarjeta')),
  archivada boolean not null default false,
  unique (id, user_id),
  unique (user_id, nombre_normalizado),
  check (nombre_normalizado <> ''),
  -- Nunca números de tarjeta: rechaza 13 o más dígitos seguidos, sin contar espacios ni guiones.
  check (regexp_replace(nombre, '[\s-]', '', 'g') !~ '[0-9]{13,}')
);

-- ---------------------------------------------------------------- RLS
alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.formas_pago enable row level security;
alter table public.bolsas enable row level security;
alter table public.lugares enable row level security;
alter table public.personas enable row level security;

create policy perfiles_select_propios on public.perfiles for select
  to authenticated using ((select auth.uid()) = user_id);
create policy perfiles_insert_propios on public.perfiles for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy perfiles_update_propios on public.perfiles for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy perfiles_delete_propios on public.perfiles for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy categorias_select_propias on public.categorias for select
  to authenticated using ((select auth.uid()) = user_id);
create policy categorias_insert_propias on public.categorias for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy categorias_update_propias on public.categorias for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categorias_delete_propias on public.categorias for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy formas_pago_select_propias on public.formas_pago for select
  to authenticated using ((select auth.uid()) = user_id);
create policy formas_pago_insert_propias on public.formas_pago for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy formas_pago_update_propias on public.formas_pago for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy formas_pago_delete_propias on public.formas_pago for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy bolsas_select_propias on public.bolsas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy bolsas_insert_propias on public.bolsas for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy bolsas_update_propias on public.bolsas for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy bolsas_delete_propias on public.bolsas for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy lugares_select_propios on public.lugares for select
  to authenticated using ((select auth.uid()) = user_id);
create policy lugares_insert_propios on public.lugares for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy lugares_update_propios on public.lugares for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy lugares_delete_propios on public.lugares for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy personas_select_propias on public.personas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy personas_insert_propias on public.personas for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy personas_update_propias on public.personas for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy personas_delete_propias on public.personas for delete
  to authenticated using ((select auth.uid()) = user_id);
