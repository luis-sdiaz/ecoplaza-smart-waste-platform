begin;

-- EcoPlaza's application users are managed by Supabase Auth. This table only
-- stores editable profile data; credentials and email remain in auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_full_name_length_check
    check (char_length(btrim(full_name)) between 2 and 60),
  constraint profiles_avatar_url_not_blank_check
    check (avatar_url is null or btrim(avatar_url) <> '')
);

comment on table public.profiles is
  'Application profile data for a Supabase Auth user. Authentication data remains in auth.users.';

-- A container has a private UUID for relationships and a short, owner-scoped
-- code compatible with the current frontend values (for example, container01).
create table public.containers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  constraint containers_code_not_blank_check
    check (btrim(code) <> ''),
  constraint containers_owner_code_key unique (owner_id, code),
  constraint containers_id_owner_key unique (id, owner_id)
);

comment on table public.containers is
  'Waste containers owned by an authenticated EcoPlaza user.';

-- record_number is concurrency-safe and is reserved for presentation codes
-- such as RES-001. The UUID remains the stable identifier used in relations.
create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  record_number bigint generated always as identity,
  owner_id uuid not null references auth.users (id) on delete cascade,
  container_id uuid not null,
  category text not null,
  weight_kg numeric not null,
  registered_at timestamptz not null default now(),
  status text not null default 'available',
  constraint waste_records_record_number_key unique (record_number),
  constraint waste_records_owner_container_fkey
    foreign key (container_id, owner_id)
    references public.containers (id, owner_id)
    on update restrict
    on delete restrict,
  constraint waste_records_category_check
    check (category in ('organic', 'recyclable', 'nonRecyclable')),
  constraint waste_records_weight_positive_check
    check (
      weight_kg > 0
      and weight_kg < 'Infinity'::numeric
    ),
  constraint waste_records_status_check
    check (status in ('available', 'registered'))
);

comment on table public.waste_records is
  'Waste registrations. record_number can be formatted as RES- plus a zero-padded number for display.';
comment on column public.waste_records.record_number is
  'Concurrency-safe global presentation sequence; never calculate this value with row counts or MAX(id).';
comment on column public.waste_records.weight_kg is
  'Waste weight in kilograms.';

create index waste_records_owner_registered_at_idx
  on public.waste_records (owner_id, registered_at desc);

create index waste_records_container_id_idx
  on public.waste_records (container_id);

alter table public.profiles enable row level security;
alter table public.containers enable row level security;
alter table public.waste_records enable row level security;

-- Profiles: a signed-in user can only read and maintain their own row.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_delete_own
  on public.profiles
  for delete
  to authenticated
  using (id = (select auth.uid()));

-- Containers: ownership comes from the verified JWT, never from a public code.
create policy containers_select_own
  on public.containers
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy containers_insert_own
  on public.containers
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy containers_update_own
  on public.containers
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy containers_delete_own
  on public.containers
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Waste records: the composite foreign key guarantees that container_id and
-- owner_id always belong to the same user. The EXISTS checks repeat that rule
-- at the authorization boundary for defense in depth.
create policy waste_records_select_own
  on public.waste_records
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy waste_records_insert_own
  on public.waste_records
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.containers
      where containers.id = waste_records.container_id
        and containers.owner_id = (select auth.uid())
    )
  );

create policy waste_records_update_own
  on public.waste_records
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.containers
      where containers.id = waste_records.container_id
        and containers.owner_id = (select auth.uid())
    )
  );

create policy waste_records_delete_own
  on public.waste_records
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Automatic grants are disabled for this Supabase project. Reset any existing
-- application-role privileges before granting only the table operations that
-- the authenticated Data API needs. Identity generation does not require the
-- application roles to have privileges on the implicit sequence.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.containers from anon, authenticated;
revoke all on table public.waste_records from anon, authenticated;
revoke all on sequence public.waste_records_record_number_seq from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.containers to authenticated;
grant select, insert, update, delete on table public.waste_records to authenticated;

commit;
