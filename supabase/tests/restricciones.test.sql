-- Restricciones de valores y de forma: 3.1 (períodos y día de inicio), 3.2 (umbrales),
-- 3.3 (origen del gasto), 3.4 (registro de ajustes), 3.8 (tarjetas), 3.11 (subcategorías y colores),
-- 3.15 (aportes que afectan el presupuesto) y montos. Etapa 2, issue #7.
begin;
select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

-- Datos de A (como superusuario, sin RLS). Un solo lives_ok para todo el montaje.
select lives_ok($$
  insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Mercado prueba', 'shopping-cart', '#b45309', 'gasto'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Deuda prueba', 'landmark', '#4343c8', 'deuda');
  insert into public.formas_pago (id, user_id, nombre, clase) values
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa prueba', 'bolsa'),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Medio prueba', 'medio');
  insert into public.bolsas (id, user_id, nombre, forma_pago_id) values
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa prueba', '00000000-0000-0000-0002-000000000001'),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta', null);
  insert into public.personas (id, user_id, nombre, tipo) values
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Banco Prueba', 'banco');
  insert into public.reglas_periodicas (id, user_id, titulo, valor, categoria_id, bolsa_id, frecuencia, intervalo, dia, fecha_inicio, proxima_fecha) values
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Arriendo', 900000,
     '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0003-000000000001', 'mensual', 1, 31, '2026-01-31', '2026-03-31');
  insert into public.deudas (id, user_id, persona_id, categoria_id, valor_recibido, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id) values
    ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0004-000000000001',
     '00000000-0000-0000-0001-000000000002', 1000000, 1200000, 12, 100000, 5, '00000000-0000-0000-0002-000000000002');
  insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
    ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 3000000, '2027-06-30', '00000000-0000-0000-0003-000000000002');
  insert into public.reglas_aporte (id, user_id, meta_id, valor, frecuencia, dia, bolsa_id, proxima_fecha) values
    ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000001',
     200000, 'mensual', 15, '00000000-0000-0000-0003-000000000001', '2026-03-15');
  insert into public.periodos (id, user_id, fecha_inicio, fecha_fin, presupuesto) values
    ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-03-01', '2026-03-31', 2000000);
$$, 'montaje: catálogos, regla periódica, deuda, meta, regla de aporte y período de A');

-- 3.1 Períodos
select throws_ok(
  $$ insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
     values ('00000000-0000-0000-0000-0000000000a1', '2026-03-15', '2026-04-14', 2000000) $$,
  '23P01', null, 'dos períodos de A no se pueden solapar');
select lives_ok(
  $$ insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
     values ('00000000-0000-0000-0000-0000000000b2', '2026-03-15', '2026-04-14', 2000000) $$,
  'B sí puede tener un período en esas fechas');
select throws_ok(
  $$ insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto)
     values ('00000000-0000-0000-0000-0000000000a1', '2026-05-31', '2026-05-01', 2000000) $$,
  '23514', null, 'el fin de un período no puede ser anterior a su inicio');

-- 3.1 Día de inicio del período (perfil creado por los datos de arranque)
select throws_ok(
  $$ update public.perfiles set dia_inicio = 0 where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'el día de inicio no puede ser 0');
select throws_ok(
  $$ update public.perfiles set dia_inicio = 32 where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'el día de inicio no puede ser 32');
select results_eq(
  $$ update public.perfiles set dia_inicio = 31 where user_id = '00000000-0000-0000-0000-0000000000a1' returning dia_inicio $$,
  $$ values (31::smallint) $$, 'el día de inicio puede ser 31');

-- 3.2 Umbrales
select throws_ok(
  $$ insert into public.alertas_enviadas (user_id, periodo_id, umbral)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0009-000000000001', 72) $$,
  '23514', null, '72 no es un umbral de alerta');
select lives_ok(
  $$ insert into public.alertas_enviadas (user_id, periodo_id, umbral)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0009-000000000001', 101) $$,
  '101 (superó el presupuesto) sí es un umbral');

-- 3.3 Origen del gasto y montos
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, medio_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Doble', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000002') $$,
  '23514', null, 'un gasto no puede tener bolsa y medio a la vez');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Sin origen', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000001') $$,
  '23514', null, 'un gasto sin origen se rechaza');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Negativo', '2026-03-02', -1, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0003-000000000001') $$,
  '23514', null, 'un monto negativo se rechaza');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, medio_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Medio que es bolsa', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0002-000000000001') $$,
  '23514', null, 'el medio directo de un gasto debe ser de clase medio');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, canal_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Canal que es medio', '2026-03-02', 1000, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000002') $$,
  '23514', null, 'el canal de un gasto debe ser de clase canal');

