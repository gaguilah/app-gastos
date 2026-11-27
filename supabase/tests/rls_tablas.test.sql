-- RLS en todas las tablas de usuario (CLAUDE.md, "Reglas que nunca se rompen").
-- Para cada tabla, el usuario B no ve, crea, edita ni borra filas de A; un anónimo no ve
-- nada; y B no puede apuntar a datos de A desde sus propias filas. Etapa 2, issue #7.
begin;
select plan(109);

-- Las 20 tablas de usuario (pares_distintos desde la Etapa 5). La prueba 1 exige que la lista esté completa.
create schema tests;
create function tests.tablas() returns setof text language sql immutable as $$
  select unnest(array[
    'perfiles', 'periodos', 'categorias', 'formas_pago', 'bolsas', 'movimientos_bolsa',
    'lugares', 'personas', 'reglas_periodicas', 'prestamos', 'deudas', 'cuotas_deuda',
    'abonos_deuda', 'gastos', 'ingresos', 'alertas_enviadas', 'suscripciones_push',
    'metas_ahorro', 'reglas_aporte', 'pares_distintos'
  ])
$$;
-- Filas de un usuario que puede ver el rol actual (respeta RLS: security invoker).
create function tests.filas_de(tabla text, usuario uuid) returns int language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from public.%I where user_id = $1', tabla) into n using usuario;
  return n;
exception when insufficient_privilege then
  return 0; -- sin permiso tampoco ve nada
end;
$$;
-- Filas que el rol actual logra cambiar o borrar de un usuario.
create function tests.afectadas(operacion text, tabla text, usuario uuid) returns int language plpgsql as $$
declare n int;
begin
  if operacion = 'update' then
    execute format('with x as (update public.%I set created_at = created_at where user_id = $1 returning 1) select count(*) from x', tabla)
      into n using usuario;
  else
    execute format('with x as (delete from public.%I where user_id = $1 returning 1) select count(*) from x', tabla)
      into n using usuario;
  end if;
  return n;
end;
$$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

select set_eq(
  $$ select tablename::text from pg_tables where schemaname = 'public' $$,
  $$ select distinct t from tests.tablas() t $$,
  'la lista de la prueba cubre todas las tablas de public');

-- A y B (el trigger les crea perfil, categorías, formas de pago y bolsas).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@prueba.local');

-- Al menos una fila de A en cada tabla.
select lives_ok($$
  insert into public.lugares (id, user_id, nombre) values
    ('00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Lugar de A');
  insert into public.personas (id, user_id, nombre, tipo) values
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Persona de A', 'persona');
  insert into public.periodos (id, user_id, fecha_inicio, fecha_fin) values
    ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-0000000000a1', '2026-03-01', '2026-03-31');
  insert into public.alertas_enviadas (user_id, periodo_id, umbral) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0009-000000000001', 70);
  insert into public.bolsas (id, user_id, nombre) values
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Bolsa de la meta de A');
  insert into public.metas_ahorro (id, user_id, nombre, monto_meta, fecha_final, bolsa_id) values
    ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Meta de A', 1000000, '2027-01-31',
     '00000000-0000-0000-0003-000000000002');
  insert into public.reglas_aporte (user_id, meta_id, valor, frecuencia, dia, bolsa_id, proxima_fecha)
  select '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0007-000000000001', 100000, 'mensual', 15, b.id, '2026-03-15'
    from public.bolsas b where b.user_id = '00000000-0000-0000-0000-0000000000a1' and b.nombre = 'Efectivo';
  insert into public.movimientos_bolsa (user_id, bolsa_id, tipo, sentido, fecha, valor)
  select '00000000-0000-0000-0000-0000000000a1', b.id, 'recarga', 'entrada', '2026-03-02', 50000
    from public.bolsas b where b.user_id = '00000000-0000-0000-0000-0000000000a1' and b.nombre = 'Efectivo';
  insert into public.reglas_periodicas (user_id, titulo, valor, categoria_id, bolsa_id, frecuencia, fecha_inicio, proxima_fecha)
  select '00000000-0000-0000-0000-0000000000a1', 'Internet', 90000, c.id, b.id, 'mensual', '2026-03-05', '2026-03-05'
    from public.categorias c, public.bolsas b
   where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre = 'Servicios públicos'
     and b.user_id = '00000000-0000-0000-0000-0000000000a1' and b.nombre = 'Efectivo';
  insert into public.prestamos (id, user_id, persona_id, monto, fecha) values
    ('00000000-0000-0000-0011-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0004-000000000001', 50000, '2026-03-03');
  insert into public.deudas (id, user_id, persona_id, categoria_id, total_pagar, num_cuotas, valor_cuota, dia_pago, medio_id)
  select '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0004-000000000001',
         c.id, 600000, 6, 100000, 5, f.id
    from public.categorias c, public.formas_pago f
   where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.clave_sistema = 'pago_prestamos'
     and f.user_id = '00000000-0000-0000-0000-0000000000a1' and f.nombre = 'Débito';
  insert into public.cuotas_deuda (user_id, deuda_id, numero, fecha, valor) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0006-000000000001', 1, '2026-03-05', 100000);
  insert into public.abonos_deuda (user_id, deuda_id, fecha, valor) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0006-000000000001', '2026-03-10', 50000);
  insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, bolsa_id)
  select '00000000-0000-0000-0000-0000000000a1', 'Mercado', '2026-03-02', 40000, c.id, b.id
    from public.categorias c, public.bolsas b
   where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre = 'Alimentación'
     and b.user_id = '00000000-0000-0000-0000-0000000000a1' and b.nombre = 'Efectivo';
  insert into public.ingresos (user_id, titulo, fecha, valor, categoria_id)
  select '00000000-0000-0000-0000-0000000000a1', 'Salario', '2026-03-01', 3000000, c.id
    from public.categorias c where c.user_id = '00000000-0000-0000-0000-0000000000a1' and c.nombre = 'Salario';
  insert into public.suscripciones_push (user_id, dispositivo, endpoint, claves) values
    ('00000000-0000-0000-0000-0000000000a1', 'Celular de prueba', 'https://push.prueba.local/a', '{"p256dh":"x","auth":"y"}');
  insert into public.pares_distintos (user_id, entidad, a_id, b_id) values
    ('00000000-0000-0000-0000-0000000000a1', 'lugar', '00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0010-000000000002');
