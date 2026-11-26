-- 3.15 Ahorros desde la app: aporte sugerido, crear y editar metas, aportes manuales, retiros,
-- pausar y reanudar, y eliminar pasando lo ahorrado a una bolsa.
-- Etapa 6, issue #11 (supuestos 18 a 26). Fechas fijas; las bolsas iniciales vienen de inicializar_usuario.
begin;
select plan(35);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');
insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto) values
  ('00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30', 1000000);

create temp table ids (nombre text primary key, id uuid);
grant all on ids to authenticated;
insert into ids select b.nombre, b.id from public.bolsas b where b.user_id = '00000000-0000-0000-0000-0000000000a1';
insert into ids select f.nombre, f.id from public.formas_pago f
 where f.user_id = '00000000-0000-0000-0000-0000000000a1' and f.clase = 'medio';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- aporte sugerido
select results_eq(
  $$ select aportes, aporte, ultima_fecha from public.sugerir_aporte(3000000, 0, '2027-11-30', 'mensual', 1, '2026-11-26') $$,
  $$ values (12, 250000::bigint, '2027-11-01'::date) $$,
  'mensual el día 1 del 1-dic-2026 al 1-nov-2027: 12 aportes de $250.000');
select results_eq(
  $$ select aportes, aporte from public.sugerir_aporte(3000000, 600000, '2027-11-30', 'mensual', 1, '2026-11-26') $$,
  $$ values (12, 200000::bigint) $$,
  'el saldo inicial baja el aporte sugerido');
select results_eq(
  $$ select aportes, aporte from public.sugerir_aporte(1000000, 0, '2026-12-31', 'quincenal', 1, '2026-11-26') $$,
  $$ values (2, 500000::bigint) $$,
  'quincenal el 1: 1 y 16 de diciembre');
select results_eq(
  $$ select aportes, aporte from public.sugerir_aporte(100000, 0, '2026-12-10', 'semanal', null, '2026-11-26') $$,
  $$ values (3, 33334::bigint) $$,
  'semanal desde hoy: 26-nov, 3-dic y 10-dic, redondeando hacia arriba');

-- ---------------------------------------------------------------- crear
insert into ids select 'Viaje', public.crear_meta('Viaje', 'plane', 3000000, '2027-11-30', 600000,
  250000, 'mensual', 1, (select id from ids where nombre = 'Nequi'), null, false, '2026-11-26');
select results_eq(
  $$ select m.nombre, m.icono, m.monto_meta, b.nombre, b.forma_pago_id from public.metas_ahorro m
       join public.bolsas b on b.id = m.bolsa_id where m.id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('Viaje', 'plane', 3000000::bigint, 'Viaje', null::uuid) $$,
  'crear_meta crea la meta con su ícono y su propia bolsa sin forma de pago');
select results_eq(
  $$ select tipo, valor from public.movimientos_bolsa where meta_id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('saldo_inicial', 600000::bigint) $$,
  'el saldo inicial queda en la bolsa de la meta');
select results_eq(
  $$ select valor, frecuencia, dia, bolsa_id, proxima_fecha from public.reglas_aporte
      where meta_id = (select id from ids where nombre = 'Viaje') $$,
  $$ values (250000::bigint, 'mensual', 1::smallint, (select id from ids where nombre = 'Nequi'), '2026-12-01'::date) $$,
  'la regla de aporte queda con su primera fecha');
insert into ids select 'Bici', public.crear_meta('Bici', 'bike', 500000, '2027-06-30', 0,
  50000, 'quincenal', 15, null, (select id from ids where nombre = 'Débito'), true, '2026-11-26');
select is((select afecta_presupuesto from public.reglas_aporte where meta_id = (select id from ids where nombre = 'Bici')),
  true, 'una regla desde un medio directo puede afectar el presupuesto');
select lives_ok($$ select public.editar_meta((select id from ids where nombre = 'Bici'), 'Bici', 'bike',
  500000, '2027-06-30', null, null, null, null, null, false, '2026-11-26') $$,
  'quitar los aportes periódicos de una meta');
