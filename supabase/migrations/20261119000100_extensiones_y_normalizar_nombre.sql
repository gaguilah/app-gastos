-- Etapa 2 (issue #7), tarea 2: extensiones y normalización de nombres (3.9).
-- unaccent quita tildes; btree_gist permite la restricción que impide períodos solapados.
create extension if not exists unaccent with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- "  ÉXITO  Calle 80 " -> "exito calle 80". Recorta, quita tildes (también la de la ñ),
-- pasa a minúsculas y colapsa los espacios. Es immutable para poder alimentar columnas
-- generadas con restricción única; por eso se llama a unaccent con el diccionario explícito.
create function public.normalizar_nombre(texto text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, texto)),
    '\s+', ' ', 'g'))
$$;

comment on function public.normalizar_nombre(text) is
  'Nombre normalizado para comparar lugares y personas (3.9). La versión TypeScript debe dar el mismo resultado.';
