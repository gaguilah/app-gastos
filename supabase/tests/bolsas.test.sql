-- 3.4 Bolsas: crear con saldo inicial, nombres sin repetir, renombrar, recargar, trasladar,
-- eliminar (borrar o archivar, con traslado o ajuste del saldo) y movimientos de la bolsa.
-- Etapa 6, issue #11 (supuestos 1 a 7). Fechas fijas; las bolsas iniciales vienen de inicializar_usuario.
begin;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

insert into public.periodos (user_id, fecha_inicio, fecha_fin, presupuesto) values
  ('00000000-0000-0000-0000-0000000000a1', '2026-11-01', '2026-11-30', 1000000);

create temp table ids (nombre text primary key, id uuid);
grant all on ids to authenticated;
insert into ids
select b.nombre, b.id from public.bolsas b where b.user_id = '00000000-0000-0000-0000-0000000000a1';
insert into ids
select 'Gasto', c.id from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre = 'Otros' and c.tipo = 'gasto';
insert into ids
select 'Salario', c.id from public.categorias c
 where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre = 'Salario';
insert into ids
select 'B Nequi', b.id from public.bolsas b
 where b.user_id = '00000000-0000-0000-0000-0000000000b2' and b.nombre = 'Nequi';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------- crear
insert into ids select 'Viaje', public.crear_bolsa('  Viaje ', 200000, '2026-11-02');
select results_eq(
  $$ select b.nombre, f.clase, f.nombre from public.bolsas b join public.formas_pago f on f.id = b.forma_pago_id
      where b.id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('Viaje', 'bolsa', 'Viaje') $$,
  'crear_bolsa crea la bolsa y su forma de pago de clase bolsa, con el nombre recortado');
select is((select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Viaje')),
  200000::bigint, 'el saldo inicial queda en la bolsa');
select results_eq(
  $$ select tipo, sentido, meta_id from public.movimientos_bolsa where bolsa_id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('saldo_inicial', 'entrada', null::uuid) $$,
  'el saldo inicial es un movimiento saldo_inicial sin meta');
select is((select disponible from public.disponible_periodo), 1000000::bigint, 'el saldo inicial no toca el disponible');
insert into ids select 'Sin saldo', public.crear_bolsa('Sin saldo');
select is((select count(*)::int from public.movimientos_bolsa where bolsa_id = (select id from ids where nombre = 'Sin saldo')),
  0, 'sin saldo inicial no se crea movimiento');
select throws_ok($$ select public.crear_bolsa('  efectivo ') $$, 'P0001', 'bolsa.nombre_repetido',
  'un nombre repetido (normalizado) entre bolsas activas se rechaza');
select throws_ok($$ select public.crear_bolsa('Otra', -1) $$, 'P0001', 'movimiento.valor_invalido',
  'un saldo inicial negativo se rechaza');

-- ---------------------------------------------------------------- renombrar
select lives_ok($$ select public.renombrar_bolsa((select id from ids where nombre = 'Nequi'), 'Nequi personal') $$,
  'renombrar una bolsa');
select results_eq(
  $$ select b.nombre, f.nombre from public.bolsas b join public.formas_pago f on f.id = b.forma_pago_id
      where b.id = (select id from ids where nombre = 'Nequi') $$,
  $$ values ('Nequi personal', 'Nequi personal') $$,
  'renombrar cambia la bolsa y su forma de pago');
select throws_ok($$ select public.renombrar_bolsa((select id from ids where nombre = 'Nequi'), 'DAVIPLATA') $$,
  'P0001', 'bolsa.nombre_repetido', 'renombrar a un nombre de otra bolsa activa se rechaza');
select lives_ok($$ select public.renombrar_bolsa((select id from ids where nombre = 'Nequi'), 'nequi PERSONAL') $$,
  'renombrar a su propio nombre con otras mayúsculas se permite');

-- ---------------------------------------------------------------- recargar
select lives_ok($$ select public.recargar_bolsa((select id from ids where nombre = 'Efectivo'), 100000, '2026-11-03', 'Cajero') $$,
  'recargar Efectivo');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')),
            (select disponible from public.disponible_periodo) $$,
  $$ values (100000::bigint, 1000000::bigint) $$,
  'la recarga suma a la bolsa y no toca el disponible');
