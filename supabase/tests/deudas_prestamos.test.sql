-- 3.8 Deudas (cuotas, pendientes, saldo, estado, afecta presupuesto) y 3.7 estado de préstamos.
-- Etapa 3, issue #8 (supuestos 14 a 17). Fechas fijas.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Tarjeta Visa prueba', 'credit-card', '#4343c8', 'deuda');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio');
insert into public.personas (id, user_id, nombre, tipo) values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Banco Prueba', 'banco'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Ana Prueba', 'persona');
insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto) values
  ('00000000-0000-0000-0000-0000000000a1', '2026-12-01', '2026-12-31', 2000000);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Deudas de A: 3 cuotas que no cuadran, 1 cuota por nómina (no afecta) y día de pago 31.
insert into public.deudas (id, persona_id, categoria_id, fecha, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id, afecta_presupuesto) values
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001',
   '2026-11-20', 1000000, 3, 333333, 5, '00000000-0000-0000-0002-000000000001', true),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001',
   '2026-11-20', 500000, 1, 500000, 20, '00000000-0000-0000-0002-000000000001', false),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001',
   '2027-01-10', 300000, 3, 100000, 31, '00000000-0000-0000-0002-000000000001', true);

select is((select sum(public.generar_plan_cuotas(id))::int from public.deudas), 7,
  'el plan de cuotas de las tres deudas: 3 + 1 + 3 cuotas');
select is((select sum(public.generar_plan_cuotas(id))::int from public.deudas), 0,
  'generar el plan otra vez no duplica cuotas');
select results_eq(
  $$ select numero, fecha, valor from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000001' order by numero $$,
  $$ values (1, '2026-12-05'::date, 333333::bigint), (2, '2027-01-05', 333333), (3, '2027-02-05', 333334) $$,
  'la última cuota lleva la diferencia hasta el total');
select results_eq(
  $$ select numero, fecha, valor from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000002' $$,
  $$ values (1, '2026-12-20'::date, 500000::bigint) $$,
  'si el día de pago coincide con la fecha de la deuda, la primera cuota es al mes siguiente; una cuota lleva el total');
select results_eq(
  $$ select fecha from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000003' order by numero $$,
  $$ values ('2027-01-31'::date), ('2027-02-28'), ('2027-03-31') $$,
  'día de pago 31: último día en meses cortos');
select throws_ok(
  $$ insert into public.deudas (persona_id, categoria_id, fecha, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id)
     values ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', '2026-11-20',
             100000, 3, 60000, 5, '00000000-0000-0000-0002-000000000001') $$,
  'P0001', 'deuda.cuotas_exceden_total', 'las cuotas no pueden sumar más que el total');

-- Pendientes de cuota (los genera el servidor).
reset role;
select is(public.generar_cuotas_de('00000000-0000-0000-0000-0000000000a1', '2026-12-04'), 0,
  'antes del día de pago no hay pendientes');
select is(public.generar_cuotas_de('00000000-0000-0000-0000-0000000000a1', '2026-12-20'), 2,
  'el 20 de diciembre llegan la cuota 1 de la primera deuda y la de nómina');
select is(public.generar_cuotas_de('00000000-0000-0000-0000-0000000000a1', '2026-12-20'), 0,
  'correrla otra vez no duplica');
select results_eq(
  $$ select titulo, fecha, valor, estado, afecta_presupuesto, categoria_nombre, medio_id
       from public.gastos where cuota_id = (select id from public.cuotas_deuda
        where deuda_id = '00000000-0000-0000-0006-000000000001' and numero = 1) $$,
  $$ values ('Banco Prueba', '2026-12-05'::date, 333333::bigint, 'pendiente', true, 'Tarjeta Visa prueba',
             '00000000-0000-0000-0002-000000000001'::uuid) $$,
  'el pendiente de la cuota usa el nombre de la entidad y los datos de la deuda');

set local role authenticated;
select results_eq(
  $$ select saldo, estado, cuotas_pagadas, proxima_cuota, fecha_ultima_cuota
       from public.estado_deudas where deuda_id = '00000000-0000-0000-0006-000000000001' $$,
  $$ values (1000000::bigint, 'activa', 0, '2026-12-05'::date, '2027-02-05'::date) $$,
  'antes de pagar: saldo total, activa, y la fecha estimada de la última cuota');
select is((select disponible from public.disponible_periodo), 2000000::bigint,
  'una cuota pendiente no descuenta del presupuesto');

