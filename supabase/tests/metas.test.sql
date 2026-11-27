-- 3.15 Ahorros: aportes periódicos pendientes, confirmar (solo esta vez o en adelante), omitir,
-- aportes desde bolsa o medio directo, y estados derivados de la meta con aporte sugerido y proyección.
-- Etapa 3, issue #8 (supuestos 14 y 18). Fechas fijas.
begin;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Nequi prueba', 'bolsa');
insert into public.bolsas (id, user_id, nombre, forma_pago_id) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Nequi prueba', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0000-0000000000a1', 'Meta 1', null),
  ('00000000-0000-0000-0003-000000000012', '00000000-0000-0000-0000-0000000000a1', 'Meta 2', null),
  ('00000000-0000-0000-0003-000000000014', '00000000-0000-0000-0000-0000000000a1', 'Meta 4', null),
  ('00000000-0000-0000-0003-000000000015', '00000000-0000-0000-0000-0000000000a1', 'Meta 5', null);
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id, created_at) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 1200000, '2027-12-31',
   '00000000-0000-0000-0003-000000000011', '2027-01-01 12:00-05'),
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Portátil', 300000, '2027-06-30',
   '00000000-0000-0000-0003-000000000012', '2027-01-01 12:00-05'),
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Bicicleta', 500000, '2027-12-31',
   '00000000-0000-0000-0003-000000000014', '2027-01-01 12:00-05'),
  ('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Emergencias', 1000000, '2027-12-31',
   '00000000-0000-0000-0003-000000000015', '2027-01-01 12:00-05');
-- Mensual el 31 desde Nequi (no afecta), y quincenal el 15 desde Débito que sí afecta el presupuesto.
insert into public.reglas_aporte (id, user_id, meta_id, valor, frecuencia, dia, bolsa_id, medio_id, afecta_presupuesto, proxima_fecha) values
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000001',
   100000, 'mensual', 31, '00000000-0000-0000-0003-000000000001', null, false, '2027-01-31'),
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000002',
   50000, 'quincenal', 15, null, '00000000-0000-0000-0002-000000000001', true, '2027-01-15');
-- Saldos iniciales y un aporte manual.
insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000014', 'saldo_inicial', 'entrada', '2027-01-01', 500000, '00000000-0000-0000-0007-000000000004'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000015', 'saldo_inicial', 'entrada', '2027-01-01', 600000, '00000000-0000-0000-0007-000000000005'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000015', 'aporte', 'entrada', '2027-02-01', 200000, '00000000-0000-0000-0007-000000000005');
insert into public.periodos (user_id, fecha_inicio, fecha_fin) values
  ('00000000-0000-0000-0000-0000000000a1', '2027-01-01', '2027-01-31');
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2027-01-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;

-- Generación (servidor).
select is(public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-03-31'), 9,
  'genera los aportes pendientes hasta hoy: 3 mensuales y 6 quincenales');
select results_eq(
  $$ select fecha, valor, estado, bolsa_id, meta_id, medio_id, afecta_presupuesto from public.movimientos_bolsa
      where regla_aporte_id = '00000000-0000-0000-0008-000000000001' order by fecha $$,
  $$ values ('2027-01-31'::date, 100000::bigint, 'pendiente', '00000000-0000-0000-0003-000000000011'::uuid,
             '00000000-0000-0000-0007-000000000001'::uuid, null::uuid, false),
            ('2027-02-28', 100000, 'pendiente', '00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0007-000000000001', null, false),
            ('2027-03-31', 100000, 'pendiente', '00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0007-000000000001', null, false) $$,
  'mensual el 31: pendientes a la bolsa de la meta, con el ajuste de febrero');
select results_eq(
  $$ select fecha from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' order by fecha $$,
  $$ values ('2027-01-15'::date), ('2027-01-30'), ('2027-02-15'), ('2027-02-28'), ('2027-03-15'), ('2027-03-30') $$,
  'quincenal el 15: 15 y 30, en febrero 15 y 28');
select is(public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-03-31'), 0, 'correrla otra vez no duplica');
select is((select proxima_fecha from public.reglas_aporte where id = '00000000-0000-0000-0008-000000000001'),
  '2027-04-30'::date, 'la próxima fecha de la regla avanza');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000011'), 0::bigint,
  'un aporte pendiente no suma a la meta');

