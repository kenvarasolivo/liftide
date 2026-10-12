-- Enable Neon Auth first, then run this in the Neon SQL editor for that branch.
-- Credentials and account lifecycle are managed by Neon Auth.
-- Match the branch's managed Auth ID type (text or uuid) for a valid FK.
do $$
declare user_id_type text;
begin
  select format_type(atttypid, atttypmod) into user_id_type
  from pg_attribute where attrelid = to_regclass('neon_auth."user"') and attname = 'id' and not attisdropped;
  if user_id_type is null then raise exception 'Enable Neon Auth on this branch before running this migration'; end if;
  execute format($table$
create table public.training_state (
  user_id %s primary key references neon_auth."user"(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint valid_training_data check (
    jsonb_typeof(data) = 'object'
    and data ?& array['version', 'history', 'customMachines']
    and data->>'version' = '2'
    and jsonb_typeof(data->'history') = 'array'
    and jsonb_typeof(data->'customMachines') = 'array'
    and octet_length(data::text) <= 5000000
  )
);$table$, user_id_type);
end;
$$;
-- This table is accessed through the authenticated Next.js API, never a browser
-- Postgres connection or public Data API. The API scopes every query to the
-- verified Neon Auth session's user ID. No caller-supplied user ID is accepted.
alter table public.training_state enable row level security;
revoke all on public.training_state from public;
-- DATABASE_URL must use the table owner (normally the Neon project's neondb_owner).
-- Owner connections bypass RLS; no public/anonymous RLS policies are created.
