-- 3.1 Período: fechas según el día de inicio, creación continua de períodos y cambio de día de inicio.
-- Etapa 3, issue #8 (supuestos 1 a 4). Siempre con fechas fijas: nada depende del día en que corre.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@prueba.local');

-- ------------------------------------------------------------ hoy en Bogotá
select is(public.hoy_bogota(), (now() at time zone 'America/Bogota')::date,
  'hoy_bogota es la fecha actual en America/Bogota, no en UTC');

-- ------------------------------------------------------------ calcular_periodo
select results_eq($$ select * from public.calcular_periodo('2026-02-10', 1) $$,
  $$ values ('2026-02-01'::date, '2026-02-28'::date) $$, 'inicio 1: del 1 al fin de mes');
select results_eq($$ select * from public.calcular_periodo('2028-02-10', 1) $$,
  $$ values ('2028-02-01'::date, '2028-02-29'::date) $$, 'inicio 1 en año bisiesto: hasta el 29 de febrero');
select results_eq($$ select * from public.calcular_periodo('2026-03-02', 15) $$,
  $$ values ('2026-02-15'::date, '2026-03-14'::date) $$, 'inicio 15 antes del 15: período que empezó el mes anterior');
select results_eq($$ select * from public.calcular_periodo('2026-03-15', 15) $$,
  $$ values ('2026-03-15'::date, '2026-04-14'::date) $$, 'inicio 15 el mismo 15: empieza ese día');
select results_eq($$ select * from public.calcular_periodo('2026-12-20', 15) $$,
  $$ values ('2026-12-15'::date, '2027-01-14'::date) $$, 'inicio 15 cruzando el año');
select results_eq($$ select * from public.calcular_periodo('2026-05-10', 31) $$,
  $$ values ('2026-04-30'::date, '2026-05-30'::date) $$, 'inicio 31: en abril empieza el 30');
select results_eq($$ select * from public.calcular_periodo('2027-03-10', 31) $$,
  $$ values ('2027-02-28'::date, '2027-03-30'::date) $$, 'inicio 31: en febrero empieza el 28');
select results_eq($$ select * from public.calcular_periodo('2028-03-10', 30) $$,
  $$ values ('2028-02-29'::date, '2028-03-29'::date) $$, 'inicio 30 en bisiesto: en febrero empieza el 29');
select results_eq($$ select * from public.calcular_periodo('2026-05-31', 31) $$,
  $$ values ('2026-05-31'::date, '2026-06-29'::date) $$, 'inicio 31 el 31 de mayo: termina el día antes del 30 de junio');

-- ------------------------------------------------------------ asegurar_periodos como A
update public.perfiles set dia_inicio = 15, presupuesto_defecto = 1500000
 where user_id = '00000000-0000-0000-0000-0000000000a1';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select results_eq(
  $$ select fecha_inicio, fecha_fin, presupuesto from public.asegurar_periodos('2026-12-20') $$,
  $$ values ('2026-12-15'::date, '2027-01-14'::date, 1500000::bigint) $$,
  'el primer período se crea con el día de inicio y el presupuesto por defecto, y se devuelve');
select is((select count(*)::int from public.periodos), 1, 'solo se crea el período de hoy');
select lives_ok($$ select public.asegurar_periodos('2026-12-20') $$, 'correrla otra vez no falla');
select is((select count(*)::int from public.periodos), 1, 'correrla otra vez no duplica');

-- Cambio de día de inicio: el período abierto no se recorta; hay uno de transición (supuesto 3).
update public.perfiles set dia_inicio = 1;
select is((select fecha_fin from public.periodos), '2027-01-14'::date, 'cambiar el día de inicio no recorta el período abierto');
select results_eq(
  $$ select fecha_inicio, fecha_fin from public.asegurar_periodos('2027-02-03') $$,
  $$ values ('2027-02-01'::date, '2027-02-28'::date) $$, 'después de la transición, el período de hoy usa el nuevo inicio');
select results_eq(
  $$ select fecha_inicio, fecha_fin from public.periodos order by fecha_inicio $$,
  $$ values ('2026-12-15'::date, '2027-01-14'::date), ('2027-01-15'::date, '2027-01-31'::date),
            ('2027-02-01'::date, '2027-02-28'::date) $$,
  'período de transición corto del 15 al 31 de enero, sin huecos ni solapes');

-- Presupuesto editado en un período: el siguiente nace con el presupuesto por defecto.
update public.periodos set presupuesto = 2500000 where fecha_inicio = '2027-02-01';
select is((select presupuesto from public.asegurar_periodos('2027-03-01')), 1500000::bigint,
  'cada período nace con el presupuesto por defecto, aunque el anterior se haya ajustado');

-- B no puede crear períodos para A ni ver los de A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is_empty($$ select * from public.periodos $$, 'B no ve los períodos de A');
select throws_ok($$ select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-03-01') $$,
  '42501', null, 'B no puede llamar la versión interna para crear períodos a nombre de A');

-- Anónimo no puede llamar la función.
set local role anon;
select throws_ok($$ select public.asegurar_periodos('2027-03-01') $$,
  '42501', null, 'un usuario anónimo no puede llamar asegurar_periodos');

-- ------------------------------------------------------------ huecos (proyecto pausado) e inicio 31
-- Como servidor (la tarea diaria usa asegurar_periodos_de).
reset role;
update public.perfiles set dia_inicio = 31 where user_id = '00000000-0000-0000-0000-0000000000c3';
insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
values ('00000000-0000-0000-0000-0000000000c3', '2026-08-31', '2026-09-29', 1000000);

select results_eq(
  $$ select fecha_inicio, fecha_fin from public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000c3', '2026-12-03') $$,
  $$ values ('2026-11-30'::date, '2026-12-30'::date) $$, 'con huecos devuelve el período de hoy');
select results_eq(
  $$ select fecha_inicio, fecha_fin from public.periodos
      where user_id = '00000000-0000-0000-0000-0000000000c3' order by fecha_inicio $$,
  $$ values ('2026-08-31'::date, '2026-09-29'::date), ('2026-09-30'::date, '2026-10-30'::date),
            ('2026-10-31'::date, '2026-11-29'::date), ('2026-11-30'::date, '2026-12-30'::date) $$,
  'crea todos los períodos que faltan, continuos, con inicio 31 ajustado a meses cortos');
select is(
  (select count(*)::int from public.periodos p
     join lateral public.calcular_periodo(p.fecha_inicio, 31) c on true
    where p.user_id = '00000000-0000-0000-0000-0000000000c3'
      and (c.fecha_inicio, c.fecha_fin) <> (p.fecha_inicio, p.fecha_fin)), 0,
  'los períodos creados coinciden con calcular_periodo');

select * from finish();
rollback;
