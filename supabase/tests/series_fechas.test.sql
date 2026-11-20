-- 3.6 y 3.15 Series de fechas de periódicos y aportes: la fecha n (desde 0) de una serie se calcula
-- desde el inicio y el número de repetición, nunca sumando a la fecha anterior ya ajustada.
-- Etapa 3, issue #8 (supuestos 9 y 10). Funciones puras: no necesitan usuarios.
begin;
select plan(18);

select results_eq(
  $$ select public.fecha_serie('mensual', 1, 31, '2027-01-31', n) from generate_series(0, 4) n $$,
  $$ values ('2027-01-31'::date), ('2027-02-28'), ('2027-03-31'), ('2027-04-30'), ('2027-05-31') $$,
  'mensual el 31: último día en meses cortos y vuelve al 31');
select results_eq(
  $$ select public.fecha_serie('mensual', 1, 31, '2028-01-31', n) from generate_series(0, 2) n $$,
  $$ values ('2028-01-31'::date), ('2028-02-29'), ('2028-03-31') $$,
  'mensual el 31 en año bisiesto: 29 de febrero');
select results_eq(
  $$ select public.fecha_serie('mensual', 1, null, '2027-01-31', n) from generate_series(0, 2) n $$,
  $$ values ('2027-01-31'::date), ('2027-02-28'), ('2027-03-31') $$,
  'sin día explícito, el mensual usa el día de la fecha de inicio');
select results_eq(
  $$ select public.fecha_serie('mensual', 1, 5, '2026-11-20', n) from generate_series(0, 1) n $$,
  $$ values ('2026-12-05'::date), ('2027-01-05') $$,
  'si el día ya pasó en el mes de inicio, la serie empieza el mes siguiente');
select results_eq(
  $$ select public.fecha_serie('anual', 1, 29, '2028-02-29', n) from generate_series(0, 4) n $$,
  $$ values ('2028-02-29'::date), ('2029-02-28'), ('2030-02-28'), ('2031-02-28'), ('2032-02-29') $$,
  'anual el 29 de febrero: 28 en años no bisiestos');
select results_eq(
  $$ select public.fecha_serie('bimestral', 1, 15, '2026-11-15', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-15'::date), ('2027-01-15'), ('2027-03-15') $$, 'bimestral: cada 2 meses');
select results_eq(
  $$ select public.fecha_serie('trimestral', 1, 30, '2026-11-30', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-30'::date), ('2027-02-28'), ('2027-05-30') $$, 'trimestral el 30: 28 en febrero');
select results_eq(
  $$ select public.fecha_serie('cada_n_meses', 4, 10, '2026-11-10', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-10'::date), ('2027-03-10'), ('2027-07-10') $$, 'cada 4 meses');
select results_eq(
  $$ select public.fecha_serie('diaria', 1, null, '2026-12-30', n) from generate_series(0, 3) n $$,
  $$ values ('2026-12-30'::date), ('2026-12-31'), ('2027-01-01'), ('2027-01-02') $$, 'diaria cruzando el año');
select results_eq(
  $$ select public.fecha_serie('cada_n_dias', 10, null, '2028-02-20', n) from generate_series(0, 2) n $$,
  $$ values ('2028-02-20'::date), ('2028-03-01'), ('2028-03-11') $$, 'cada 10 días contando el 29 de febrero');
select results_eq(
  $$ select public.fecha_serie('semanal', 1, null, '2026-11-20', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-20'::date), ('2026-11-27'), ('2026-12-04') $$, 'semanal');
select results_eq(
  $$ select public.fecha_serie('cada_n_semanas', 3, null, '2026-11-20', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-20'::date), ('2026-12-11'), ('2027-01-01') $$, 'cada 3 semanas');

-- Quincenal: día D y D+15 de cada mes, con el ajuste al último día (decidido el 20-nov-2026).
select results_eq(
  $$ select public.fecha_serie('quincenal', 1, 15, '2027-01-15', n) from generate_series(0, 4) n $$,
  $$ values ('2027-01-15'::date), ('2027-01-30'), ('2027-02-15'), ('2027-02-28'), ('2027-03-15') $$,
  'quincenal el 15: 15 y 30, y en febrero 15 y 28');
select results_eq(
  $$ select public.fecha_serie('quincenal', 1, 1, '2026-11-01', n) from generate_series(0, 3) n $$,
  $$ values ('2026-11-01'::date), ('2026-11-16'), ('2026-12-01'), ('2026-12-16') $$, 'quincenal el 1: 1 y 16');
select results_eq(
  $$ select public.fecha_serie('quincenal', 1, 15, '2027-01-20', n) from generate_series(0, 2) n $$,
  $$ values ('2027-01-30'::date), ('2027-02-15'), ('2027-02-28') $$,
  'quincenal que arranca entre las dos fechas: la primera es la siguiente de la serie');
select results_eq(
  $$ select public.fecha_serie('quincenal', 1, 20, '2026-11-20', n) from generate_series(0, 2) n $$,
  $$ values ('2026-11-20'::date), ('2026-12-05'), ('2026-12-20') $$,
  'quincenal con día mayor que 16: el otro día es D − 15');

-- Entradas inválidas.
select throws_ok($$ select public.fecha_serie('cada_luna', 1, null, '2026-11-20', 0) $$,
  'P0001', 'serie.frecuencia_invalida', 'una frecuencia desconocida da error');
select throws_ok($$ select public.fecha_serie('mensual', 1, 15, '2026-11-15', -1) $$,
  'P0001', 'serie.numero_invalido', 'el número de repetición no puede ser negativo');

select * from finish();
rollback;
