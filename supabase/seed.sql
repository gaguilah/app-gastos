-- Semilla de desarrollo y pruebas locales. Solo datos inventados, nunca datos reales ni de tarjetas.
-- Nunca se aplica al proyecto Supabase real.
--
-- Usuarios de prueba para iniciar sesión en local (contraseña: prueba-local-123).
-- Sus datos de arranque (perfil, categorías, formas de pago y bolsas) los crea el trigger
-- al_crear_usuario. Los correos e ids no coinciden con los de las pruebas pgTAP, que crean
-- sus propios usuarios dentro de una transacción.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'usuario-a@prueba.local', extensions.crypt('prueba-local-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'usuario-b@prueba.local', extensions.crypt('prueba-local-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- Un usuario por proyecto de Playwright para la E2E de recuperación de contraseña:
-- cada corrida le cambia la contraseña y así no choca con los demás ni con el login.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', id::uuid, 'authenticated', 'authenticated',
       'recuperar-' || proyecto || '@prueba.local', extensions.crypt('prueba-local-123', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from (values ('33333333-3333-3333-3333-333333333301', 'movil'),
               ('33333333-3333-3333-3333-333333333302', 'movil-android'),
               ('33333333-3333-3333-3333-333333333303', 'tablet'),
               ('33333333-3333-3333-3333-333333333304', 'computador')) as u (id, proyecto);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u
 where u.email like '%@prueba.local';

-- Datos inventados del usuario A: un período, un lugar, un gasto y su salario (2.000.000 al presupuesto).
insert into public.periodos (user_id, fecha_inicio, fecha_fin)
values ('11111111-1111-1111-1111-111111111111', '2026-11-01', '2026-11-30');

insert into public.lugares (user_id, nombre)
values ('11111111-1111-1111-1111-111111111111', 'Tienda de la esquina');

insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, lugar_id, bolsa_id)
select '11111111-1111-1111-1111-111111111111', 'Mercado de la semana', '2026-11-03', 85000,
       (select id from public.categorias where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Alimentación'),
       (select id from public.lugares where user_id = '11111111-1111-1111-1111-111111111111'),
       (select id from public.bolsas where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Efectivo');

insert into public.ingresos (user_id, titulo, fecha, valor, es_salario, monto_presupuesto, categoria_id)
select '11111111-1111-1111-1111-111111111111', 'Salario de noviembre', '2026-11-01', 3500000, true, 2000000,
       (select id from public.categorias where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Salario');

-- Etapa 6A: octubre cerrado para probar el cierre (salario 4.000.000 con 3.000.000 al presupuesto,
-- gastado 2.500.000 con Débito, sin bolsa): sobrante del salario 1.000.000 y del presupuesto 500.000.
insert into public.periodos (user_id, fecha_inicio, fecha_fin)
values ('11111111-1111-1111-1111-111111111111', '2026-10-01', '2026-10-31');

insert into public.ingresos (user_id, titulo, fecha, valor, es_salario, monto_presupuesto, categoria_id)
select '11111111-1111-1111-1111-111111111111', 'Salario de octubre', '2026-10-01', 4000000, true, 3000000,
       (select id from public.categorias where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Salario');

insert into public.gastos (user_id, titulo, fecha, valor, categoria_id, medio_id)
select '11111111-1111-1111-1111-111111111111', 'Gastos de octubre', '2026-10-15', 2500000,
       (select id from public.categorias where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Alimentación'),
       (select id from public.formas_pago where user_id = '11111111-1111-1111-1111-111111111111' and nombre = 'Débito');

select public.cerrar_periodos_de('11111111-1111-1111-1111-111111111111', '2026-11-01');
