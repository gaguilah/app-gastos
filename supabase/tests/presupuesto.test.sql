-- 3.1 Presupuesto y período: vista previa del cambio de día de inicio (Etapa 6, issue #11),
-- salario base y salario del período (Etapa 6A, issue #30: el presupuesto por defecto y el ajuste
-- manual se quitaron); 3.2 alertas al borrar un ingreso o bajar la parte del salario. Fechas fijas.
begin;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.periodos (id, user_id, fecha_inicio, fecha_fin, cerrado_at) values
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-10-01', '2026-10-31', now()),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30', null),
  ('00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0000-0000000000b2', '2027-01-01', '2027-01-31', null);
insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
select c.user_id, 'Salario', p.fecha, 1000000, c.id, true, 1000000
  from public.categorias c
  join (values ('00000000-0000-0000-0000-0000000000a1'::uuid, '2026-10-01'::date),
               ('00000000-0000-0000-0000-0000000000b2'::uuid, '2027-01-01'::date)) p (u, fecha) on p.u = c.user_id
 where c.nombre = 'Salario';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- vista previa del día de inicio
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(15, '2026-11-26') $$,
  $$ values (1, '2026-11-01'::date, '2026-11-30'::date),
            (2, '2026-12-01', '2026-12-14'),
            (3, '2026-12-15', '2027-01-14') $$,
  'día 15: el actual no cambia, luego una transición del 1 al 14 y después del 15 al 14');
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(1, '2026-11-26') $$,
  $$ values (1, '2026-11-01'::date, '2026-11-30'::date),
            (2, '2026-12-01', '2026-12-31'),
            (3, '2027-01-01', '2027-01-31') $$,
  'el mismo día de inicio no tiene transición');
select throws_ok($$ select * from public.vista_previa_periodos(32, '2026-11-26') $$, 'P0001', 'periodo.dia_invalido',
  'un día de inicio fuera de 1 a 31 se rechaza');

-- La vista previa coincide con lo que crea la base de datos al cambiar el día.
update public.perfiles set dia_inicio = 15;
reset role;
select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-01-20');
select results_eq(
  $$ select fecha_inicio, fecha_fin from public.periodos
      where user_id = '00000000-0000-0000-0000-0000000000a1' and fecha_inicio > '2026-11-01' order by fecha_inicio $$,
  $$ values ('2026-12-01'::date, '2026-12-14'::date), ('2026-12-15', '2027-01-14'), ('2027-01-15', '2027-02-14') $$,
  'los períodos creados son los de la vista previa');
delete from public.periodos where user_id = '00000000-0000-0000-0000-0000000000a1' and fecha_inicio > '2026-11-01';
set local role authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select results_eq(
  $$ select orden, fecha_inicio, fecha_fin from public.vista_previa_periodos(31, '2027-01-20') $$,
  $$ values (1, '2027-01-01'::date, '2027-01-31'::date),
            (2, '2027-02-01', '2027-02-27'),
            (3, '2027-02-28', '2027-03-30') $$,
  'día 31: en febrero el período empieza el último día del mes');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- salario base (decisión 2, S1)
create temp table ids (nombre text primary key, id uuid);
grant all on ids to authenticated;

select lives_ok($$ select public.configurar_salario(4000000, 3000000, null, false, '2026-11-26') $$,
  'configurar el salario base');
select results_eq(
  $$ select (select salario_base from public.perfiles), (select presupuesto_salario_base from public.perfiles),
            (select count(*)::int from public.ingresos where es_salario and fecha >= '2026-11-01') $$,
  $$ values (4000000::bigint, 3000000::bigint, 0) $$,
  'sin la casilla, el período en curso no recibe salario');
select lives_ok($$ select public.configurar_salario(4000000, 3000000, null, true, '2026-11-26') $$,
  'configurar el salario base y usarlo en el período en curso');
select results_eq(
  $$ select valor, monto_presupuesto, fecha, categoria_nombre, bolsa_id from public.ingresos
      where es_salario and fecha >= '2026-11-01' $$,
  $$ values (4000000::bigint, 3000000::bigint, '2026-11-01'::date, 'Salario'::text, null::uuid) $$,
  'con la casilla se crea el salario del período en curso, el primer día, con la categoría Salario y sin bolsa');
