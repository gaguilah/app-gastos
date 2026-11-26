-- Gestión de datos de referencia (Etapa 5, issue #10): crear o reactivar, eliminar o archivar,
-- unir duplicados, posibles duplicados, sugerencias y conteos de uso.
-- Reglas 3.8 (tarjetas sin números), 3.9 (lugares), 3.11 (categorías) y 3.14 (CRUD).
begin;
select plan(60);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

-- Ids de A que el trigger de arranque creó con nombre conocido.
create temp table ref as
select
  (select id from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Alimentación') as alimentacion,
  (select id from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and clave_sistema = 'gasto_desconocido') as desconocido,
  (select id from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and clave_sistema = 'pago_prestamos') as pago_prestamos,
  (select id from public.bolsas where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Efectivo') as efectivo,
  (select id from public.formas_pago where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Débito') as debito,
  (select id from public.formas_pago where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Bre-B') as breb;
grant select on ref to authenticated;

-- Montaje de A (como superusuario). Los ids de L1 < L2 y P1 < P2 para conocer el orden de los pares.
select lives_ok($$
  insert into public.lugares (id, user_id, nombre) values
    ('00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-0000000000a1', 'D1 Chapinero'),
    ('00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0000-0000000000a1', 'D1 Chapinero Alto'),
    ('00000000-0000-0000-0050-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Éxito'),
    ('00000000-0000-0000-0050-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Terpel'),
    ('00000000-0000-0000-0050-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Sin uso');
  insert into public.personas (id, user_id, nombre, tipo) values
    ('00000000-0000-0000-0051-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Camila R.', 'persona'),
    ('00000000-0000-0000-0051-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Camila Rojas', 'persona'),
    ('00000000-0000-0000-0051-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Banco X', 'banco'),
    ('00000000-0000-0000-0051-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Lucía P', 'persona'),
    ('00000000-0000-0000-0051-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Lucia P.', 'persona');
  insert into public.formas_pago (id, user_id, nombre, clase) values
    ('00000000-0000-0000-0052-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Débito 2', 'medio');
  insert into public.categorias (id, user_id, nombre, icono, color, tipo, padre_id) values
    ('00000000-0000-0000-0053-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Café', 'coffee', '#92400e', 'gasto', null),
    ('00000000-0000-0000-0053-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Temporal', 'tag', '#3c4a42', 'gasto', null);
  insert into public.categorias (id, user_id, nombre, tipo, padre_id) values
    ('00000000-0000-0000-0053-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Tinto', 'gasto', '00000000-0000-0000-0053-000000000001'),
    ('00000000-0000-0000-0053-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Pan', 'gasto', '00000000-0000-0000-0053-000000000001'),
    ('00000000-0000-0000-0053-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Temporal sub', 'gasto', '00000000-0000-0000-0053-000000000004');

  -- L1: 1 gasto; L2: 2 gastos y 1 regla; Éxito: 1 gasto.
  insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id, lugar_id)
  select '00000000-0000-0000-0000-0000000000a1', t.titulo, t.fecha::date, 10000, r.alimentacion, r.efectivo, t.lugar::uuid
    from ref r, (values
      ('Mercado 1', '2026-03-02', '00000000-0000-0000-0050-000000000001'),
      ('Mercado 2', '2026-03-03', '00000000-0000-0000-0050-000000000002'),
      ('Mercado 3', '2026-03-09', '00000000-0000-0000-0050-000000000002'),
      ('Mercado 4', '2026-03-04', '00000000-0000-0000-0050-000000000003')) t(titulo, fecha, lugar);
  insert into public.reglas_periodicas (id, user_id, titulo, valor, categoria_id, bolsa_id, lugar_id, frecuencia, fecha_inicio, proxima_fecha)
  select '00000000-0000-0000-0054-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Mercado semanal', 50000,
         r.alimentacion, r.efectivo, '00000000-0000-0000-0050-000000000002', 'semanal', '2026-03-02', '2026-03-02'
    from ref r;

  -- Café/Tinto con un gasto; Débito 2 en un gasto, una regla, una deuda y una regla de aporte.
  insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, subcategoria_id, medio_id)
  values ('00000000-0000-0000-0000-0000000000a1', 'Tinto', '2026-03-05', 3000,
          '00000000-0000-0000-0053-000000000001', '00000000-0000-0000-0053-000000000002',
          '00000000-0000-0000-0052-000000000001');
  insert into public.reglas_periodicas (id, user_id, titulo, valor, categoria_id, medio_id, frecuencia, fecha_inicio, proxima_fecha)
  select '00000000-0000-0000-0054-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Internet', 90000,
         r.alimentacion, '00000000-0000-0000-0052-000000000001', 'mensual', '2026-03-05', '2026-03-05'
    from ref r;

  -- Camila R.: 1 préstamo; Camila Rojas: 1 préstamo y 1 deuda pagada con Débito 2.
  insert into public.prestamos (user_id, persona_id, monto, fecha) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0051-000000000001', 50000, '2026-03-01'),
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0051-000000000002', 20000, '2026-03-06');
  insert into public.deudas (id, user_id, persona_id, categoria_id, fecha, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id)
  select '00000000-0000-0000-0055-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0051-000000000002',
         r.pago_prestamos, '2026-03-07', 600000, 6, 100000, 5, '00000000-0000-0000-0052-000000000001'
    from ref r;

  insert into public.bolsas (id, user_id, nombre) values
    ('00000000-0000-0000-0056-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta');
  insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
    ('00000000-0000-0000-0057-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Viaje', 1000000, '2027-01-31',
     '00000000-0000-0000-0056-000000000001');
  insert into public.reglas_aporte (id, user_id, meta_id, valor, frecuencia, dia, medio_id, proxima_fecha) values
    ('00000000-0000-0000-0058-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0057-000000000001',
     100000, 'mensual', 15, '00000000-0000-0000-0052-000000000001', '2026-03-15');
$$, 'montaje: lugares, personas, formas de pago, categorías y sus usos de A');

-- ---------------------------------------------------------------- como A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Conteos de uso
select is((select usos from public.uso_lugares where lugar_id = '00000000-0000-0000-0050-000000000002'), 2,
  'uso_lugares cuenta los gastos del lugar');
select is((select ultimo from public.uso_lugares where lugar_id = '00000000-0000-0000-0050-000000000002'), '2026-03-09'::date,
  'uso_lugares da la fecha del último gasto');
select is((select usos from public.uso_lugares where lugar_id = '00000000-0000-0000-0050-000000000005'), 0,
  'un lugar sin gastos aparece con 0 usos');
select is((select usos from public.uso_categorias where categoria_id = '00000000-0000-0000-0053-000000000001'), 1,
  'uso_categorias cuenta los movimientos de la categoría');
select is((select usos from public.uso_categorias where categoria_id = '00000000-0000-0000-0053-000000000002'), 1,
  'uso_categorias cuenta los movimientos de la subcategoría');
select is((select usos from public.uso_personas where persona_id = '00000000-0000-0000-0051-000000000002'), 2,
  'uso_personas cuenta préstamos y deudas');
select is((select usos from public.uso_formas_pago where forma_pago_id = '00000000-0000-0000-0052-000000000001'), 1,
  'uso_formas_pago cuenta los gastos pagados con el medio');

-- 3.9 Crear o reactivar
select is((select row(id, estado)::text from public.crear_lugar('  ÉXITO ')),
  row('00000000-0000-0000-0050-000000000003'::uuid, 'existente')::text,
  '"  ÉXITO " devuelve el lugar "Éxito" que ya existe');
select is((select count(*)::int from public.lugares where nombre_normalizado = 'exito'), 1,
  'no se crea un segundo "Éxito"');
select throws_ok($$ insert into public.lugares (nombre) values ('éxito') $$, '23505', null,
  'un insert directo de "éxito" choca con la restricción única');
select is((select estado from public.crear_lugar('Panadería Nueva')), 'creado', 'un nombre nuevo crea el lugar');
select is((select nombre from public.lugares where nombre_normalizado = 'panaderia nueva'), 'Panadería Nueva',
  'el lugar nuevo guarda el nombre como se escribió');
select throws_ok($$ select * from public.crear_lugar('   ') $$, 'P0001', 'lugar.nombre_vacio',
  'un nombre vacío no crea lugar');

-- 3.14 Eliminar o archivar lugares
select is(public.eliminar_lugar('00000000-0000-0000-0050-000000000005'), 'eliminado', 'un lugar sin uso se elimina');
select is_empty($$ select 1 from public.lugares where id = '00000000-0000-0000-0050-000000000005' $$,
  'el lugar eliminado ya no existe');
select is(public.eliminar_lugar('00000000-0000-0000-0050-000000000003'), 'archivado', 'un lugar en uso se archiva');
select is((select count(*)::int from public.gastos where lugar_id = '00000000-0000-0000-0050-000000000003'), 1,
  'el gasto conserva el lugar archivado');
select is((select row(id, estado)::text from public.crear_lugar('exito')),
  row('00000000-0000-0000-0050-000000000003'::uuid, 'reactivado')::text,
  'crear "exito" reactiva el "Éxito" archivado');
select is((select archivado from public.lugares where id = '00000000-0000-0000-0050-000000000003'), false,
  'el lugar reactivado ya no está archivado');

-- 3.9 Posibles duplicados y sugerencias
select ok(exists(select 1 from public.posibles_duplicados('lugar')
                  where a_id = '00000000-0000-0000-0050-000000000001' and b_id = '00000000-0000-0000-0050-000000000002'),
  '"D1 Chapinero" y "D1 Chapinero Alto" son un posible duplicado');
select ok(not exists(select 1 from public.posibles_duplicados('lugar')
                      where '00000000-0000-0000-0050-000000000003' in (a_id, b_id)
                        and '00000000-0000-0000-0050-000000000004' in (a_id, b_id)),
  '"Éxito" y "Terpel" no son un posible duplicado');
select is((select id from public.sugerir_lugares('d1') limit 1), '00000000-0000-0000-0050-000000000002'::uuid,
  'sugerir "d1" pone primero el lugar más usado');
select is((select count(*)::int from public.sugerir_lugares('D1')), 2, 'sugerir "D1" trae los dos D1');
select lives_ok($$ select public.marcar_distintos('lugar', '00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0050-000000000001') $$,
  '"No son el mismo" guarda el par en cualquier orden');
select ok(not exists(select 1 from public.posibles_duplicados('lugar')
                      where a_id = '00000000-0000-0000-0050-000000000001' and b_id = '00000000-0000-0000-0050-000000000002'),
  'un par descartado no se vuelve a sugerir');
select lives_ok($$ select public.marcar_distintos('lugar', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0050-000000000002') $$,
  'descartar el mismo par otra vez no falla');
select throws_ok($$ select * from public.posibles_duplicados('bolsa') $$, 'P0001', 'duplicado.entidad_invalida',
  'solo hay duplicados de lugares y personas');

-- 3.14 Unir lugares
select throws_ok($$ select public.unir_lugares('00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0050-000000000001') $$,
  'P0001', 'unir.mismo', 'un lugar no se une consigo mismo');
select lives_ok($$ select public.unir_lugares('00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0050-000000000001') $$,
  'A une "D1 Chapinero Alto" con "D1 Chapinero"');
select is((select count(*)::int from public.gastos where lugar_id = '00000000-0000-0000-0050-000000000001'), 3,
  'los gastos del lugar unido quedan en el que se conserva');
select is((select lugar_id from public.reglas_periodicas where id = '00000000-0000-0000-0054-000000000001'),
  '00000000-0000-0000-0050-000000000001'::uuid, 'la regla periódica queda en el lugar que se conserva');
select is_empty($$ select 1 from public.lugares where id = '00000000-0000-0000-0050-000000000002' $$,
  'el lugar unido desaparece');
select is_empty($$ select 1 from public.pares_distintos where '00000000-0000-0000-0050-000000000002' in (a_id, b_id) $$,
  'los pares descartados del lugar unido se borran');

-- Personas
select throws_ok($$ select public.unir_personas('00000000-0000-0000-0051-000000000002', '00000000-0000-0000-0051-000000000003') $$,
  'P0001', 'unir.tipo_distinto', 'una persona no se une con un banco');
select lives_ok($$ select public.unir_personas('00000000-0000-0000-0051-000000000002', '00000000-0000-0000-0051-000000000001') $$,
  'A une "Camila Rojas" con "Camila R."');
select is((select usos from public.uso_personas where persona_id = '00000000-0000-0000-0051-000000000001'), 3,
  'préstamos y deudas quedan en la persona que se conserva');
select ok(exists(select 1 from public.posibles_duplicados('persona')
                  where a_id = '00000000-0000-0000-0051-000000000004' and b_id = '00000000-0000-0000-0051-000000000005'),
  '"Lucía P" y "Lucia P." son un posible duplicado');
select throws_ok($$ select * from public.crear_persona('Visa 4111 1111 1111 1111') $$, '23514', null,
  'una persona con número de tarjeta se rechaza');
select throws_ok($$ select * from public.crear_persona('Visa oro', 'tarjeta') $$, 'P0001', 'persona.tipo_invalido',
  'las tarjetas no se crean desde aquí');
select is((select estado from public.crear_persona('Banco Y', 'banco')), 'creado', 'se crea un banco');

-- Formas de pago
select throws_ok(format($$ select public.unir_formas_pago('00000000-0000-0000-0052-000000000001', %L) $$, (select breb from ref)),
  'P0001', 'unir.clase_distinta', 'un medio no se une con un canal');
select lives_ok(format($$ select public.unir_formas_pago('00000000-0000-0000-0052-000000000001', %L) $$, (select debito from ref)),
  'A une "Débito 2" con "Débito"');
select is((select count(*)::int from public.gastos where medio_id = (select debito from ref)), 1,
  'el gasto queda en el medio que se conserva');
select is((select medio_id from public.reglas_periodicas where id = '00000000-0000-0000-0054-000000000002'), (select debito from ref),
  'la regla periódica queda en el medio que se conserva');
select is((select medio_id from public.deudas where id = '00000000-0000-0000-0055-000000000001'), (select debito from ref),
  'la deuda queda en el medio que se conserva');
select is((select medio_id from public.reglas_aporte where id = '00000000-0000-0000-0058-000000000001'), (select debito from ref),
  'la regla de aporte queda en el medio que se conserva');
select is(public.eliminar_forma_pago((select breb from ref)), 'eliminado', 'un canal sin uso se elimina');
select is(public.eliminar_forma_pago((select debito from ref)), 'archivado', 'un medio en uso se archiva');

-- 3.11 y 3.14 Categorías
select throws_ok(format($$ select public.eliminar_categoria(%L) $$, (select desconocido from ref)),
  'P0001', 'categoria.sistema', 'una categoría del sistema no se elimina');
select is(public.eliminar_categoria('00000000-0000-0000-0053-000000000004'), 'eliminado',
  'una categoría sin uso se elimina con sus subcategorías');
select is(public.eliminar_categoria('00000000-0000-0000-0053-000000000001'), 'archivado',
  'una categoría con una subcategoría en uso se archiva');
select is((select count(*)::int from public.categorias
            where archivada and id in ('00000000-0000-0000-0053-000000000001', '00000000-0000-0000-0053-000000000002',
                                       '00000000-0000-0000-0053-000000000003')), 3,
  'la categoría y todas sus subcategorías quedan archivadas, ninguna borrada');

-- ---------------------------------------------------------------- como B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ select public.eliminar_lugar('00000000-0000-0000-0050-000000000001') $$, 'P0002', 'lugar.no_existe',
  'B no puede eliminar un lugar de A');
select throws_ok($$ select public.unir_lugares('00000000-0000-0000-0050-000000000004', '00000000-0000-0000-0050-000000000001') $$,
  'P0002', 'lugar.no_existe', 'B no puede unir lugares de A');

select is_empty($$ select 1 from public.uso_lugares $$, 'B no ve los conteos de uso de A');
select is_empty($$ select 1 from public.sugerir_lugares('d1') $$, 'B no recibe sugerencias con lugares de A');
select is_empty($$ select 1 from public.posibles_duplicados('lugar') $$, 'B no ve posibles duplicados de A');

-- ---------------------------------------------------------------- permisos
reset role;
select is_empty($$
  select f from unnest(array[
    'public.crear_lugar(text)', 'public.crear_persona(text, text)',
    'public.eliminar_lugar(uuid)', 'public.eliminar_persona(uuid)', 'public.eliminar_forma_pago(uuid)',
    'public.eliminar_categoria(uuid)', 'public.unir_lugares(uuid, uuid)', 'public.unir_personas(uuid, uuid)',
    'public.unir_formas_pago(uuid, uuid)', 'public.posibles_duplicados(text)',
    'public.marcar_distintos(text, uuid, uuid)', 'public.sugerir_lugares(text, integer)']) f
   where not has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') $$,
  'las funciones de la Etapa 5 son para authenticated y no para anon');
select is_empty($$
  select v from unnest(array['public.uso_categorias', 'public.uso_lugares', 'public.uso_personas', 'public.uso_formas_pago']) v
   where not has_table_privilege('authenticated', v, 'select')
      or has_table_privilege('authenticated', v, 'insert, update, delete')
      or has_table_privilege('anon', v, 'select') $$,
  'las vistas de uso son de solo lectura para authenticated y cerradas para anon');

select * from finish();
rollback;