-- 3.4 Registro de ajustes (decisión de Giovanni del 18-nov-2026)
select lives_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, saldo_real)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000001', 'ajuste', 'entrada', '2026-03-03', 5000, 40000) $$,
  'un ajuste hacia arriba guarda el saldo contado');
select throws_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000001', 'ajuste', 'entrada', '2026-03-03', 5000) $$,
  '23514', null, 'un ajuste sin saldo contado se rechaza');
select throws_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, saldo_real)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000001', 'recarga', 'entrada', '2026-03-03', 50000, 90000) $$,
  '23514', null, 'una recarga no lleva saldo contado');
select lives_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, es_ajuste, saldo_real)
     values ('00000000-0000-0000-0000-0000000000a1', 'Ajuste de saldo', '2026-03-03', 3000, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0003-000000000001', true, 30000) $$,
  'un ajuste hacia abajo es un gasto con el saldo contado');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, es_ajuste)
     values ('00000000-0000-0000-0000-0000000000a1', 'Ajuste sin saldo', '2026-03-03', 3000, '00000000-0000-0000-0001-000000000001',
             '00000000-0000-0000-0003-000000000001', true) $$,
  '23514', null, 'un gasto de ajuste sin saldo contado se rechaza');

-- 3.8 Tarjetas: nunca números de tarjeta
select throws_ok(
  $$ insert into public.personas (user_id, nombre, tipo)
     values ('00000000-0000-0000-0000-0000000000a1', 'Visa 4111 1111 1111 1111', 'tarjeta') $$,
  '23514', null, 'un nombre con un número de tarjeta se rechaza');
select lives_ok(
  $$ insert into public.personas (user_id, nombre, tipo)
     values ('00000000-0000-0000-0000-0000000000a1', 'Visa Banco X', 'tarjeta') $$,
  'un nombre descriptivo de tarjeta se guarda');
select is_empty(
  $$ select table_name, column_name from information_schema.columns
      where table_schema = 'public'
        and column_name ~* '^(numero_tarjeta|tarjeta_numero|pan|cvv|cvc|ccv|vencimiento|fecha_vencimiento|expira)$' $$,
  'ninguna tabla tiene columnas para número, vencimiento ni código de tarjeta');

-- 3.11 Categorías
select throws_ok(
  $$ insert into public.categorias (user_id, nombre, tipo, padre_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Sub de ingreso', 'ingreso', '00000000-0000-0000-0001-000000000001') $$,
  '23514', null, 'una subcategoría debe tener el tipo de su padre');
select lives_ok(
  $$ insert into public.categorias (id, user_id, nombre, tipo, padre_id)
     values ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Frutas', 'gasto', '00000000-0000-0000-0001-000000000001') $$,
  'una subcategoría del mismo tipo se guarda');
select throws_ok(
  $$ insert into public.categorias (user_id, nombre, tipo, padre_id)
     values ('00000000-0000-0000-0000-0000000000a1', 'Nieta', 'gasto', '00000000-0000-0000-0001-000000000003') $$,
  '23514', null, 'las subcategorías tienen un solo nivel');
select throws_ok(
  $$ insert into public.categorias (user_id, nombre, icono, color, tipo)
     values ('00000000-0000-0000-0000-0000000000a1', 'Color raro', 'tag', 'rojo', 'gasto') $$,
  '23514', null, 'el color debe ser #rrggbb');

-- 3.15 Aportes que afectan el presupuesto (decisión de Giovanni del 18-nov-2026)
select lives_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, medio_id, afecta_presupuesto)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000002', 'aporte', 'entrada', '2026-03-10', 100000,
             '00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0002-000000000002', true) $$,
  'un aporte desde un medio directo puede afectar el presupuesto');
select throws_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, afecta_presupuesto)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000002', 'aporte', 'entrada', '2026-03-10', 100000,
             '00000000-0000-0000-0007-000000000001', true) $$,
  '23514', null, 'un aporte sin medio directo no puede afectar el presupuesto');

select * from finish();
rollback;