-- Confirmar: la de nómina no afecta el presupuesto; la otra sí.
select lives_ok($$ select public.confirmar_gasto_pendiente(id) from public.gastos where cuota_id =
  (select id from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000002') $$,
  'confirmar la cuota de nómina');
select is((select disponible from public.disponible_periodo), 2000000::bigint,
  'la cuota de una deuda que no afecta el presupuesto no cambia el disponible');
select results_eq(
  $$ select saldo, estado from public.estado_deudas where deuda_id = '00000000-0000-0000-0006-000000000002' $$,
  $$ values (0::bigint, 'pagada') $$, 'la deuda de una cuota queda pagada');

select lives_ok($$ select public.confirmar_gasto_pendiente(id) from public.gastos where cuota_id =
  (select id from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000001' and numero = 1) $$,
  'confirmar la cuota 1');
select is((select disponible from public.disponible_periodo), 1666667::bigint,
  'solo la cuota pagada en el período descuenta del presupuesto');
select isnt((select pagada_at from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000001' and numero = 1),
  null, 'la cuota queda marcada como pagada');

-- Cuota 2 y abono: saldo y estado.
reset role;
select is(public.generar_cuotas_de('00000000-0000-0000-0000-0000000000a1', '2027-01-05'), 1, 'llega la cuota 2');
set local role authenticated;
do $$ begin
  perform public.confirmar_gasto_pendiente(id) from public.gastos where cuota_id =
    (select id from public.cuotas_deuda where deuda_id = '00000000-0000-0000-0006-000000000001' and numero = 2);
end $$;
select results_eq(
  $$ select saldo, estado, cuotas_pagadas, proxima_cuota from public.estado_deudas where deuda_id = '00000000-0000-0000-0006-000000000001' $$,
  $$ values (333334::bigint, 'activa', 2, '2027-02-05'::date) $$, 'tras dos cuotas el saldo es 333.334');
insert into public.abonos_deuda (deuda_id, fecha, valor)
values ('00000000-0000-0000-0006-000000000001', '2027-01-20', 333334);
select results_eq(
  $$ select saldo, estado from public.estado_deudas where deuda_id = '00000000-0000-0000-0006-000000000001' $$,
  $$ values (0::bigint, 'pagada') $$, 'un abono extraordinario reduce el saldo hasta pagarla');

-- 3.7 Préstamos: Pendiente, Parcial, Pagado y No recuperado.
insert into public.prestamos (id, persona_id, monto, fecha, no_recuperado) values
  ('00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0004-000000000002', 100000, '2026-12-01', false),
  ('00000000-0000-0000-0010-000000000002', '00000000-0000-0000-0004-000000000002', 200000, '2026-12-01', false),
  ('00000000-0000-0000-0010-000000000003', '00000000-0000-0000-0004-000000000002', 50000, '2026-12-01', true),
  ('00000000-0000-0000-0010-000000000004', '00000000-0000-0000-0004-000000000002', 70000, '2026-12-01', false);
insert into public.ingresos (titulo, fecha, valor, categoria_id, prestamo_id, cuenta_estadisticas)
select 'Cobro', '2026-12-10', v, c.id, p, true
  from public.categorias c,
       (values (40000::bigint, '00000000-0000-0000-0010-000000000001'::uuid),
               (150000, '00000000-0000-0000-0010-000000000002'),
               (50000, '00000000-0000-0000-0010-000000000002')) x(v, p)
 where c.clave_sistema = 'cobro_prestamo';
select results_eq(
  $$ select prestamo_id, cobrado, saldo, estado from public.estado_prestamos order by prestamo_id $$,
  $$ values ('00000000-0000-0000-0010-000000000001'::uuid, 40000::bigint, 60000::bigint, 'parcial'),
            ('00000000-0000-0000-0010-000000000002', 200000, 0, 'pagado'),
            ('00000000-0000-0000-0010-000000000003', 0, 50000, 'no_recuperado'),
            ('00000000-0000-0000-0010-000000000004', 0, 70000, 'pendiente') $$,
  'estados derivados de los cobros; no recuperado manda sobre los demás');

-- Aislamiento.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select results_eq(
  $$ select (select count(*)::int from public.estado_deudas), (select count(*)::int from public.estado_prestamos) $$,
  $$ values (0, 0) $$, 'B no ve el estado de las deudas ni de los préstamos de A');
select throws_ok($$ select public.generar_cuotas_de('00000000-0000-0000-0000-0000000000a1', '2027-03-01') $$,
  '42501', null, 'la generación de cuotas no se puede llamar por la API');

select * from finish();
rollback;
