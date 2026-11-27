-- Etapa 6A (issue #30): presupuesto desde los ingresos, cierre con sobrantes de salario y de
-- presupuesto por separado, destinos del sobrante, gasto atrasado, «viene del período anterior»,
-- volver a cerrar y salario automático al abrir un período. Fechas fijas.
begin;
select plan(45);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

create temp table ids (nombre text primary key, id uuid);
grant all on ids to authenticated;
insert into ids select b.nombre, b.id from public.bolsas b where b.user_id = '00000000-0000-0000-0000-0000000000a1';
insert into ids select 'Débito', f.id from public.formas_pago f
 where f.user_id = '00000000-0000-0000-0000-0000000000a1' and f.nombre = 'Débito';
insert into ids select c.nombre, c.id from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre in ('Salario', 'Extra', 'Alimentación');

insert into public.bolsas (id, user_id, nombre) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta');
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 3000000, '2027-12-31',
   '00000000-0000-0000-0003-000000000001');
insert into public.periodos (id, user_id, fecha_inicio, fecha_fin) values
  ('00000000-0000-0000-0009-000000000011', '00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30'),
  ('00000000-0000-0000-0009-000000000012', '00000000-0000-0000-0000-0000000000a1', '2026-12-01', '2026-12-31');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- presupuesto desde los ingresos
insert into public.ingresos (titulo, fecha, valor, categoria_id, es_salario, monto_presupuesto)
values ('Salario', '2026-11-01', 4000000, (select id from ids where nombre = 'Salario'), true, 3000000);
select is((select presupuesto from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000011'),
  3000000::bigint, 'solo salario: el presupuesto es su parte para el presupuesto');

insert into public.ingresos (titulo, fecha, valor, categoria_id, bolsa_id, suma_presupuesto) values
  ('Venta', '2026-11-05', 200000, (select id from ids where nombre = 'Extra'), (select id from ids where nombre = 'Nequi'), true);
select is((select presupuesto from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000011'),
  3200000::bigint, 'un ingreso a Nequi que suma al presupuesto lo sube');
insert into public.ingresos (titulo, fecha, valor, categoria_id, bolsa_id, suma_presupuesto) values
  ('Regalo', '2026-11-06', 100000, (select id from ids where nombre = 'Extra'), (select id from ids where nombre = 'Nequi'), false),
  ('Reembolso', '2026-11-07', 50000, (select id from ids where nombre = 'Extra'), null, false);
select results_eq(
  $$ select (select presupuesto from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000011'),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')) $$,
  $$ values (3200000::bigint, 300000::bigint) $$,
  'un ingreso que no suma solo sube su bolsa, y uno sin bolsa ni suma no cambia nada (S3)');

-- Gastos de noviembre: 2.700.000 en total; Efectivo termina en 35.000.
insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor)
values ((select id from ids where nombre = 'Efectivo'), 'recarga', 'entrada', '2026-11-02', 100000);
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id, bolsa_id) values
  ('Mercado', '2026-11-10', 2635000, (select id from ids where nombre = 'Alimentación'), (select id from ids where nombre = 'Débito'), null),
  ('Almuerzo', '2026-11-12', 65000, (select id from ids where nombre = 'Alimentación'), null, (select id from ids where nombre = 'Efectivo'));
select is((select disponible from public.disponible_periodo where periodo_id = '00000000-0000-0000-0009-000000000011'),
  500000::bigint, 'el disponible es el presupuesto menos lo gastado');

-- ---------------------------------------------------------------- cierre (decisión 6)
reset role;
select public.cerrar_periodo('00000000-0000-0000-0009-000000000011');
set local role authenticated;

select results_eq(
  $$ select salario, salario_presupuesto, sobrante_salario, sobrante_presupuesto, excedido,
            no_destinado_salario, no_destinado_presupuesto
       from public.cierre_periodos where periodo_id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (4000000::bigint, 3000000::bigint, 1000000::bigint, 500000::bigint, 0::bigint, 1000000::bigint, 500000::bigint) $$,
  'el cierre informa por separado el sobrante del salario y el del presupuesto');
select results_eq(
  $$ select (resumen->>'sobrante_salario')::bigint, (resumen->>'sobrante_presupuesto')::bigint,
            (resumen->>'ingresos_estadisticas')::bigint
       from public.periodos where id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (1000000::bigint, 500000::bigint, 4350000::bigint) $$,
  'el resumen guarda los sobrantes; todos los ingresos, salario incluido, cuentan en estadísticas');
select results_eq(
  $$ select e->>'nombre', (e->>'saldo')::bigint
       from public.periodos p, jsonb_array_elements(p.resumen->'bolsas') e
      where p.id = '00000000-0000-0000-0009-000000000011' order by 1 $$,
  $$ values ('Daviplata'::text, 0::bigint), ('Efectivo', 35000), ('Nequi', 300000) $$,
  'el resumen informa el disponible de cada bolsa al fin del período, sin las bolsas de las metas');

