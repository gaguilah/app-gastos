-- 3.1 Disponible del período, 3.4 saldos de bolsas y ajuste de saldo, 3.15 aportes que afectan
-- el presupuesto. Etapa 3, issue #8 (supuestos 5 a 7). Fechas fijas.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

-- Catálogos y período de A (como superusuario).
insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Mercado prueba', 'shopping-cart', '#b45309', 'gasto'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Salario prueba', 'briefcase', '#047857', 'ingreso');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Nequi prueba', 'bolsa'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Bre-B prueba', 'canal'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Daviplata prueba', 'bolsa'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Efectivo prueba', 'bolsa');
insert into public.bolsas (id, user_id, nombre, forma_pago_id) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Nequi prueba', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Daviplata prueba', '00000000-0000-0000-0002-000000000004'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Efectivo prueba', '00000000-0000-0000-0002-000000000005'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta', null);
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 3000000, '2027-06-30', '00000000-0000-0000-0003-000000000004');
insert into public.periodos (id, user_id, fecha_inicio, fecha_fin) values
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30'),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0000-0000000000a1', '2026-12-01', '2026-12-31');
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2026-11-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2026-12-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Movimientos del criterio 2: recarga a Nequi (en octubre, para ver que el saldo no depende del período),
-- ingreso a Nequi, ingreso a presupuesto, gasto confirmado y gasto pendiente.
insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor)
values ('00000000-0000-0000-0003-000000000001', 'recarga', 'entrada', '2026-10-28', 100000);
insert into public.ingresos (titulo, fecha, valor, categoria_id, bolsa_id, suma_presupuesto) values
  ('A Nequi', '2026-11-05', 50000, '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0003-000000000001', false),
  ('Extra', '2026-11-05', 200000, '00000000-0000-0000-0001-000000000002', null, true);
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id, estado) values
  ('Mercado', '2026-11-06', 300000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000002', 'confirmado'),
  ('Pendiente', '2026-11-07', 100000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000002', 'pendiente');

select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  900000::bigint, 'disponible = salario al presupuesto + ingresos que suman − gastos confirmados (el pendiente no cuenta)');
select results_eq(
  $$ select presupuesto, ingresos_presupuesto, gastado, aportes_presupuesto
       from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001' $$,
  -- Etapa 6A: presupuesto = salario al presupuesto (1.000.000) + ingresos que suman (200.000).
  $$ values (1200000::bigint, 200000::bigint, 300000::bigint, 0::bigint) $$,
  'el desglose del disponible: el ingreso a Nequi no suma al presupuesto');

-- Gasto desde Nequi con canal Bre-B: descuenta de Nequi y del presupuesto.
insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id, canal_id)
values ('Almuerzo', '2026-11-08', 30000, '00000000-0000-0000-0001-000000000001',
        '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000003');
select is((select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000001'),
  120000::bigint, 'saldo de Nequi = recarga + ingreso − gasto con canal Bre-B');
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  870000::bigint, 'el gasto desde la bolsa también descuenta del presupuesto');

-- Gastos que no cuentan en noviembre: no afecta el presupuesto, o es de diciembre.
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id, afecta_presupuesto) values
  ('Por nómina', '2026-11-09', 40000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000002', false);
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('Diciembre', '2026-12-02', 10000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000002');
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  870000::bigint, 'un gasto que no afecta el presupuesto o de otro período no cambia el disponible');
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000002'),
  990000::bigint, 'el gasto de diciembre cuenta en diciembre');

-- Pendiente: no descuenta de la bolsa hasta confirmarse.
insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id, estado)
values ('Pendiente Nequi', '2026-11-10', 5000, '00000000-0000-0000-0001-000000000001',
        '00000000-0000-0000-0003-000000000001', 'pendiente');
select is((select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000001'),
  120000::bigint, 'un gasto pendiente no descuenta de la bolsa');

-- Saldo negativo permitido.
insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor)
values ('00000000-0000-0000-0003-000000000002', 'recarga', 'entrada', '2026-11-01', 10000);
select lives_ok($$
  insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id)
  values ('Taxi', '2026-11-11', 30000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0003-000000000002') $$,
  'se permite un gasto mayor que el saldo de la bolsa');
