-- Applicants must only be able to create their own application as 'pending'
-- with an empty admin checklist (policy promoter_applications_owner_insert,
-- migration 0030). Some databases still have an older policy, made by hand
-- in the Supabase dashboard, that allowed any insert; Postgres combines
-- policies with OR, so it overrode the strict one. Drop every policy on
-- promoter_applications that can allow inserts, except the two we manage.
--
-- Safe to re-run; does nothing where no extra policy exists.

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promoter_applications'
      and cmd in ('INSERT', 'ALL')
      and policyname not in ('promoter_applications_owner_insert', 'promoter_applications_admin_all')
  loop
    execute format('drop policy %I on promoter_applications', p.policyname);
    raise notice 'Dropped policy %', p.policyname;
  end loop;
end $$;

notify pgrst, 'reload schema';