$$, 'montaje: A tiene filas en todas las tablas');

select is_empty(
  $$ select t from tests.tablas() t where tests.filas_de(t, '00000000-0000-0000-0000-0000000000a1') = 0 $$,
  'como superusuario, A tiene al menos una fila en cada tabla');

-- ---------------------------------------------------------------- como B
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(tests.filas_de(t, '00000000-0000-0000-0000-0000000000a1'), 0, format('B no ve filas de A en %s', t))
  from tests.tablas() t;
select throws_ok(format('insert into public.%I (user_id) values (%L)', t, '00000000-0000-0000-0000-0000000000a1'),
                 '42501', null, format('B no puede crear filas a nombre de A en %s', t))
  from tests.tablas() t;
select is(tests.afectadas('update', t, '00000000-0000-0000-0000-0000000000a1'), 0, format('B no edita filas de A en %s', t))
  from tests.tablas() t;
select is(tests.afectadas('delete', t, '00000000-0000-0000-0000-0000000000a1'), 0, format('B no borra filas de A en %s', t))
  from tests.tablas() t;

-- Relaciones cruzadas: B, con su propio user_id, no puede apuntar a datos de A.
reset role;
create temp table ids_a as
select
  (select id from public.categorias where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Alimentación') as categoria,
  (select id from public.bolsas where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Efectivo') as bolsa,
  (select id from public.formas_pago where user_id = '00000000-0000-0000-0000-0000000000a1' and nombre = 'Débito') as medio,
  (select id from public.categorias where user_id = '00000000-0000-0000-0000-0000000000b2' and nombre = 'Alimentación') as categoria_b,
  (select id from public.bolsas where user_id = '00000000-0000-0000-0000-0000000000b2' and nombre = 'Efectivo') as bolsa_b;
grant select on ids_a to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select throws_ok(format($$ insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id) values ('x', '2026-03-02', 1, %L, %L) $$,
                        (select categoria from ids_a), (select bolsa_b from ids_a)),
  '23503', null, 'B no puede usar una categoría de A en su gasto');
select throws_ok(format($$ insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id) values ('x', '2026-03-02', 1, %L, %L) $$,
                        (select categoria_b from ids_a), (select bolsa from ids_a)),
  '23503', null, 'B no puede gastar desde una bolsa de A');
select throws_ok(format($$ insert into public.gastos (titulo, fecha, valor, categoria_id, medio_id) values ('x', '2026-03-02', 1, %L, %L) $$,
                        (select categoria_b from ids_a), (select medio from ids_a)),
  '23503', null, 'B no puede pagar con una forma de pago de A');
select throws_ok(format($$ insert into public.gastos (titulo, fecha, valor, categoria_id, bolsa_id, lugar_id) values ('x', '2026-03-02', 1, %L, %L, %L) $$,
                        (select categoria_b from ids_a), (select bolsa_b from ids_a), '00000000-0000-0000-0010-000000000001'),
  '23503', null, 'B no puede usar un lugar de A');
select throws_ok($$ insert into public.prestamos (persona_id, monto, fecha)
                    values ('00000000-0000-0000-0004-000000000001', 1, '2026-03-02') $$,
  '23503', null, 'B no puede prestarle a una persona de A');
select throws_ok(format($$ insert into public.movimientos_bolsa (bolsa_id, tipo, sentido, fecha, valor, meta_id) values (%L, 'aporte', 'salida', '2026-03-02', 1, %L) $$,
                        (select bolsa_b from ids_a), '00000000-0000-0000-0007-000000000001'),
  '23503', null, 'B no puede aportar a una meta de A');

-- ---------------------------------------------------------------- como anónimo
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(tests.filas_de(t, '00000000-0000-0000-0000-0000000000a1'), 0, format('un anónimo no ve filas en %s', t))
  from tests.tablas() t;

select * from finish();
rollback;
