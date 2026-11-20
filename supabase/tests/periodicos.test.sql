-- 3.6 Gastos periódicos: generación de pendientes sin duplicar, fechas atrasadas, repeticiones,
-- pausa y reanudación, edición hacia adelante y confirmación con valor ajustado.
-- Etapa 3, issue #8 (supuestos 9 a 14). Fechas fijas.
begin;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Hogar prueba', 'house', '#b45309', 'gasto');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio');

-- Reglas de A. La próxima fecha que envía el cliente se ignora: la calcula la base desde el inicio.
insert into public.reglas_periodicas
  (id, user_id, titulo, valor, categoria_id, medio_id, frecuencia, intervalo, dia, fecha_inicio, repeticiones, pausada, proxima_fecha) values
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Arriendo', 900000,
   '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'mensual', 1, 31, '2027-01-31', null, false, '2027-06-01'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Tres cafés', 5000,
   '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'diaria', 1, null, '2027-03-01', 3, false, '2027-03-01'),
  ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Bus', 3000,
   '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'diaria', 1, null, '2027-04-01', null, false, '2027-04-01'),
  ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Clase semanal', 40000,
   '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001', 'semanal', 1, null, '2027-03-01', null, true, '2027-03-01');

select is((select proxima_fecha from public.reglas_periodicas where id = '00000000-0000-0000-0005-000000000001'),
  '2027-01-31'::date, 'al crear la regla, la próxima fecha es la primera de su serie');

-- 31 de marzo: arriendo de ene, feb y mar + 3 cafés. 30 de abril: arriendo de abril + 30 buses.
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-03-31'), 6,
  'genera los pendientes hasta hoy y devuelve cuántos creó');
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-04-30'), 31,
  'la siguiente corrida solo genera lo nuevo');
select results_eq(
  $$ select fecha, fecha_programada, estado, valor, titulo, categoria_nombre from public.gastos
      where regla_id = '00000000-0000-0000-0005-000000000001' order by fecha $$,
  $$ values ('2027-01-31'::date, '2027-01-31'::date, 'pendiente', 900000::bigint, 'Arriendo', 'Hogar prueba'),
            ('2027-02-28', '2027-02-28', 'pendiente', 900000, 'Arriendo', 'Hogar prueba'),
            ('2027-03-31', '2027-03-31', 'pendiente', 900000, 'Arriendo', 'Hogar prueba'),
            ('2027-04-30', '2027-04-30', 'pendiente', 900000, 'Arriendo', 'Hogar prueba') $$,
  'mensual el 31: pendientes el 31-ene, 28-feb, 31-mar y 30-abr, con la plantilla de la regla');
select is((select proxima_fecha from public.reglas_periodicas where id = '00000000-0000-0000-0005-000000000001'),
  '2027-05-31'::date, 'la próxima fecha avanza a la siguiente de la serie');
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-04-30'), 0,
  'correrla otra vez el mismo día no crea nada');
select is((select count(*)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000001'), 4,
  'y no duplica gastos');

-- Repeticiones: la regla de 3 cafés no genera el cuarto.
select is((select count(*)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000002'), 3,
  'con 3 repeticiones genera exactamente 3');
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-05-10'), 10,
  'al 10 de mayo solo se generan los 10 buses: ningún café más');
select is((select count(*)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000002'), 3,
  'la regla con repeticiones sigue en 3');

-- Fechas atrasadas: el bus diario desde el 1 de abril, al 10 de mayo ya generó 40, una sola vez.
select is((select count(*)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000003'), 40,
  'una diaria atrasada genera todas las fechas pendientes');
select is((select count(distinct fecha_programada)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000003'), 40,
  'sin fechas repetidas');

-- Pausa: la clase semanal (lunes desde el 1 de marzo) no generó nada; al reanudar no recupera lo pausado.
select is((select count(*)::int from public.gastos where regla_id = '00000000-0000-0000-0005-000000000004'), 0,
  'una regla pausada no genera');
select is((public.reanudar_regla('00000000-0000-0000-0005-000000000004', '2027-05-11')).proxima_fecha,
  '2027-05-17'::date, 'al reanudar, la próxima fecha salta a la primera de la serie desde hoy');
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-05-17'), 8,
  'después de reanudar se genera la clase del 17 (más el bus del 11 al 17)');
select results_eq(
  $$ select fecha from public.gastos where regla_id = '00000000-0000-0000-0005-000000000004' $$,
  $$ values ('2027-05-17'::date) $$, 'no se generan las fechas del tiempo pausado');

-- Edición hacia adelante: cambiar el valor no toca lo ya generado.
update public.reglas_periodicas set valor = 950000 where id = '00000000-0000-0000-0005-000000000001';
select is(public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-05-31') >= 1, true,
  'genera el arriendo de mayo');
select results_eq(
  $$ select fecha, valor from public.gastos where regla_id = '00000000-0000-0000-0005-000000000001'
      and fecha in ('2027-04-30', '2027-05-31') order by fecha $$,
  $$ values ('2027-04-30'::date, 900000::bigint), ('2027-05-31', 950000) $$,
  'el gasto ya generado conserva el valor anterior; el nuevo usa el valor editado');

-- Confirmar como A, con valor ajustado.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select estado, valor from public.confirmar_gasto_pendiente(
       (select id from public.gastos where regla_id = '00000000-0000-0000-0005-000000000001' and fecha = '2027-01-31'), 920000) $$,
  $$ values ('confirmado', 920000::bigint) $$, 'confirmar un pendiente con valor ajustado');
select results_eq(
  $$ select estado, valor from public.confirmar_gasto_pendiente(
       (select id from public.gastos where regla_id = '00000000-0000-0000-0005-000000000001' and fecha = '2027-02-28')) $$,
  $$ values ('confirmado', 900000::bigint) $$, 'confirmar sin valor conserva el valor generado');
select throws_ok(
  $$ select public.confirmar_gasto_pendiente(
       (select id from public.gastos where regla_id = '00000000-0000-0000-0005-000000000001' and fecha = '2027-01-31')) $$,
  'P0001', 'pendiente.ya_confirmado', 'un gasto ya confirmado no se vuelve a confirmar');

-- Aislamiento.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$ select public.confirmar_gasto_pendiente('00000000-0000-0000-0000-000000000000') $$,
  'P0002', 'gasto.no_existe', 'B no puede confirmar gastos que no ve');
select throws_ok(
  $$ select public.generar_periodicos_de('00000000-0000-0000-0000-0000000000a1', '2027-06-30') $$,
  '42501', null, 'la generación no se puede llamar por la API');

select * from finish();
rollback;