select is((select presupuesto from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000002'),
  3000000::bigint, 'el presupuesto del período es la parte del salario para el presupuesto');
insert into ids select 'salario_nov', id from public.ingresos where es_salario and fecha = '2026-11-01';

select lives_ok($$ select public.configurar_salario(4200000, 3100000, null, true, '2026-11-26') $$,
  'volver a configurarlo con la casilla');
select results_eq(
  $$ select valor, monto_presupuesto from public.ingresos where es_salario order by fecha $$,
  $$ values (1000000::bigint, 1000000::bigint), (4200000, 3100000) $$,
  'actualiza el salario del período en curso sin duplicarlo, y el cerrado no cambia');
select throws_ok($$ select public.configurar_salario(1000000, 1000001) $$, 'P0001', 'salario.monto_invalido',
  'la parte para el presupuesto no puede pasar del salario');
select throws_ok($$ select public.configurar_salario(1000000, 500000, (select id from public.categorias where nombre = 'Hogar')) $$,
  'P0002', 'categoria.no_existe', 'la categoría del salario debe ser de ingreso');
select lives_ok($$ select public.configurar_salario(4200000, 3100000, (select id from public.categorias where nombre = 'Extra')) $$,
  'se puede elegir otra categoría de ingreso');
select is((select c.nombre from public.perfiles p join public.categorias c on c.id = p.categoria_salario_id),
  'Extra', 'y queda guardada para los períodos siguientes');

-- ---------------------------------------------------------------- salario de un período (decisión 2)
select lives_ok($$ select public.editar_salario((select id from ids where nombre = 'salario_nov'), 4500000, 3500000) $$,
  'cambiar el salario solo en este período');
select results_eq(
  $$ select (select valor from public.ingresos where id = (select id from ids where nombre = 'salario_nov')),
            (select salario_base from public.perfiles) $$,
  $$ values (4500000::bigint, 4200000::bigint) $$, '«Solo este período» no cambia el salario base');
select lives_ok($$ select public.editar_salario((select id from ids where nombre = 'salario_nov'), 4500000, 3500000, true) $$,
  'cambiar el salario desde ahora');
select results_eq(
  $$ select salario_base, presupuesto_salario_base from public.perfiles $$,
  $$ values (4500000::bigint, 3500000::bigint) $$, '«Desde ahora» cambia el salario base');
select throws_ok($$ select public.editar_salario((select id from ids where nombre = 'salario_nov'), 4500000, 4500001) $$,
  'P0001', 'salario.monto_invalido', 'al editar, la parte para el presupuesto no puede pasar del salario');
select throws_ok($$ select public.editar_salario(gen_random_uuid(), 1000, 0) $$,
  'P0002', 'ingreso.no_existe', 'no se edita un salario que no existe o es de otro usuario');

-- ---------------------------------------------------------------- reglas del salario en la tabla
select throws_ok($$ insert into public.ingresos (titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
  select 'Otro', '2026-11-20', 100000, id, true, 0 from public.categorias where nombre = 'Salario' $$,
  'P0001', 'salario.duplicado', 'un solo salario por período (S2)');
select throws_ok($$ insert into public.ingresos (titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto, bolsa_id)
  select 'Otro', '2026-12-05', 100000, c.id, true, 0, b.id
    from public.categorias c, public.bolsas b where c.nombre = 'Salario' and b.nombre = 'Nequi' $$,
  'P0001', 'salario.con_bolsa', 'el salario no va a ninguna bolsa');
select throws_ok($$ insert into public.ingresos (titulo, fecha, valor, categoria_id, monto_presupuesto)
  select 'Extra', '2026-11-20', 100000, id, 50000 from public.categorias where nombre = 'Extra' $$,
  '23514', null, 'solo el salario tiene parte para el presupuesto');

-- ---------------------------------------------------------------- alertas al quitar presupuesto
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
insert into public.ingresos (id, titulo, fecha, valor, categoria_id, categoria_nombre, suma_presupuesto)
select '00000000-0000-0000-0010-000000000001', 'Prima', '2027-01-05', 200000, id, '', true
  from public.categorias where nombre = 'Extra';
insert into public.gastos (titulo, fecha, valor, categoria_id, categoria_nombre, medio_id)
select 'Arriendo', '2027-01-06', 750000, c.id, '', f.id
  from public.categorias c, public.formas_pago f where c.nombre = 'Hogar' and f.nombre = 'Débito';
delete from public.ingresos where id = '00000000-0000-0000-0010-000000000001';
select results_eq(
  $$ select umbral from public.alertas_enviadas order by umbral $$,
  $$ values (70::smallint), (75::smallint) $$,
  'borrar un ingreso que suma al presupuesto sube el uso al 75 % y registra las alertas 70 y 75');
select public.editar_salario((select id from public.ingresos where es_salario), 1000000, 900000);
select results_eq(
  $$ select umbral from public.alertas_enviadas order by umbral $$,
  $$ values (70::smallint), (75::smallint), (80::smallint) $$,
  'bajar la parte del salario para el presupuesto sube el uso al 83 % y registra el 80');

select * from finish();
rollback;
