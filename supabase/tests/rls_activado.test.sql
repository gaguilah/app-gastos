-- Guardia: ninguna tabla del esquema public puede existir sin RLS (CLAUDE.md, "Reglas que nunca se rompen").
begin;
select plan(2);

select is_empty(
  $$ select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not c.relrowsecurity $$,
  'toda tabla del esquema public tiene RLS activado'
);

select is_empty(
  $$ select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and c.relrowsecurity
        and not exists (select 1 from pg_policy p where p.polrelid = c.oid) $$,
  'toda tabla del esquema public con RLS tiene al menos una política'
);

select * from finish();
rollback;