select is((select count(*)::int from public.reglas_aporte where meta_id = (select id from ids where nombre = 'Bici')),
  0, 'la regla sin aportes generados se borra');
select throws_ok($$ select public.crear_meta('Mal', 'plane', 100000, '2026-11-26', 0, null, null, null, null, null, false, '2026-11-26') $$,
  'P0001', 'meta.fecha_invalida', 'la fecha final debe ser posterior a hoy');
select throws_ok($$ select public.crear_meta('Mal', 'plane', 0, '2027-01-31', 0, null, null, null, null, null, false, '2026-11-26') $$,
  'P0001', 'meta.monto_invalido', 'el monto debe ser mayor que 0');
select throws_ok($$ select public.crear_meta('Mal', 'plane', 100000, '2027-01-31', 0, 1000, 'mensual', 1,
  (select id from ids where nombre = 'Nequi'), null, true, '2026-11-26') $$,
  'P0001', 'aporte.afecta_desde_bolsa', 'un aporte desde una bolsa nunca afecta el presupuesto');

-- ---------------------------------------------------------------- aportes manuales
insert into ids select 'Aporte Nequi', public.aportar_meta((select id from ids where nombre = 'Viaje'), 250000,
  (select id from ids where nombre = 'Nequi'), null, false, '2026-11-10');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa s join public.metas_ahorro m on m.bolsa_id = s.bolsa_id
              where m.id = (select id from ids where nombre = 'Viaje')),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')),
            (select disponible from public.disponible_periodo) $$,
  $$ values (850000::bigint, -250000::bigint, 1000000::bigint) $$,
  'el aporte desde Nequi pasa el dinero a la meta sin tocar el disponible');
select results_eq(
  $$ select s.tipo, s.sentido, s.bolsa_id from public.movimientos_bolsa s
      where s.enlace_id = (select id from ids where nombre = 'Aporte Nequi') $$,
  $$ values ('aporte', 'salida', (select id from ids where nombre = 'Nequi')) $$,
  'la salida de Nequi queda enlazada a la entrada de la meta');
select lives_ok($$ select public.aportar_meta((select id from ids where nombre = 'Viaje'), 250000,
  null, (select id from ids where nombre = 'Débito'), true, '2026-11-11') $$,
  'aportar desde Débito con la casilla de presupuesto');
select results_eq(
  $$ select disponible, gastado, aportes_presupuesto from public.disponible_periodo $$,
  $$ values (750000::bigint, 0::bigint, 250000::bigint) $$,
  'el aporte desde Débito baja el disponible sin contar como gasto');
select throws_ok($$ select public.aportar_meta((select id from ids where nombre = 'Viaje'), 1000,
  (select id from ids where nombre = 'Nequi'), null, true) $$,
  'P0001', 'aporte.afecta_desde_bolsa', 'un aporte manual desde bolsa no puede afectar el presupuesto');
select throws_ok($$ select public.aportar_meta((select id from ids where nombre = 'Viaje'), 1000, null, null) $$,
  'P0001', 'aporte.origen_invalido', 'el aporte necesita un origen');
select throws_ok($$ select public.aportar_meta((select id from ids where nombre = 'Viaje'), 0,
  (select id from ids where nombre = 'Nequi'), null) $$,
  'P0001', 'movimiento.valor_invalido', 'un aporte de $0 se rechaza');

-- ---------------------------------------------------------------- retirar
select lives_ok($$ select public.retirar_meta((select id from ids where nombre = 'Viaje'), 100000,
  (select id from ids where nombre = 'Efectivo'), 'Arreglo de la maleta', '2026-11-12') $$,
  'retirar de la meta a Efectivo');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa s join public.metas_ahorro m on m.bolsa_id = s.bolsa_id
              where m.id = (select id from ids where nombre = 'Viaje')),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')),
            (select nota from public.movimientos_bolsa where tipo = 'retiro' and sentido = 'salida') $$,
  $$ values (1000000::bigint, 100000::bigint, 'Arreglo de la maleta') $$,
  'el retiro saca de la meta, entra a Efectivo y guarda el motivo');
