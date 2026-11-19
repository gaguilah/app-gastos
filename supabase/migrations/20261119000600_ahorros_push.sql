-- Etapa 2 (issue #7), tarea 7: metas de ahorro, reglas de aporte y suscripciones push.
-- Reglas: 3.15 (ahorros) y notificaciones push (plan sección 2; envío en las Etapas 3 y 12).
-- Los estados "al día", "atrasada" y "cumplida" de una meta se derivan en la Etapa 3;
-- aquí solo se guardan las marcas que pone el usuario (pausada, eliminada).

-- ---------------------------------------------------------------- metas_ahorro
create table public.metas_ahorro (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  nombre text not null check (btrim(nombre) <> ''),
  monto_meta bigint not null check (monto_meta > 0),
  fecha_final date not null,
  -- Cada meta tiene su propia bolsa, sin forma de pago.
  bolsa_id uuid not null,
  pausada boolean not null default false,
  eliminada_at timestamptz,
  unique (id, user_id),
  unique (bolsa_id),
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict
);

create index metas_ahorro_bolsa_idx on public.metas_ahorro (bolsa_id, user_id);

create function public.metas_ahorro_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bolsas
     where id = new.bolsa_id and user_id = new.user_id and forma_pago_id is not null
  ) then
    raise exception 'La bolsa de una meta no puede ser una bolsa de forma de pago'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger metas_ahorro_validar
  before insert or update on public.metas_ahorro
  for each row execute function public.metas_ahorro_validar();

-- ---------------------------------------------------------------- reglas_aporte
create table public.reglas_aporte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  meta_id uuid not null,
  valor bigint not null check (valor > 0),
  frecuencia text not null check (frecuencia in ('semanal', 'quincenal', 'mensual')),
  dia smallint check (dia between 1 and 31),
  bolsa_id uuid,
  medio_id uuid,
  -- Decisión de Giovanni del 18-nov-2026: se elige en cada aporte desde un medio directo.
  afecta_presupuesto boolean not null default false,
  proxima_fecha date not null,
  pausada boolean not null default false,
  unique (id, user_id),
  foreign key (meta_id, user_id) references public.metas_ahorro (id, user_id) on delete cascade,
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (medio_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  check ((bolsa_id is null) <> (medio_id is null)),
  check (not afecta_presupuesto or medio_id is not null)
);

create index reglas_aporte_meta_idx on public.reglas_aporte (meta_id, user_id);
create index reglas_aporte_bolsa_idx on public.reglas_aporte (bolsa_id, user_id);
create index reglas_aporte_medio_idx on public.reglas_aporte (medio_id, user_id);

create function public.reglas_aporte_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_clase_forma_pago(new.medio_id, new.user_id, 'medio');
  return new;
end;
$$;

create trigger reglas_aporte_validar
  before insert or update on public.reglas_aporte
  for each row execute function public.reglas_aporte_validar();

-- ---------------------------------------------------------------- llaves pendientes de movimientos_bolsa
alter table public.movimientos_bolsa
  add foreign key (meta_id, user_id) references public.metas_ahorro (id, user_id) on delete restrict,
  add foreign key (regla_aporte_id, user_id) references public.reglas_aporte (id, user_id) on delete restrict;

create index movimientos_bolsa_regla_aporte_idx on public.movimientos_bolsa (regla_aporte_id, user_id);

-- ---------------------------------------------------------------- suscripciones_push
-- Permiso de un dispositivo para recibir avisos: su dirección (endpoint) y claves de cifrado.
create table public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  dispositivo text,
  endpoint text not null check (endpoint like 'https://%'),
  claves jsonb not null,
  unique (id, user_id),
  unique (user_id, endpoint)
);

-- ---------------------------------------------------------------- RLS
alter table public.metas_ahorro enable row level security;
alter table public.reglas_aporte enable row level security;
alter table public.suscripciones_push enable row level security;

create policy metas_ahorro_select_propias on public.metas_ahorro for select
  to authenticated using ((select auth.uid()) = user_id);
create policy metas_ahorro_insert_propias on public.metas_ahorro for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy metas_ahorro_update_propias on public.metas_ahorro for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy metas_ahorro_delete_propias on public.metas_ahorro for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy reglas_aporte_select_propias on public.reglas_aporte for select
  to authenticated using ((select auth.uid()) = user_id);
create policy reglas_aporte_insert_propias on public.reglas_aporte for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy reglas_aporte_update_propias on public.reglas_aporte for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reglas_aporte_delete_propias on public.reglas_aporte for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy suscripciones_push_select_propias on public.suscripciones_push for select
  to authenticated using ((select auth.uid()) = user_id);
create policy suscripciones_push_insert_propias on public.suscripciones_push for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy suscripciones_push_update_propias on public.suscripciones_push for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy suscripciones_push_delete_propias on public.suscripciones_push for delete
  to authenticated using ((select auth.uid()) = user_id);
