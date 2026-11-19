-- Etapa 2 (issue #7), tarea 8: datos de arranque de cada usuario (3.11, 3.12, 3.14).
-- Son editables por el usuario; por eso se crean por usuario y no en seed.sql.
-- Íconos (Lucide) y colores según DESIGN.md §2.1 y §7 (decisión 12 de la especificación).
--
-- inicializar_usuario es idempotente:
--   - la primera vez (sin perfil) crea perfil, categorías, formas de pago y bolsas;
--   - siempre asegura las 6 categorías del sistema, de las que dependen bolsas, préstamos
--     y deudas.
-- Así, volver a llamarla no duplica nada ni revive lo que el usuario borró. El usuario del
-- proyecto real ya existe: en la Etapa 12 se llama una vez a mano para él.

create function public.inicializar_usuario(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  primera_vez boolean;
begin
  primera_vez := not exists (select 1 from public.perfiles where user_id = p_user_id);

  if primera_vez then
    insert into public.perfiles (user_id) values (p_user_id);

    insert into public.categorias (user_id, nombre, icono, color, tipo) values
      (p_user_id, 'Alimentación', 'utensils', '#b45309', 'gasto'),
      (p_user_id, 'Transporte', 'car', '#4343c8', 'gasto'),
      (p_user_id, 'Hogar', 'house', '#047857', 'gasto'),
      (p_user_id, 'Servicios públicos', 'zap', '#0e7490', 'gasto'),
      (p_user_id, 'Salud', 'heart-pulse', '#7c3aed', 'gasto'),
      (p_user_id, 'Educación', 'graduation-cap', '#4343c8', 'gasto'),
      (p_user_id, 'Entretenimiento', 'clapperboard', '#be185d', 'gasto'),
      (p_user_id, 'Ropa', 'shirt', '#be185d', 'gasto'),
      (p_user_id, 'Suscripciones', 'repeat', '#7c3aed', 'gasto'),
      (p_user_id, 'Mascotas', 'paw-print', '#92400e', 'gasto'),
      (p_user_id, 'Otros', 'ellipsis', '#3c4a42', 'gasto'),
      (p_user_id, 'Salario', 'briefcase', '#047857', 'ingreso'),
      (p_user_id, 'Extra', 'sparkles', '#047857', 'ingreso'),
      (p_user_id, 'Venta', 'tag', '#047857', 'ingreso'),
      (p_user_id, 'Otros', 'ellipsis', '#3c4a42', 'ingreso');

    with formas as (
      insert into public.formas_pago (user_id, nombre, clase) values
        (p_user_id, 'Efectivo', 'bolsa'),
        (p_user_id, 'Nequi', 'bolsa'),
        (p_user_id, 'Daviplata', 'bolsa'),
        (p_user_id, 'Débito', 'medio'),
        (p_user_id, 'Crédito', 'medio'),
        (p_user_id, 'Transferencia', 'medio'),
        (p_user_id, 'Bre-B', 'canal')
      returning id, nombre, clase
    )
    insert into public.bolsas (user_id, nombre, forma_pago_id)
    select p_user_id, nombre, id from formas where clase = 'bolsa';
  end if;

  insert into public.categorias (user_id, nombre, icono, color, tipo, clave_sistema) values
    (p_user_id, 'Gasto desconocido', 'circle-help', '#3c4a42', 'gasto', 'gasto_desconocido'),
    (p_user_id, 'Préstamo realizado', 'hand-coins', '#b45309', 'prestamo', 'prestamo_realizado'),
    (p_user_id, 'Cobro de préstamo', 'hand-coins', '#047857', 'prestamo', 'cobro_prestamo'),
    (p_user_id, 'Préstamo no recuperado', 'circle-x', '#ba1a1a', 'prestamo', 'prestamo_no_recuperado'),
    (p_user_id, 'Ingreso por préstamo', 'banknote', '#047857', 'deuda', 'ingreso_prestamo'),
    (p_user_id, 'Pago de préstamos', 'landmark', '#4343c8', 'deuda', 'pago_prestamos')
  on conflict (user_id, clave_sistema) do nothing;
end;
$$;

-- Solo la usan el trigger y un administrador; la API (anon, authenticated) no la puede
-- llamar, para que nadie cree datos a nombre de otro usuario.
revoke all on function public.inicializar_usuario(uuid) from public, anon, authenticated;

create function public.al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.inicializar_usuario(new.id);
  return new;
end;
$$;

revoke all on function public.al_crear_usuario() from public, anon, authenticated;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.al_crear_usuario();