select throws_ok($$ select public.retirar_meta((select id from ids where nombre = 'Viaje'), 1000001,
  (select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'meta.saldo_insuficiente', 'no se retira más de lo ahorrado');

-- ---------------------------------------------------------------- pausar y reanudar
select lives_ok($$ select public.pausar_meta((select id from ids where nombre = 'Viaje')) $$, 'pausar la meta');
reset role;
select is(public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-01-15'), 0,
  'con la meta pausada no se generan aportes');
set local role authenticated;
select lives_ok($$ select public.reanudar_meta((select id from ids where nombre = 'Viaje'), '2027-01-15') $$, 'reanudar la meta');
select results_eq(
  $$ select m.pausada, r.proxima_fecha from public.metas_ahorro m join public.reglas_aporte r on r.meta_id = m.id
      where m.id = (select id from ids where nombre = 'Viaje') $$,
  $$ values (false, '2027-02-01'::date) $$,
  'al reanudar, la próxima fecha salta a la primera desde hoy, sin los aportes del tiempo pausado');

-- ---------------------------------------------------------------- editar
select lives_ok($$ select public.editar_meta((select id from ids where nombre = 'Viaje'), 'Viaje a Cartagena', 'plane',
  3000000, '2027-11-30', 300000, 'mensual', 1, (select id from ids where nombre = 'Nequi'), null, false, '2027-01-20') $$,
  'editar nombre y valor del aporte');
select results_eq(
  $$ select b.nombre, r.valor, r.proxima_fecha from public.metas_ahorro m
       join public.bolsas b on b.id = m.bolsa_id join public.reglas_aporte r on r.meta_id = m.id
      where m.id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('Viaje a Cartagena', 300000::bigint, '2027-02-01'::date) $$,
  'el nombre pasa a su bolsa y cambiar solo el valor no mueve la próxima fecha');
select lives_ok($$ select public.editar_meta((select id from ids where nombre = 'Viaje'), 'Viaje a Cartagena', 'plane',
  3000000, '2027-11-30', 300000, 'quincenal', 1, (select id from ids where nombre = 'Nequi'), null, false, '2027-02-05') $$,
  'cambiar la frecuencia a quincenal');
select is((select proxima_fecha from public.reglas_aporte where meta_id = (select id from ids where nombre = 'Viaje')),
  '2027-02-16'::date, 'cambiar la frecuencia recalcula la próxima fecha desde hoy');

-- ---------------------------------------------------------------- eliminar
reset role;
select public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-02-16');
set local role authenticated;
select throws_ok($$ select public.eliminar_meta((select id from ids where nombre = 'Viaje')) $$,
  'P0001', 'meta.destino_requerido', 'una meta con saldo pide a qué bolsa pasa lo ahorrado');
select lives_ok($$ select public.eliminar_meta((select id from ids where nombre = 'Viaje'),
  (select id from ids where nombre = 'Nequi'), '2027-02-20') $$, 'eliminar la meta pasando el saldo a Nequi');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')),
            (select m.eliminada_at is not null and b.archivada from public.metas_ahorro m join public.bolsas b on b.id = m.bolsa_id
              where m.id = (select id from ids where nombre = 'Viaje')),
            (select string_agg(estado, ',') from public.movimientos_bolsa where regla_aporte_id is not null
              and meta_id = (select id from ids where nombre = 'Viaje')),
            (select bool_and(pausada) from public.reglas_aporte where meta_id = (select id from ids where nombre = 'Viaje')),
            (select count(*)::int from public.estado_metas('2027-02-20') where meta_id = (select id from ids where nombre = 'Viaje')) $$,
  $$ values (750000::bigint, true, 'omitido', true, 0) $$,
  'Nequi recibe el saldo; la meta queda eliminada, su bolsa archivada, el pendiente omitido y la regla pausada');

-- ---------------------------------------------------------------- otro usuario
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.aportar_meta((select id from ids where nombre = 'Bici'), 1000,
  (select b.id from public.bolsas b where b.nombre = 'Nequi'), null) $$,
  'P0002', 'meta.no_existe', 'B no puede aportar a una meta de A');

select * from finish();
rollback;