-- «Viene del período anterior» (S6): saldo de la bolsa al fin del período anterior.
insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id) values
  ('Tinto', '2026-12-03', 5000, (select id from ids where nombre = 'Alimentación'), (select id from ids where nombre = 'Efectivo'));
select is((select saldo from public.saldos_bolsa_al('2026-11-30') where bolsa_id = (select id from ids where nombre = 'Efectivo')),
  35000::bigint, 'viene del período anterior: 35.000, aunque en diciembre ya se gastó');
select is((select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')),
  30000::bigint, 'el saldo de Efectivo sigue en la bolsa');

-- ---------------------------------------------------------------- destinar (decisión 7, S7)
select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000012', 'presupuesto', 1000,
  (select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'periodo.abierto', 'no se destina desde un período abierto');
select lives_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'presupuesto', 300000,
  null, '00000000-0000-0000-0007-000000000001', '2026-12-02') $$, 'destinar 300.000 a una meta');
select lives_ok($$ insert into ids select 'destino_efectivo', public.destinar_sobrante('00000000-0000-0000-0009-000000000011',
  'presupuesto', 100000, (select id from ids where nombre = 'Efectivo'), null, '2026-12-02', 'Para el bus') $$,
  'destinar 100.000 a Efectivo');
select results_eq(
  $$ select destinado_presupuesto, no_destinado_presupuesto, no_destinado_salario
       from public.cierre_periodos where periodo_id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (400000::bigint, 100000::bigint, 1000000::bigint) $$,
  'lo destinado se resta del sobrante de presupuesto y el resto queda «No destinado»');
select is((select (resumen->>'no_destinado_presupuesto')::bigint from public.periodos
            where id = '00000000-0000-0000-0009-000000000011'), 100000::bigint,
  'el resumen del período cerrado se actualiza al destinar');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = '00000000-0000-0000-0003-000000000001'),
            (select saldo from public.estado_metas('2026-12-02') where meta_id = '00000000-0000-0000-0007-000000000001'),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')) $$,
  $$ values (300000::bigint, 300000::bigint, 130000::bigint) $$,
  'la meta cuenta lo destinado como ahorrado y Efectivo sube');
select results_eq(
  $$ select presupuesto, aportes_presupuesto from public.disponible_periodo
      where periodo_id = '00000000-0000-0000-0009-000000000012' $$,
  $$ values (0::bigint, 0::bigint) $$, 'destinar no toca el presupuesto del período nuevo');
select results_eq(
  $$ select origen, valor, destino_nombre, nota from public.destinos_sobrante
      where periodo_id = '00000000-0000-0000-0009-000000000011' order by valor $$,
  $$ values ('presupuesto'::text, 100000::bigint, 'Efectivo'::text, 'Para el bus'::text),
            ('presupuesto', 300000, 'Viaje', null) $$,
  'la lista de destinos muestra el nombre de la bolsa o de la meta');
select is((select tipo from public.movimientos_de_bolsa where id = (select id from ids where nombre = 'destino_efectivo')),
  'sobrante', 'en los movimientos de la bolsa el destino aparece como sobrante');

select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'presupuesto', 200000,
  (select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'sobrante.insuficiente', 'no se destina más de lo que queda');
select lives_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'salario', 1000000,
  (select id from ids where nombre = 'Nequi'), null, '2026-12-02') $$, 'el sobrante del salario se destina aparte, completo');
select is((select no_destinado_salario from public.cierre_periodos where periodo_id = '00000000-0000-0000-0009-000000000011'),
  0::bigint, 'el sobrante del salario queda todo destinado');
select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'presupuesto', 1000,
  (select id from ids where nombre = 'Efectivo'), '00000000-0000-0000-0007-000000000001') $$,
  'P0001', 'sobrante.destino_invalido', 'el destino es una bolsa o una meta, no las dos');
select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'otro', 1000,
  (select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'sobrante.origen_invalido', 'el origen es el salario o el presupuesto');
select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'presupuesto', 0,
  (select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'movimiento.valor_invalido', 'no se destina $0');

-- Editar y quitar un destino.
select lives_ok($$ select public.editar_destino((select id from ids where nombre = 'destino_efectivo'), 150000) $$,
  'subir un destino dentro de lo que queda');
select throws_ok($$ select public.editar_destino((select id from ids where nombre = 'destino_efectivo'), 300000) $$,
  'P0001', 'sobrante.insuficiente', 'un destino editado no pasa de lo que queda');
select lives_ok($$ select public.eliminar_destino((select id from ids where nombre = 'destino_efectivo')) $$,
  'quitar un destino');
select results_eq(
  $$ select (select no_destinado_presupuesto from public.cierre_periodos where periodo_id = '00000000-0000-0000-0009-000000000011'),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')) $$,
  $$ values (200000::bigint, 30000::bigint) $$,
  'lo quitado vuelve a «No destinado» y sale de Efectivo');
select throws_ok($$ select public.eliminar_destino((select id from ids where nombre = 'destino_efectivo')) $$,
  'P0002', 'destino.no_existe', 'un destino quitado ya no existe');

