-- Tarea diaria (Etapa 3, issue #8, supuesto 20): para cada usuario asegura los períodos, genera
-- periódicos, cuotas y aportes pendientes y cierra los períodos vencidos. Idempotente.
-- Fechas fijas, salvo ponerse_al_dia, que siempre usa hoy en Bogotá.
begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');
update public.perfiles set presupuesto_defecto = 1000000 where user_id = '00000000-0000-0000-0000-0000000000a1';

insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Hogar prueba', 'house', '#b45309', 'gasto'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Deuda prueba', 'landmark', '#4343c8', 'deuda');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio');
insert into public.personas (id, user_id, nombre, tipo) values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Banco Prueba', 'banco');
insert into public.bolsas (id, user_id, nombre) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta');
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 3000000, '2027-12-31', '00000000-0000-0000-0003-000000000001');
insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto) values
  ('00000000-0000-0000-0000-0000000000a1', '2026-10-01', '2026-10-31', 1000000);
insert into public.reglas_periodicas (user_id, titulo, valor, categoria_id, medio_id, frecuencia, dia, fecha_inicio, proxima_fecha) values
  ('00000000-0000-0000-0000-0000000000a1', 'Internet', 90000, '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0002-000000000001', 'mensual', 15, '2026-10-15', '2026-10-15');
-- Deuda sin plan de cuotas: la tarea diaria se lo crea.
insert into public.deudas (user_id, persona_id, categoria_id, fecha, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000002',
   '2026-10-20', 200000, 2, 100000, 5, '00000000-0000-0000-0002-000000000001');
insert into public.reglas_aporte (user_id, meta_id, valor, frecuencia, dia, medio_id, proxima_fecha) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000001', 50000, 'quincenal', 1,
   '00000000-0000-0000-0002-000000000001', '2026-11-01');

-- Como servidor (pg_cron), el 20 de noviembre.
select is(
  public.tarea_diaria('2026-11-20') - 'usuarios',
  '{"periodos_cerrados": 1, "periodicos": 2, "cuotas": 1, "aportes": 2}'::jsonb,
  'devuelve cuánto hizo: cierra octubre, 2 periódicos (15-oct y 15-nov), la cuota del 5-nov y 2 aportes (1 y 16-nov)');
select results_eq(
  $$ select fecha_inicio, fecha_fin, presupuesto, cerrado_at is not null, resumen is not null from public.periodos
      where user_id = '00000000-0000-0000-0000-0000000000a1' order by fecha_inicio $$,
  $$ values ('2026-10-01'::date, '2026-10-31'::date, 1000000::bigint, true, true),
            ('2026-11-01', '2026-11-30', 1000000, false, false) $$,
  'crea el período de hoy con el presupuesto por defecto y cierra el vencido con su resumen');
select results_eq(
  $$ select fecha, estado from public.gastos where user_id = '00000000-0000-0000-0000-0000000000a1' and regla_id is not null order by fecha $$,
  $$ values ('2026-10-15'::date, 'pendiente'), ('2026-11-15', 'pendiente') $$, 'genera los periódicos atrasados');
select is((select count(*)::int from public.cuotas_deuda where user_id = '00000000-0000-0000-0000-0000000000a1'), 2,
  'crea el plan de cuotas de la deuda que no lo tenía');
select results_eq(
  $$ select fecha from public.gastos where cuota_id is not null $$,
  $$ values ('2026-11-05'::date) $$, 'genera el pendiente de la cuota que ya llegó');
select results_eq(
  $$ select fecha from public.movimientos_bolsa where regla_aporte_id is not null order by fecha $$,
  $$ values ('2026-11-01'::date), ('2026-11-16') $$, 'genera los aportes pendientes');
select results_eq(
  $$ select count(*)::int from public.periodos where user_id = '00000000-0000-0000-0000-0000000000b2' and '2026-11-20' between fecha_inicio and fecha_fin $$,
  $$ values (1) $$, 'también atiende a los demás usuarios (B recibe su primer período)');

-- Idempotente.
select is(
  public.tarea_diaria('2026-11-20') - 'usuarios',
  '{"periodos_cerrados": 0, "periodicos": 0, "cuotas": 0, "aportes": 0}'::jsonb,
  'correrla otra vez el mismo día no hace nada');
select results_eq(
  $$ select (select count(*)::int from public.gastos where user_id = '00000000-0000-0000-0000-0000000000a1'),
            (select count(*)::int from public.movimientos_bolsa where user_id = '00000000-0000-0000-0000-0000000000a1'),
            (select count(*)::int from public.periodos
              where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')) $$,
  $$ values (3, 2, 3) $$, 'y no duplica gastos, aportes ni períodos');

-- Programación con pg_cron a las 00:10 de Bogotá (05:10 UTC).
select results_eq(
  $$ select schedule, command from cron.job where jobname = 'tarea-diaria' $$,
  $$ values ('10 5 * * *'::text, 'select public.tarea_diaria()'::text) $$,
  'pg_cron corre la tarea diaria a las 00:10 de Bogotá');

-- Por la API: la tarea completa no; ponerse al día solo para uno mismo.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.tarea_diaria('2026-11-21') $$, '42501', null,
  'un usuario no puede correr la tarea diaria de todos');
select ok((public.ponerse_al_dia() ? 'periodicos'), 'un usuario puede ponerse al día con lo suyo');
set local role anon;
select throws_ok($$ select public.ponerse_al_dia() $$, '42501', null, 'un anónimo no puede ponerse al día');

select * from finish();
rollback;
