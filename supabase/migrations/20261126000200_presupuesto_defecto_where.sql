-- Etapa 6 · Corrección: la API de Supabase carga safeupdate, que rechaza un UPDATE sin WHERE
-- («UPDATE requires a WHERE clause»). cambiar_presupuesto_defecto actualizaba perfiles sin
-- filtro (RLS ya lo limitaba a quien llama); ahora filtra por auth.uid().
-- create or replace conserva los permisos de la función.
create or replace function public.cambiar_presupuesto_defecto(
  p_valor bigint,
  p_actual boolean default false,
  p_hoy date default public.hoy_bogota()
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_valor is null or p_valor < 0 then
    raise exception 'presupuesto.valor_invalido' using errcode = 'P0001';
  end if;
  update public.perfiles set presupuesto_defecto = p_valor where user_id = (select auth.uid());
  if p_actual then
    update public.periodos set presupuesto = p_valor
     where p_hoy between fecha_inicio and fecha_fin and cerrado_at is null;
  end if;
end;
$$;
