-- 3.2 Alertas de presupuesto: umbrales 70 a 100 cada 5 % y "superado" (101), una vez por período.
-- Etapa 3, issue #8 (supuesto 8). Porcentaje = (base − disponible) × 100 ÷ base, en enteros,
-- con base = presupuesto (parte del salario + ingresos que suman, Etapa 6A). Fechas fijas.
begin;
select plan(13);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.categorias (id, user_id, nombre, icono, color, tipo) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Mercado prueba', 'shopping-cart', '#b45309', 'gasto'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Salario prueba', 'briefcase', '#047857', 'ingreso');
insert into public.formas_pago (id, user_id, nombre, clase) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito prueba', 'medio');
insert into public.bolsas (id, user_id, nombre) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta');
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 3000000, '2027-12-31', '00000000-0000-0000-0003-000000000001');
insert into public.periodos (id, user_id, fecha_inicio, fecha_fin) values
  ('00000000-0000-0000-0009-000000000011', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30'),
  ('00000000-0000-0000-0009-000000000012', '00000000-0000-0000-0000-0000000000a1', '2026-12-01', '2026-12-31'),
  ('00000000-0000-0000-0009-000000000013', '00000000-0000-0000-0000-0000000000a1', '2027-01-01', '2027-01-31'),
  ('00000000-0000-0000-0009-000000000014', '00000000-0000-0000-0000-0000000000a1', '2027-02-01', '2027-02-28'),
  ('00000000-0000-0000-0009-000000000015', '00000000-0000-0000-0000-0000000000a1', '2027-03-01', '2027-03-31'),
  ('00000000-0000-0000-0009-000000000016', '00000000-0000-0000-0000-0000000000a1', '2027-04-01', '2027-04-30'),
  ('00000000-0000-0000-0009-000000000017', '00000000-0000-0000-0000-0000000000a1', '2027-05-01', '2027-05-31');
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2026-11-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2026-12-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2027-02-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2027-03-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2027-04-01', 2000000, c.id, true, 2000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2027-05-01', 1000000, c.id, true, 1000000 from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.tipo = 'ingreso' and c.padre_id is null order by c.created_at limit 1;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

create temporary view umbrales as
select periodo_id, array_agg(umbral order by umbral) as u from public.alertas_enviadas group by periodo_id;

-- Noviembre: 69 % no avisa; 70 % justo sí.
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id)
values ('G', '2026-11-05', 690000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000011'), null, 'al 69 % no hay alerta');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id)
values ('G', '2026-11-06', 10000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000011'), '{70}'::smallint[], 'al 70 % justo se avisa el 70');

-- Diciembre: salto de 60 % a 86 %, sin repetir, 100 y superado.
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2026-12-02', 600000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2026-12-03', 260000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000012'), '{70,75,80,85}'::smallint[],
  'un salto de 60 % a 86 % registra todos los umbrales cruzados');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2026-12-04', 20000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000012'), '{70,75,80,85}'::smallint[],
  'otro gasto en el mismo rango (88 %) no repite avisos');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2026-12-05', 120000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000012'), '{70,75,80,85,90,95,100}'::smallint[],
  'al 100 % justo se avisa el 100, todavía no superado');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2026-12-06', 1, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000012'), '{70,75,80,85,90,95,100,101}'::smallint[],
  'un peso más que el presupuesto es "superado" (101)');

-- Enero: presupuesto 0, sin error ni avisos.
select lives_ok($$ insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id)
  values ('G', '2027-01-05', 50000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001') $$,
  'con presupuesto 0 registrar un gasto no falla');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000013'), null, 'y no se avisa');

-- Febrero: un pendiente no avisa hasta confirmarse.
insert into public.gastos (id, titulo, fecha, valor, categoria_id, medio_id, estado) values
  ('00000000-0000-0000-0011-000000000001', 'G', '2027-02-05', 900000, '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0002-000000000001', 'pendiente');
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000014'), null, 'un pendiente al 90 % no avisa');
do $$ begin perform public.confirmar_gasto_pendiente('00000000-0000-0000-0011-000000000001'); end $$;
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000014'), '{70,75,80,85,90}'::smallint[],
  'al confirmarlo se avisan los umbrales');

-- Marzo: un ingreso a presupuesto baja el porcentaje y borrar el gasto no borra avisos.
insert into public.gastos (id, titulo, fecha, valor, categoria_id, medio_id) values
  ('00000000-0000-0000-0011-000000000002', 'G', '2027-03-05', 800000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
insert into public.ingresos (titulo, fecha, valor, categoria_id, suma_presupuesto)
values ('Extra', '2027-03-10', 500000, '00000000-0000-0000-0001-000000000002', true);
delete from public.gastos where id = '00000000-0000-0000-0011-000000000002';
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000015'), '{70,75,80}'::smallint[],
  'un umbral avisado se queda aunque baje el porcentaje o se borre el gasto');

-- Abril: bajar la parte del salario para el presupuesto también evalúa.
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('G', '2027-04-05', 1500000, '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001');
update public.ingresos set monto_presupuesto = 1600000 where es_salario and fecha = '2027-04-01';
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000016'), '{70,75,80,85,90}'::smallint[],
  'bajar el presupuesto de 2.000.000 a 1.600.000 con 1.500.000 gastado avisa hasta el 90');

-- Mayo: un aporte desde medio directo que afecta el presupuesto cuenta para las alertas.
insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, meta_id, medio_id, afecta_presupuesto)
values ('00000000-0000-0000-0003-000000000001', 'aporte', 'entrada', '2027-05-05', 700000,
        '00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0002-000000000001', true);
select is((select u from umbrales where periodo_id = '00000000-0000-0000-0009-000000000017'), '{70}'::smallint[],
  'un aporte que afecta el presupuesto cuenta para las alertas');

select * from finish();
rollback;