select throws_ok($$ select public.recargar_bolsa((select id from ids where nombre = 'Efectivo'), 0) $$,
  'P0001', 'movimiento.valor_invalido', 'una recarga de $0 se rechaza');

-- ---------------------------------------------------------------- trasladar
insert into ids select 'Traslado', public.trasladar((select id from ids where nombre = 'Efectivo'),
  (select id from ids where nombre = 'Nequi'), 40000, '2026-11-04');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')),
            (select disponible from public.disponible_periodo) $$,
  $$ values (60000::bigint, 40000::bigint, 1000000::bigint) $$,
  'el traslado pasa el dinero de una bolsa a otra sin tocar el disponible');
select results_eq(
  $$ select s.tipo, s.sentido, e.tipo, e.sentido from public.movimientos_bolsa s
       join public.movimientos_bolsa e on e.enlace_id = s.id
      where s.id = (select id from ids where nombre = 'Traslado') $$,
  $$ values ('traslado', 'salida', 'traslado', 'entrada') $$,
  'el traslado son dos movimientos enlazados: la entrada apunta a la salida');
select lives_ok($$ select public.trasladar((select id from ids where nombre = 'Daviplata'),
  (select id from ids where nombre = 'Nequi'), 50000, '2026-11-04') $$,
  'trasladar más que el saldo se permite (la app advierte)');
