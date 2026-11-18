-- Restricciones que impiden duplicados: 3.9 (lugares y personas), 3.6 (periódicos),
-- 3.8 (cuotas), 3.15 (aportes periódicos) y 3.2 (alertas). Etapa 2, issue #7.
begin;
select plan(16);

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

-- 3.9 Lugares
select lives_ok(
  $$ insert into public.lugares (user_id, nombre) values ('00000000-0000-0000-0000-0000000000a1', 'Exito') $$,
  'A crea el lugar "Exito"');
select throws_ok(
  $$ insert into public.lugares (user_id, nombre) values ('00000000-0000-0000-0000-0000000000a1', 'éxito') $$,
  '23505', null, '"éxito" es el mismo lugar que "Exito"');
select throws_ok(
  $$ insert into public.lugares (user_id, nombre) values ('00000000-0000-0000-0000-0000000000a1', ' EXITO ') $$,
  '23505', null, '" EXITO " es el mismo lugar que "Exito"');
select lives_ok(
  $$ insert into public.lugares (user_id, nombre) values ('00000000-0000-0000-0000-0000000000b2', 'Exito') $$,
  'B puede tener su propio "Exito"');

-- 3.9 Personas
select lives_ok(
  $$ insert into public.personas (user_id, nombre, tipo) values ('00000000-0000-0000-0000-0000000000a1', 'Juan Pérez', 'persona') $$,
  'A crea la persona "Juan Pérez"');
select throws_ok(
  $$ insert into public.personas (user_id, nombre, tipo) values ('00000000-0000-0000-0000-0000000000a1', 'juan  perez', 'persona') $$,
  '23505', null, '"juan  perez" es la misma persona que "Juan Pérez"');

-- 3.6 Un gasto por regla periódica y fecha
select lives_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, estado, regla_id, fecha_programada)
     values ('00000000-0000-0000-0000-0000000000a1', 'Arriendo', '2026-03-31', 900000,
             '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0003-000000000001', 'pendiente',
             '00000000-0000-0000-0005-000000000001', '2026-03-31') $$,
  'la regla R genera su gasto del 2026-03-31');
select throws_ok(
  $$ insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, estado, regla_id, fecha_programada)
     values ('00000000-0000-0000-0000-0000000000a1', 'Arriendo', '2026-03-31', 900000,
             '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0003-000000000001', 'pendiente',
             '00000000-0000-0000-0005-000000000001', '2026-03-31') $$,
  '23505', null, 'la regla R no genera dos gastos para la misma fecha');

-- 3.8 Una cuota por número en cada deuda
select lives_ok(
  $$ insert into public.cuotas_deuda (user_id, deuda_id, numero, fecha, valor)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0006-000000000001', 3, '2026-03-05', 100000) $$,
  'la deuda D tiene su cuota nº 3');
select throws_ok(
  $$ insert into public.cuotas_deuda (user_id, deuda_id, numero, fecha, valor)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0006-000000000001', 3, '2026-04-05', 100000) $$,
  '23505', null, 'la deuda D no puede tener dos cuotas nº 3');

-- 3.15 Un aporte por regla de aporte y fecha
select lives_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, estado, regla_aporte_id, fecha_programada)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000002', 'aporte', 'entrada', '2026-03-15', 200000,
             '00000000-0000-0000-0007-000000000001', 'pendiente', '00000000-0000-0000-0008-000000000001', '2026-03-15') $$,
  'la regla de aporte genera su aporte del 2026-03-15');
select throws_ok(
  $$ insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor, meta_id, estado, regla_aporte_id, fecha_programada)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0003-000000000002', 'aporte', 'entrada', '2026-03-15', 200000,
             '00000000-0000-0000-0007-000000000001', 'pendiente', '00000000-0000-0000-0008-000000000001', '2026-03-15') $$,
  '23505', null, 'la regla de aporte no genera dos aportes para la misma fecha');

-- 3.2 Una alerta por umbral y período
select lives_ok(
  $$ insert into public.alertas_enviadas (user_id, periodo_id, umbral)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0009-000000000001', 70) $$,
  'se registra la alerta del 70 %');
select throws_ok(
  $$ insert into public.alertas_enviadas (user_id, periodo_id, umbral)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0009-000000000001', 70) $$,
  '23505', null, 'la alerta del 70 % no se repite en el mismo período');

-- Guardia del conteo: la tabla de lugares de A tiene exactamente un "exito".
select results_eq(
  $$ select count(*)::int from public.lugares
      where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre_normalizado = 'exito' $$,
  $$ values (1) $$, 'A tiene un solo lugar "exito"');

select * from finish();
rollback;