-- Confirmar desde una bolsa: sale de Nequi y entra a la meta; no toca el presupuesto.
select results_eq(
  $$ select estado, valor from public.confirmar_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000001' and fecha = '2027-01-31')) $$,
  $$ values ('confirmado', 100000::bigint) $$, 'confirmar el aporte desde Nequi');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000011'),
            (select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000001'),
            (select disponible from public.disponible_periodo) $$,
  $$ values (100000::bigint, -100000::bigint, 1000000::bigint) $$,
  'el aporte desde una bolsa pasa el dinero a la meta sin bajar el disponible');

-- Confirmar desde medio directo que afecta, con valor nuevo en adelante.
select results_eq(
  $$ select estado, valor from public.confirmar_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-01-15'),
       60000, true) $$,
  $$ values ('confirmado', 60000::bigint) $$, 'confirmar con valor ajustado en adelante');
select is((select valor from public.reglas_aporte where id = '00000000-0000-0000-0008-000000000002'), 60000::bigint,
  '"en adelante" cambia el valor de la regla');
select is((select valor from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-01-30'),
  50000::bigint, 'los pendientes ya generados conservan su valor');
select is((select disponible from public.disponible_periodo), 940000::bigint,
  'el aporte desde medio directo con "afecta el presupuesto" baja el disponible');
select throws_ok(
  $$ select public.confirmar_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-01-15')) $$,
  'P0001', 'pendiente.ya_confirmado', 'un aporte confirmado no se confirma otra vez');

-- Confirmar solo esta vez no cambia la regla.
select lives_ok(
  $$ select public.confirmar_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000001' and fecha = '2027-02-28'), 150000) $$,
  'confirmar con otro valor solo esta vez');
select is((select valor from public.reglas_aporte where id = '00000000-0000-0000-0008-000000000001'), 100000::bigint,
  'sin "en adelante" la regla conserva su valor');

-- Omitir.
select results_eq(
  $$ select estado from public.omitir_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-01-30')) $$,
  $$ values ('omitido') $$, 'omitir un aporte pendiente');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000012'),
            (select disponible from public.disponible_periodo) $$,
  $$ values (60000::bigint, 940000::bigint) $$, 'un aporte omitido no mueve dinero');
select throws_ok(
  $$ select public.omitir_aporte(
       (select id from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-01-30')) $$,
  'P0001', 'pendiente.ya_confirmado', 'un aporte omitido no se puede omitir otra vez');

-- Meta pausada: no genera aportes; la otra sigue, con el valor nuevo.
update public.metas_ahorro set pausada = true where id = '00000000-0000-0000-0007-000000000001';
reset role;
select is(public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-04-30'), 2,
  'una meta pausada no genera; la quincenal genera el 15 y el 30 de abril');
select is((select valor from public.movimientos_bolsa where regla_aporte_id = '00000000-0000-0000-0008-000000000002' and fecha = '2027-04-15'),
  60000::bigint, 'los aportes nuevos usan el valor "en adelante"');

-- Estados al 30 de abril de 2027.
set local role authenticated;
select results_eq(
  $$ select meta_id, saldo, estado from public.estado_metas('2027-04-30') order by meta_id $$,
  $$ values ('00000000-0000-0000-0007-000000000001'::uuid, 250000::bigint, 'pausada'),
            ('00000000-0000-0000-0007-000000000002', 60000, 'atrasada'),
            ('00000000-0000-0000-0007-000000000004', 500000, 'cumplida'),
            ('00000000-0000-0000-0007-000000000005', 800000, 'al_dia') $$,
  'estados derivados: pausada, atrasada, cumplida y al día');
select results_eq(
  $$ select aportes_restantes, aporte_sugerido from public.estado_metas('2027-04-30')
      where meta_id = '00000000-0000-0000-0007-000000000002' $$,
  $$ values (4, 60000::bigint) $$,
  'aporte sugerido = lo que falta ÷ aportes que quedan hasta la fecha final (15 y 30 de mayo y junio)');
select is((select fecha_proyectada from public.estado_metas('2027-04-30') where meta_id = '00000000-0000-0000-0007-000000000005'),
  '2027-08-27'::date, 'proyección al ritmo promedio de aportes desde la creación');

-- Aislamiento.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is_empty($$ select * from public.estado_metas('2027-04-30') $$, 'B no ve las metas de A');
select throws_ok(
  $$ select public.generar_aportes_de('00000000-0000-0000-0000-0000000000a1', '2027-05-31') $$,
  '42501', null, 'la generación de aportes no se puede llamar por la API');

select * from finish();
rollback;
