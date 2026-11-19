-- Etapa 2 (issue #7), tarea 5: préstamos, deudas, cuotas, abonos y gastos periódicos.
-- Reglas: 3.6 (periódicos), 3.7 (préstamos que hago) y 3.8 (deudas).
-- Los estados derivados (Pendiente/Parcial/Pagado, Activa/Pagada) no se guardan: se
-- calculan en la Etapa 3 a partir de cobros, cuotas y abonos.

-- Lanza check_violation si la categoría no es del tipo esperado (3.11).
create function public.exigir_tipo_categoria(p_categoria_id uuid, p_user_id uuid, p_tipo text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_categoria_id is not null and not exists (
    select 1 from public.categorias
     where id = p_categoria_id and user_id = p_user_id and tipo = p_tipo
  ) then
    raise exception 'La categoría debe ser de tipo %', p_tipo
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------- reglas_periodicas (3.6)
-- Plantilla que genera gastos pendientes de confirmar; editarla no cambia el historial.
create table public.reglas_periodicas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  titulo text not null check (btrim(titulo) <> ''),
  valor bigint not null check (valor >= 0),
  descripcion text,
  categoria_id uuid not null,
  subcategoria_id uuid,
  lugar_id uuid,
  bolsa_id uuid,
  medio_id uuid,
  canal_id uuid,
  afecta_presupuesto boolean not null default true,
  frecuencia text not null check (frecuencia in (
    'diaria', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'anual',
    'cada_n_dias', 'cada_n_semanas', 'cada_n_meses')),
  intervalo smallint not null default 1 check (intervalo > 0),
  dia smallint check (dia between 1 and 31),
  fecha_inicio date not null,
  -- Nula = indefinida.
  repeticiones integer check (repeticiones > 0),
  proxima_fecha date not null,
  pausada boolean not null default false,
  unique (id, user_id),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (subcategoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (lugar_id, user_id) references public.lugares (id, user_id) on delete restrict,
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (medio_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  foreign key (canal_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  -- Un solo origen: bolsa o medio directo (3.3).
  check ((bolsa_id is null) <> (medio_id is null)),
  check (proxima_fecha >= fecha_inicio)
);

create index reglas_periodicas_categoria_idx on public.reglas_periodicas (categoria_id, user_id);
create index reglas_periodicas_subcategoria_idx on public.reglas_periodicas (subcategoria_id, user_id);
create index reglas_periodicas_lugar_idx on public.reglas_periodicas (lugar_id, user_id);
create index reglas_periodicas_bolsa_idx on public.reglas_periodicas (bolsa_id, user_id);
create index reglas_periodicas_medio_idx on public.reglas_periodicas (medio_id, user_id);
create index reglas_periodicas_canal_idx on public.reglas_periodicas (canal_id, user_id);

create function public.reglas_periodicas_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_tipo_categoria(new.categoria_id, new.user_id, 'gasto');
  perform public.exigir_clase_forma_pago(new.medio_id, new.user_id, 'medio');
  perform public.exigir_clase_forma_pago(new.canal_id, new.user_id, 'canal');
  return new;
end;
$$;

create trigger reglas_periodicas_validar
  before insert or update on public.reglas_periodicas
  for each row execute function public.reglas_periodicas_validar();

-- ---------------------------------------------------------------- prestamos (3.7)
-- El dinero que sale es un gasto (gastos.prestamo_id) y cada cobro un ingreso
-- (ingresos.prestamo_id).
create table public.prestamos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  persona_id uuid not null,
  monto bigint not null check (monto >= 0),
  fecha date not null,
  nota text,
  fecha_acordada date,
  no_recuperado boolean not null default false,
  unique (id, user_id),
  foreign key (persona_id, user_id) references public.personas (id, user_id) on delete restrict
);

create index prestamos_persona_idx on public.prestamos (persona_id, user_id);

-- ---------------------------------------------------------------- deudas (3.8)
create table public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  persona_id uuid not null,
  -- Pago de préstamos o la categoría propia de una tarjeta (tipo deuda).
  categoria_id uuid not null,
  fecha date not null default (now() at time zone 'America/Bogota')::date,
  valor_recibido bigint not null check (valor_recibido >= 0),
  total_pagar bigint not null check (total_pagar >= valor_recibido),
  num_cuotas integer not null check (num_cuotas > 0),
  valor_cuota bigint not null check (valor_cuota >= 0),
  dia_pago smallint not null check (dia_pago between 1 and 31),
  bolsa_id uuid,
  medio_id uuid,
  canal_id uuid,
  -- Una cuota por nómina, por ejemplo, no afecta el presupuesto.
  afecta_presupuesto boolean not null default true,
  nota text,
  unique (id, user_id),
  foreign key (persona_id, user_id) references public.personas (id, user_id) on delete restrict,
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete restrict,
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (medio_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  foreign key (canal_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  check ((bolsa_id is null) <> (medio_id is null))
);

create index deudas_persona_idx on public.deudas (persona_id, user_id);
create index deudas_categoria_idx on public.deudas (categoria_id, user_id);
create index deudas_bolsa_idx on public.deudas (bolsa_id, user_id);
create index deudas_medio_idx on public.deudas (medio_id, user_id);
create index deudas_canal_idx on public.deudas (canal_id, user_id);

create function public.deudas_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_tipo_categoria(new.categoria_id, new.user_id, 'deuda');
  perform public.exigir_clase_forma_pago(new.medio_id, new.user_id, 'medio');
  perform public.exigir_clase_forma_pago(new.canal_id, new.user_id, 'canal');
  return new;
end;
$$;

create trigger deudas_validar
  before insert or update on public.deudas
  for each row execute function public.deudas_validar();

-- ---------------------------------------------------------------- cuotas_deuda (3.8)
create table public.cuotas_deuda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  deuda_id uuid not null,
  numero integer not null check (numero > 0),
  fecha date not null,
  valor bigint not null check (valor >= 0),
  pagada_at timestamptz,
  unique (id, user_id),
  unique (deuda_id, numero),
  foreign key (deuda_id, user_id) references public.deudas (id, user_id) on delete cascade
);

create index cuotas_deuda_deuda_idx on public.cuotas_deuda (deuda_id, user_id);

-- ---------------------------------------------------------------- abonos_deuda (3.8)
create table public.abonos_deuda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  deuda_id uuid not null,
  fecha date not null,
  valor bigint not null check (valor >= 0),
  nota text,
  unique (id, user_id),
  foreign key (deuda_id, user_id) references public.deudas (id, user_id) on delete cascade
);

create index abonos_deuda_deuda_idx on public.abonos_deuda (deuda_id, user_id);

-- ---------------------------------------------------------------- RLS
alter table public.reglas_periodicas enable row level security;
alter table public.prestamos enable row level security;
alter table public.deudas enable row level security;
alter table public.cuotas_deuda enable row level security;
alter table public.abonos_deuda enable row level security;

create policy reglas_periodicas_select_propias on public.reglas_periodicas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy reglas_periodicas_insert_propias on public.reglas_periodicas for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy reglas_periodicas_update_propias on public.reglas_periodicas for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reglas_periodicas_delete_propias on public.reglas_periodicas for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy prestamos_select_propios on public.prestamos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy prestamos_insert_propios on public.prestamos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy prestamos_update_propios on public.prestamos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy prestamos_delete_propios on public.prestamos for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy deudas_select_propias on public.deudas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy deudas_insert_propias on public.deudas for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy deudas_update_propias on public.deudas for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy deudas_delete_propias on public.deudas for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy cuotas_deuda_select_propias on public.cuotas_deuda for select
  to authenticated using ((select auth.uid()) = user_id);
create policy cuotas_deuda_insert_propias on public.cuotas_deuda for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy cuotas_deuda_update_propias on public.cuotas_deuda for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cuotas_deuda_delete_propias on public.cuotas_deuda for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy abonos_deuda_select_propios on public.abonos_deuda for select
  to authenticated using ((select auth.uid()) = user_id);
create policy abonos_deuda_insert_propios on public.abonos_deuda for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy abonos_deuda_update_propios on public.abonos_deuda for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy abonos_deuda_delete_propios on public.abonos_deuda for delete
  to authenticated using ((select auth.uid()) = user_id);
