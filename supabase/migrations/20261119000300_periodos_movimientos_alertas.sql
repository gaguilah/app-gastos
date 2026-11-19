-- Etapa 2 (issue #7), tarea 4: períodos, movimientos de bolsa y alertas enviadas.
-- Reglas: 3.1 (períodos), 3.2 (un aviso por umbral y período), 3.4 (recargas y registro
-- de ajustes), 3.15 (aportes, retiros y saldo inicial de las metas).
-- Las llaves de movimientos_bolsa hacia metas_ahorro y reglas_aporte se agregan en la
-- migración de ahorros (tarea 7), cuando esas tablas existan.

-- ---------------------------------------------------------------- periodos (3.1)
create table public.periodos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  fecha_inicio date not null,
  fecha_fin date not null,
  presupuesto bigint not null check (presupuesto >= 0),
  cerrado_at timestamptz,
  -- Resumen guardado al cerrar el período (3.1); se escribe en la Etapa 3.
  resumen jsonb,
  unique (id, user_id),
  check (fecha_fin >= fecha_inicio),
  -- Los períodos de un mismo usuario no se solapan.
  constraint periodos_sin_solapes exclude using gist (
    user_id with =,
    daterange(fecha_inicio, fecha_fin, '[]') with &&
  )
);

-- ---------------------------------------------------------------- movimientos_bolsa
-- Solo lo que no es gasto ni ingreso: el saldo de una bolsa será
-- movimientos + ingresos con destino la bolsa − gastos con origen en ella (Etapa 3).
create table public.movimientos_bolsa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  bolsa_id uuid not null,
  tipo text not null check (tipo in ('recarga', 'ajuste', 'saldo_inicial', 'aporte', 'retiro')),
  sentido text not null check (sentido in ('entrada', 'salida')),
  fecha date not null,
  valor bigint not null check (valor >= 0),
  nota text,
  -- Ahorros (3.15): meta del aporte, retiro o saldo inicial; medio directo de un aporte
  -- que no sale de una bolsa, y si ese aporte afecta el presupuesto (decisión del 18-nov-2026).
  meta_id uuid,
  medio_id uuid,
  afecta_presupuesto boolean not null default false,
  -- Registro de ajustes (3.4, decisión del 18-nov-2026): saldo que contó el usuario.
  saldo_real bigint check (saldo_real >= 0),
  -- El otro lado de un aporte o retiro entre dos bolsas.
  enlace_id uuid,
  -- Aportes generados por una regla periódica (3.15).
  regla_aporte_id uuid,
  fecha_programada date,
  estado text not null default 'confirmado' check (estado in ('pendiente', 'confirmado', 'omitido')),
  unique (id, user_id),
  unique (regla_aporte_id, fecha_programada),
  foreign key (bolsa_id, user_id) references public.bolsas (id, user_id) on delete restrict,
  foreign key (medio_id, user_id) references public.formas_pago (id, user_id) on delete restrict,
  foreign key (enlace_id, user_id) references public.movimientos_bolsa (id, user_id) on delete cascade,
  -- Sentido de cada tipo: recargas, ajustes (hacia arriba) y saldos iniciales entran.
  check (tipo in ('aporte', 'retiro') or sentido = 'entrada'),
  -- Aportes, retiros y saldos iniciales siempre son de una meta; lo demás no.
  check ((tipo in ('aporte', 'retiro', 'saldo_inicial')) = (meta_id is not null)),
  -- Solo un ajuste lleva el saldo contado, y todo ajuste lo lleva.
  check ((tipo = 'ajuste') = (saldo_real is not null)),
  -- El medio directo solo aplica a la entrada de un aporte.
  check (medio_id is null or (tipo = 'aporte' and sentido = 'entrada')),
  -- Solo un aporte desde un medio directo puede afectar el presupuesto.
  check (not afecta_presupuesto or (tipo = 'aporte' and medio_id is not null)),
  -- La regla y la fecha programada van juntas, en la entrada de un aporte.
  check ((regla_aporte_id is null) = (fecha_programada is null)),
  check (regla_aporte_id is null or (tipo = 'aporte' and sentido = 'entrada')),
  -- Pendiente u omitido solo tiene sentido en un aporte generado por una regla.
  check (estado = 'confirmado' or regla_aporte_id is not null)
);

create index movimientos_bolsa_fecha_idx on public.movimientos_bolsa (user_id, fecha);
create index movimientos_bolsa_bolsa_idx on public.movimientos_bolsa (bolsa_id, user_id);
create index movimientos_bolsa_medio_idx on public.movimientos_bolsa (medio_id, user_id);
create index movimientos_bolsa_enlace_idx on public.movimientos_bolsa (enlace_id, user_id);
create index movimientos_bolsa_meta_idx on public.movimientos_bolsa (meta_id, user_id);

create function public.movimientos_bolsa_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.exigir_clase_forma_pago(new.medio_id, new.user_id, 'medio');
  return new;
end;
$$;

create trigger movimientos_bolsa_validar
  before insert or update on public.movimientos_bolsa
  for each row execute function public.movimientos_bolsa_validar();

-- ---------------------------------------------------------------- alertas_enviadas (3.2)
create table public.alertas_enviadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  periodo_id uuid not null,
  -- 101 significa "superó el presupuesto".
  umbral smallint not null check (umbral in (70, 75, 80, 85, 90, 95, 100, 101)),
  enviada_at timestamptz not null default now(),
  unique (id, user_id),
  unique (periodo_id, umbral),
  foreign key (periodo_id, user_id) references public.periodos (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------- RLS
alter table public.periodos enable row level security;
alter table public.movimientos_bolsa enable row level security;
alter table public.alertas_enviadas enable row level security;

create policy periodos_select_propios on public.periodos for select
  to authenticated using ((select auth.uid()) = user_id);
create policy periodos_insert_propios on public.periodos for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy periodos_update_propios on public.periodos for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy periodos_delete_propios on public.periodos for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy movimientos_bolsa_select_propios on public.movimientos_bolsa for select
  to authenticated using ((select auth.uid()) = user_id);
create policy movimientos_bolsa_insert_propios on public.movimientos_bolsa for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy movimientos_bolsa_update_propios on public.movimientos_bolsa for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy movimientos_bolsa_delete_propios on public.movimientos_bolsa for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy alertas_enviadas_select_propias on public.alertas_enviadas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy alertas_enviadas_insert_propias on public.alertas_enviadas for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy alertas_enviadas_update_propias on public.alertas_enviadas for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy alertas_enviadas_delete_propias on public.alertas_enviadas for delete
  to authenticated using ((select auth.uid()) = user_id);