select is((select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Daviplata')),
  -50000::bigint, 'la bolsa de origen queda en negativo');
select throws_ok($$ select public.trasladar((select id from ids where nombre = 'Nequi'), (select id from ids where nombre = 'Nequi'), 1000) $$,
  'P0001', 'traslado.misma_bolsa', 'no se traslada a la misma bolsa');
select throws_ok($$ select public.trasladar((select id from ids where nombre = 'Nequi'), (select id from ids where nombre = 'Efectivo'), 0) $$,
  'P0001', 'movimiento.valor_invalido', 'un traslado de $0 se rechaza');
select throws_ok($$ select public.trasladar((select id from ids where nombre = 'Nequi'), (select id from ids where nombre = 'B Nequi'), 1000) $$,
  'P0002', 'bolsa.no_existe', 'no se traslada a una bolsa de otro usuario');

-- ---------------------------------------------------------------- movimientos de la bolsa
insert into public.ingresos (titulo, fecha, valor, categoria_id, categoria_nombre, bolsa_id)
values ('Freelance', '2026-11-05', 350000, (select id from ids where nombre = 'Salario'), '', (select id from ids where nombre = 'Nequi'));
insert into public.gastos (titulo, fecha, valor, categoria_id, categoria_nombre, bolsa_id) values
  ('Almuerzo', '2026-11-06', 28000, (select id from ids where nombre = 'Gasto'), '', (select id from ids where nombre = 'Nequi')),
  ('Mercado', '2026-11-07', 34900, (select id from ids where nombre = 'Gasto'), '', (select id from ids where nombre = 'Nequi'));
insert into public.gastos (titulo, fecha, valor, categoria_id, categoria_nombre, bolsa_id, estado) values
  ('Pendiente', '2026-11-07', 1000, (select id from ids where nombre = 'Gasto'), '', (select id from ids where nombre = 'Nequi'), 'pendiente');
select results_eq(
  $$ select tipo, titulo, valor, contraparte from public.movimientos_de_bolsa
      where bolsa_id = (select id from ids where nombre = 'Nequi') order by fecha, valor $$,
  $$ values ('traslado', null::text, 40000::bigint, 'Efectivo'),
            ('traslado', null, 50000, 'Daviplata'),
            ('ingreso', 'Freelance', 350000, 'Salario'),
            ('gasto', 'Almuerzo', -28000, null),
            ('gasto', 'Mercado', -34900, null) $$,
  'los movimientos de la bolsa unen traslados, ingresos y gastos confirmados con su signo');
select is((select sum(valor) from public.movimientos_de_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')),
  (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi'))::numeric,
  'la suma de los movimientos da el saldo de la bolsa');
select results_eq(
  $$ select usos, ultimo, ultimo_titulo from public.uso_bolsas where bolsa_id = (select id from ids where nombre = 'Nequi') $$,
  $$ values (5, '2026-11-07'::date, 'Mercado') $$,
  'uso_bolsas da el conteo y el último movimiento');

-- ---------------------------------------------------------------- eliminar
select is(public.eliminar_bolsa((select id from ids where nombre = 'Sin saldo')), 'eliminado',
  'una bolsa sin movimientos se borra');
select is((select count(*)::int from public.formas_pago where nombre = 'Sin saldo'), 0,
  'su forma de pago también se borra');
-- Nequi tiene 377.100: se pasa a Efectivo.
select is(public.eliminar_bolsa((select id from ids where nombre = 'Nequi'), (select id from ids where nombre = 'Efectivo'), '2026-11-08'),
  'archivado', 'una bolsa con movimientos se archiva');
select results_eq(
  $$ select (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Nequi')),
            (select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Efectivo')),
            (select b.archivada and f.archivada from public.bolsas b join public.formas_pago f on f.id = b.forma_pago_id
              where b.id = (select id from ids where nombre = 'Nequi')) $$,
  $$ values (0::bigint, 437100::bigint, true) $$,
  'el saldo pasa a Efectivo y la bolsa y su forma de pago quedan archivadas');
select lives_ok($$ select public.crear_bolsa('nequi personal') $$,
  'el nombre de una bolsa archivada se puede volver a usar');
-- Viaje tiene 200.000: se deja como ajuste (Gasto desconocido).
select is(public.eliminar_bolsa((select id from ids where nombre = 'Viaje'), null, '2026-11-09'), 'archivado',
  'eliminar dejando el saldo como ajuste');
select results_eq(
  $$ select categoria_nombre, valor, es_ajuste, saldo_real from public.gastos
      where bolsa_id = (select id from ids where nombre = 'Viaje') $$,
  $$ values ('Gasto desconocido', 200000::bigint, true, 0::bigint) $$,
  'el saldo positivo queda como Gasto desconocido con saldo contado $0');
-- Daviplata está en −50.000: el ajuste sube a 0 sin tocar el presupuesto.
select is(public.eliminar_bolsa((select id from ids where nombre = 'Daviplata'), null, '2026-11-09'), 'archivado',
  'eliminar una bolsa en negativo dejándolo como ajuste');
select is((select saldo from public.saldos_bolsa where bolsa_id = (select id from ids where nombre = 'Daviplata')),
  0::bigint, 'el saldo negativo se ajusta a 0');

-- Una bolsa que es origen de un aporte periódico activo no se elimina.
reset role;
insert into public.bolsas (id, user_id, nombre) values
  ('00000000-0000-0000-0003-000000000099', '00000000-0000-0000-0000-0000000000a1', 'Bolsa meta');
insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Moto', 1000000, '2027-12-31',
   '00000000-0000-0000-0003-000000000099');
insert into public.reglas_aporte (user_id, meta_id, valor, frecuencia, dia, bolsa_id, proxima_fecha) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000001', 50000, 'mensual', 1,
   (select id from ids where nombre = 'Efectivo'), '2026-12-01');
set local role authenticated;
select throws_ok($$ select public.eliminar_bolsa((select id from ids where nombre = 'Efectivo')) $$,
  'P0001', 'bolsa.en_uso_por_reglas', 'una bolsa origen de una regla activa no se elimina');
select throws_ok($$ select public.eliminar_bolsa('00000000-0000-0000-0003-000000000099') $$,
  'P0002', 'bolsa.no_existe', 'la bolsa de una meta no se elimina desde Bolsas');

-- ---------------------------------------------------------------- otro usuario
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.eliminar_bolsa((select id from ids where nombre = 'Efectivo')) $$,
  'P0002', 'bolsa.no_existe', 'B no puede eliminar una bolsa de A');
select is_empty($$ select 1 from public.movimientos_de_bolsa where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  'B no ve los movimientos de las bolsas de A');

select * from finish();
rollback;
