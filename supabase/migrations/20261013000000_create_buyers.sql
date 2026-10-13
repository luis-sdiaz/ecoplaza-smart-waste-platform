begin;

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyers_name_length_check
    check (
      char_length(name) between 2 and 100
      and name = btrim(name)
    ),
  constraint buyers_email_format_check
    check (
      email is null
      or (
        char_length(email) between 3 and 254
        and email = btrim(email)
        and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  constraint buyers_phone_format_check
    check (
      phone is null
      or (
        char_length(phone) between 7 and 30
        and phone = btrim(phone)
        and phone ~ '^[0-9+(). -]+$'
      )
    )
);

comment on table public.buyers is
  'Buyers owned by an authenticated EcoPlaza user and available for future sales relationships.';

create index buyers_owner_updated_at_idx
  on public.buyers (owner_id, updated_at desc);

create function public.set_buyers_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger buyers_set_updated_at
before update on public.buyers
for each row
execute function public.set_buyers_updated_at();

alter table public.buyers enable row level security;

create policy buyers_select_own
  on public.buyers
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy buyers_insert_own
  on public.buyers
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy buyers_update_own
  on public.buyers
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on table public.buyers from anon, authenticated;
revoke all on function public.set_buyers_updated_at() from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.buyers to authenticated;
grant insert (owner_id, name, email, phone) on table public.buyers to authenticated;
grant update (name, email, phone) on table public.buyers to authenticated;

commit;