-- ---------------------------------------------------------------- gasto atrasado (decisión 8)
select is(public.advertencia_sobrante('2026-11-25'), false, 'sin negativo no hay advertencia');
insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values
  ('Olvidado', '2026-11-25', 450000, (select id from ids where nombre = 'Alimentación'), (select id from ids where nombre = 'Débito'));
select results_eq(
  $$ select sobrante_presupuesto, no_destinado_presupuesto from public.cierre_periodos
      where periodo_id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (50000::bigint, -250000::bigint) $$,
  'un gasto atrasado se registra y deja el no destinado negativo');
select is(public.advertencia_sobrante('2026-11-25'), true, 'y la advertencia lo avisa');
select is(public.advertencia_sobrante('2026-12-10'), false, 'un período abierto no tiene advertencia');
select is((select (resumen->>'no_destinado_presupuesto')::bigint from public.periodos
            where id = '00000000-0000-0000-0009-000000000011'), -250000::bigint,
  'el resumen del período cerrado se corrige');

-- Te pasaste (S5): el exceso se informa y no toca el sobrante del salario.
insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id) values
  ('Olvidado', '2026-11-28', 100000, (select id from ids where nombre = 'Alimentación'), (select id from ids where nombre = 'Efectivo'));
select results_eq(
  $$ select sobrante_presupuesto, excedido, sobrante_salario from public.cierre_periodos
      where periodo_id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (0::bigint, 50000::bigint, 1000000::bigint) $$,
  'si se pasó, el sobrante de presupuesto es 0, el exceso se informa y el del salario no cambia');
select is((select saldo from public.saldos_bolsa_al('2026-11-30') where bolsa_id = (select id from ids where nombre = 'Efectivo')),
  -65000::bigint, 'el gasto atrasado desde Efectivo corrige lo que viene al período nuevo');

-- ---------------------------------------------------------------- volver a cerrar (S9)
reset role;
update public.periodos set resumen = resumen - 'cuotas_pendientes' where id = '00000000-0000-0000-0009-000000000011';
set local role authenticated;
select lives_ok($$ select public.volver_a_cerrar('00000000-0000-0000-0009-000000000011') $$, 'volver a cerrar');
select results_eq(
  $$ select recerrado_at is not null, resumen ? 'cuotas_pendientes' from public.periodos
      where id = '00000000-0000-0000-0009-000000000011' $$,
  $$ values (true, true) $$, 'volver a cerrar rehace el resumen completo y guarda la fecha');
select throws_ok($$ select public.volver_a_cerrar('00000000-0000-0000-0009-000000000012') $$,
  'P0001', 'periodo.abierto', 'un período abierto no se vuelve a cerrar');

-- ---------------------------------------------------------------- otro usuario
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.destinar_sobrante('00000000-0000-0000-0009-000000000011', 'salario', 1000,
  (select id from public.bolsas limit 1)) $$,
  'P0002', 'periodo.no_existe', 'B no destina el sobrante de A');
select is_empty($$ select * from public.destinos_sobrante $$, 'B no ve los destinos de A');

-- ---------------------------------------------------------------- salario automático (S1)
reset role;
update public.perfiles set salario_base = 4000000, presupuesto_salario_base = 3000000
 where user_id = '00000000-0000-0000-0000-0000000000a1';
select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-01-10');
select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000a1', '2027-01-10');
select results_eq(
  $$ select fecha, valor, monto_presupuesto, categoria_nombre from public.ingresos
      where user_id = '00000000-0000-0000-0000-0000000000a1' and es_salario and fecha >= '2026-12-01' $$,
  $$ values ('2027-01-01'::date, 4000000::bigint, 3000000::bigint, 'Salario'::text) $$,
  'el período nuevo nace con el salario base el primer día, una sola vez; los que ya existían no cambian');
select public.asegurar_periodos_de('00000000-0000-0000-0000-0000000000b2', '2027-01-10');
select is_empty($$ select 1 from public.ingresos where user_id = '00000000-0000-0000-0000-0000000000b2' $$,
  'con salario base 0 el período nace sin salario y su presupuesto es 0');

-- ---------------------------------------------------------------- permisos
select is_empty($$
  select f from unnest(array[
    'public.configurar_salario(bigint, bigint, uuid, boolean, date)',
    'public.editar_salario(uuid, bigint, bigint, boolean)', 'public.saldos_bolsa_al(date)',
    'public.volver_a_cerrar(uuid)', 'public.destinar_sobrante(uuid, text, bigint, uuid, uuid, date, text)',
    'public.editar_destino(uuid, bigint)', 'public.eliminar_destino(uuid)', 'public.advertencia_sobrante(date)']) f
   where not has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') $$,
  'las funciones de la Etapa 6A son para authenticated y no para anon');
select is_empty($$
  select v from unnest(array['public.disponible_periodo', 'public.cierre_periodos', 'public.destinos_sobrante']) v
   where not has_table_privilege('authenticated', v, 'select')
      or has_table_privilege('authenticated', v, 'insert, update, delete')
      or has_table_privilege('anon', v, 'select') $$,
  'las vistas del presupuesto y el cierre son de solo lectura para authenticated y cerradas para anon');

select * from finish();
rollback;