select is((select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000002'),
  -20000::bigint, 'el saldo puede quedar negativo');

-- Bolsa sin movimientos aparece con saldo 0.
select is((select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000003'),
  0::bigint, 'una bolsa sin movimientos tiene saldo 0');

-- 3.15 Aportes: desde medio directo que afecta / no afecta, y desde una bolsa.
insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, meta_id, medio_id, afecta_presupuesto) values
  ('00000000-0000-0000-0003-000000000004', 'aporte', 'entrada', '2026-11-12', 100000,
   '00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0002-000000000002', true),
  ('00000000-0000-0000-0003-000000000004', 'aporte', 'entrada', '2026-11-12', 70000,
   '00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0002-000000000002', false);
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  740000::bigint, 'solo el aporte desde medio directo con "afecta el presupuesto" baja el disponible');
select is((select aportes_presupuesto from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  100000::bigint, 'el aporte que afecta se muestra aparte, no como gasto');
select is((select gastado from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  360000::bigint, 'el aporte no cuenta como gastado');

insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, meta_id)
values ('00000000-0000-0000-0003-000000000003', 'aporte', 'salida', '2026-11-13', 20000, '00000000-0000-0000-0007-000000000001'),
       ('00000000-0000-0000-0003-000000000004', 'aporte', 'entrada', '2026-11-13', 20000, '00000000-0000-0000-0007-000000000001');
select results_eq(
  $$ select bolsa_id, saldo from public.saldos_bolsa
      where bolsa_id in ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0003-000000000004') order by bolsa_id $$,
  $$ values ('00000000-0000-0000-0003-000000000003'::uuid, -20000::bigint),
            ('00000000-0000-0000-0003-000000000004'::uuid, 190000::bigint) $$,
  'un aporte desde una bolsa sale de ella y entra a la bolsa de la meta');
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  740000::bigint, 'un aporte desde una bolsa no cambia el disponible');

-- 3.4 Ajuste de saldo. Nequi está en 120.000.
select isnt(public.ajustar_saldo('00000000-0000-0000-0003-000000000001', 100000, '2026-11-20', 'Conteo'), null,
  'ajustar a un saldo menor devuelve el gasto creado');
select results_eq(
  $$ select valor, saldo_real, es_ajuste, categoria_nombre, titulo, afecta_presupuesto
       from public.gastos where es_ajuste $$,
  $$ values (20000::bigint, 100000::bigint, true, 'Gasto desconocido', 'Conteo', true) $$,
  'el faltante es un gasto Gasto desconocido con el saldo contado y la nota');
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
  720000::bigint, 'el faltante descuenta del presupuesto');

select lives_ok($$ select public.ajustar_saldo('00000000-0000-0000-0003-000000000001', 150000, '2026-11-21') $$,
  'ajustar a un saldo mayor');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000001'),
            (select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000001'),
            (select count(*)::int from public.movimientos_bolsa where tipo = 'ajuste' and valor = 50000 and saldo_real = 150000) $$,
  $$ values (150000::bigint, 720000::bigint, 1) $$,
  'el sobrante es un movimiento de ajuste de entrada que no cambia el disponible');

select is(public.ajustar_saldo('00000000-0000-0000-0003-000000000001', 150000, '2026-11-22'), null,
  'ajustar al mismo saldo no crea nada');
select throws_ok($$ select public.ajustar_saldo('00000000-0000-0000-0003-000000000001', -1, '2026-11-22') $$,
  'P0001', 'ajuste.saldo_invalido', 'el saldo contado no puede ser negativo');

-- Aislamiento: B no ve saldos ni disponibles de A, ni puede ajustar sus bolsas.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select results_eq(
  $$ select (select count(*)::int from public.saldos_bolsa where user_id = '00000000-0000-0000-0000-0000000000a1'),
            (select count(*)::int from public.disponible_periodo) $$,
  $$ values (0, 0) $$, 'B no ve los saldos ni los disponibles de A');
select throws_ok($$ select public.ajustar_saldo('00000000-0000-0000-0003-000000000001', 0, '2026-11-22') $$,
  'P0002', 'bolsa.no_existe', 'B no puede ajustar una bolsa de A');

select * from finish();
rollback;
