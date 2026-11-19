-- Etapa 2 (issue #7), tarea 6: gastos e ingresos.
-- Reglas: 3.3 (gastos: origen bolsa o medio, canal opcional), 3.4 (ajuste hacia abajo como
-- gasto con el saldo contado), 3.5 (ingresos con destino bolsa o presupuesto),
-- 3.6/3.7/3.8 (gastos generados por periódicos, préstamos y cuotas) y 3.11/3.14 (historial:
-- el registro conserva nombre, ícono y color de la categoría con que se hizo).
-- El período no se guarda: se deduce de la fecha (Etapa 3).

-- ---------------------------------------------------------------- gastos
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  titulo text not null check (btrim(titulo) <> ''),
  fecha date not null,
  valor bigint not null check (valor >= 0),
  descripcion text,
  estado text not null default 'confirmado' check (estado in ('confirmado', 'pendiente')),
  afecta_presupuesto boolean not null default true,
  -- Registro de ajustes hacia abajo (3.4, decisión del 18-nov-2026).
  es_ajuste boolean not null default false,
  saldo_real bigint check (saldo_real >= 0),
  categoria_id uuid not null,
  subcategoria_id uuid,
  -- Copia de la categoría al registrarse; la escribe el trigger, nunca el cliente.
  categoria_nombre text not null,
  categoria_icono text,
  categoria_color text,
  subcategoria_nombre text,
  lugar_id uuid,
  bolsa_id uuid,
  medio_id uuid,
  canal_id uuid,
  regla_id uuid,
  fecha_programada date,
  prestamo_id uuid,
  cuota_id uuid,
  unique (id, user_id),
  unique (regla_id, fecha_programada),
  unique (cuota_id),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (subcategoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (lugar_id, user_id) references public.lugares (id, user_id) on delete restrict,
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (medio_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  foreign key (canal_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  foreign key (regla_id, user_id) references public.reglas_periodicas (id, user_id) on delete restrict,
  foreign key (prestamo_id, user_id) references public.prestamos (id, user_id) on delete restrict,
  foreign key (cuota_id, user_id) references public.cuotas_deuda (id, user_id) on delete restrict,
  -- Un solo origen: bolsa o medio directo (3.3).
  check ((bolsa_id is null) <> (medio_id is null)),
  -- La regla y la fecha programada van juntas (3.6).
  check ((regla_id is null) = (fecha_programada is null)),
  -- Un ajuste siempre lleva el saldo contado y sale de una bolsa; lo demás no lo lleva.
  check (es_ajuste = (saldo_real is not null)),
  check (not es_ajuste or bolsa_id is not null)
);

create index gastos_fecha_idx on public.gastos (user_id, fecha);
create index gastos_categoria_idx on public.gastos (categoria_id, user_id);
create index gastos_subcategoria_idx on public.gastos (subcategoria_id, user_id);
create index gastos_lugar_idx on public.gastos (lugar_id, user_id);
create index gastos_bolsa_idx on public.gastos (bolsa_id, user_id);
create index gastos_medio_idx on public.gastos (medio_id, user_id);
create index gastos_canal_idx on public.gastos (canal_id, user_id);
create index gastos_prestamo_idx on public.gastos (prestamo_id, user_id);
create index gastos_cuota_idx on public.gastos (cuota_id, user_id);

-- ---------------------------------------------------------------- ingresos
create table public.ingresos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  titulo text not null check (btrim(titulo) <> ''),
  fecha date not null,
  valor bigint not null check (valor >= 0),
  descripcion text,
  categoria_id uuid not null,
  subcategoria_id uuid,
  categoria_nombre text not null,
  categoria_icono text,
  categoria_color text,
  subcategoria_nombre text,
  -- Nula = el destino es el presupuesto del período (3.5).
  bolsa_id uuid,
  -- Falso en el dinero recibido por un préstamo (3.5).
  cuenta_estadisticas boolean not null default true,
  -- Cobro de un préstamo que hice (3.7) o dinero recibido por una deuda (3.8).
  prestamo_id uuid,
  deuda_id uuid,
  unique (id, user_id),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (subcategoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (prestamo_id, user_id) references public.prestamos (id, user_id) on delete restrict,
  foreign key (deuda_id, user_id) references public.deudas (id, user_id) on delete restrict,
  check (prestamo_id is null or deuda_id is null)
);

create index ingresos_fecha_idx on public.ingresos (user_id, fecha);
create index ingresos_categoria_idx on public.ingresos (categoria_id, user_id);
create index ingresos_subcategoria_idx on public.ingresos (subcategoria_id, user_id);
create index ingresos_bolsa_idx on public.ingresos (bolsa_id, user_id);
create index ingresos_prestamo_idx on public.ingresos (prestamo_id, user_id);
create index ingresos_deuda_idx on public.ingresos (deuda_id, user_id);

-- ---------------------------------------------------------------- copia de la categoría
-- Valida la subcategoría y escribe la copia de nombre, ícono y color al crear el registro
-- o al cambiarle la categoría. Editar la categoría después no toca esta copia (3.11).
-- p_tipo_prohibido: un gasto no usa categorías de ingreso y un ingreso no usa las de gasto.
create function public.copiar_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tipo_prohibido text := tg_argv[0];
  cat public.categorias;
  sub public.categorias;
begin
  if tg_op = 'UPDATE'
     and new.categoria_id is not distinct from old.categoria_id
     and new.subcategoria_id is not distinct from old.subcategoria_id then
    -- Sin cambio de categoría: la copia no se toca, ni siquiera si el cliente la envía.
    new.categoria_nombre := old.categoria_nombre;
    new.categoria_icono := old.categoria_icono;
    new.categoria_color := old.categoria_color;
    new.subcategoria_nombre := old.subcategoria_nombre;
    return new;
  end if;

  select * into cat from public.categorias
   where id = new.categoria_id and user_id = new.user_id;
  if not found then
    -- La llave foránea dará el error correspondiente.
    new.categoria_nombre := '';
    return new;
  end if;
  if cat.padre_id is not null then
    raise exception 'La categoría debe ser principal; la subcategoría va aparte'
      using errcode = 'check_violation';
  end if;
  if cat.tipo = tipo_prohibido then
    raise exception 'Este registro no puede usar una categoría de tipo %', cat.tipo
      using errcode = 'check_violation';
  end if;

  new.categoria_nombre := cat.nombre;
  new.categoria_icono := cat.icono;
  new.categoria_color := cat.color;
  new.subcategoria_nombre := null;

  if new.subcategoria_id is not null then
    select * into sub from public.categorias
     where id = new.subcategoria_id and user_id = new.user_id;
    if found and sub.padre_id is distinct from cat.id then
      raise exception 'La subcategoría debe ser hija de la categoría'
        using errcode = 'check_violation';
    end if;
    new.subcategoria_nombre := sub.nombre;
  end if;
  return new;
end;
$$;

create trigger gastos_copiar_categoria
  before insert or update on public.gastos
  for each row execute function public.copiar_categoria('ingreso');

create trigger ingresos_copiar_categoria
  before insert or update on public.ingresos
  for each row execute function public.copiar_categoria('gasto');

-- Clase de las formas de pago del gasto (3.12).
create function public.gastos_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_clase_forma_pago(new.medio_id, new.user_id, 'medio');
  perform public.exigir_clase_forma_pago(new.canal_id, new.user_id, 'canal');
  return new;
end;
$$;

create trigger gastos_validar
  before insert or update on public.gastos
  for each row execute function public.gastos_validar();

-- ---------------------------------------------------------------- RLS
alter table public.gastos enable row level security;
alter table public.ingresos enable row level security;

create policy gastos_select_propios on public.gastos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy gastos_insert_propios on public.gastos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy gastos_update_propios on public.gastos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy gastos_delete_propios on public.gastos for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy ingresos_select_propios on public.ingresos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy ingresos_insert_propios on public.ingresos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy ingresos_update_propios on public.ingresos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ingresos_delete_propios on public.ingresos for delete
  to authenticated using ((select auth.uid()) = user_id);
