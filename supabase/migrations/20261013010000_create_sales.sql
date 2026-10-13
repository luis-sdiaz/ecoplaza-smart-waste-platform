begin;

-- Sales preserve the owner relationship in every foreign key so a buyer and
-- waste record from different accounts can never be combined.
alter table public.buyers
  add constraint buyers_id_owner_key unique (id, owner_id);

alter table public.waste_records
  add constraint waste_records_id_owner_key unique (id, owner_id);

alter table public.waste_records
  drop constraint waste_records_status_check;

alter table public.waste_records
  add constraint waste_records_status_check
    check (status in ('available', 'registered', 'sold'));

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  buyer_id uuid not null,
  waste_record_id uuid not null,
  weight_kg numeric not null,
  unit_price numeric not null,
  total_value numeric generated always as (weight_kg * unit_price) stored,
  sold_at timestamptz not null default now(),
  constraint sales_owner_buyer_fkey
    foreign key (buyer_id, owner_id)
    references public.buyers (id, owner_id)
    on update restrict
    on delete restrict,
  constraint sales_owner_waste_record_fkey
    foreign key (waste_record_id, owner_id)
    references public.waste_records (id, owner_id)
    on update restrict
    on delete restrict,
  constraint sales_waste_record_key unique (waste_record_id),
  constraint sales_weight_positive_check
    check (
      weight_kg > 0
      and weight_kg < 'Infinity'::numeric
      and weight_kg <> 'NaN'::numeric
    ),
  constraint sales_unit_price_positive_check
    check (
      unit_price > 0
      and unit_price < 'Infinity'::numeric
      and unit_price <> 'NaN'::numeric
    ),
  constraint sales_total_value_positive_check
    check (
      total_value > 0
      and total_value < 'Infinity'::numeric
      and total_value <> 'NaN'::numeric
    )
);

comment on table public.sales is
  'Completed full-record waste sales created exclusively through create_sale.';
comment on column public.sales.weight_kg is
  'Immutable snapshot of the complete waste record weight at the time of sale.';
comment on column public.sales.unit_price is
  'Explicit price per kilogram supplied for this sale; no automatic pricing is applied.';
comment on column public.sales.total_value is
  'Database-generated product of weight_kg and unit_price.';

create index sales_owner_sold_at_idx
  on public.sales (owner_id, sold_at desc);

create index sales_buyer_id_idx
  on public.sales (buyer_id);

alter table public.sales enable row level security;

create policy sales_select_own
  on public.sales
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- The RPC locks the waste row, validates ownership and availability, inserts
-- the sale, and retires the waste record as one PostgreSQL transaction.
create function public.create_sale(
  p_buyer_id uuid,
  p_waste_record_id uuid,
  p_unit_price numeric
)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_weight_kg numeric;
  v_waste_status text;
  v_sale public.sales;
begin
  v_owner_id := auth.uid();

  if v_owner_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if p_buyer_id is null then
    raise exception 'buyer_not_available'
      using errcode = 'P0002';
  end if;

  if p_waste_record_id is null then
    raise exception 'waste_record_not_available'
      using errcode = 'P0002';
  end if;

  if
    p_unit_price is null
    or p_unit_price <= 0
    or p_unit_price >= 'Infinity'::numeric
    or p_unit_price = 'NaN'::numeric
  then
    raise exception 'invalid_unit_price'
      using errcode = '22023';
  end if;

  perform 1
  from public.buyers as buyer
  where buyer.id = p_buyer_id
    and buyer.owner_id = v_owner_id;

  if not found then
    raise exception 'buyer_not_available'
      using errcode = 'P0002';
  end if;

  select waste.weight_kg, waste.status
  into v_weight_kg, v_waste_status
  from public.waste_records as waste
  where waste.id = p_waste_record_id
    and waste.owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'waste_record_not_available'
      using errcode = 'P0002';
  end if;

  if v_waste_status <> 'available' then
    raise exception 'waste_record_not_available'
      using errcode = 'P0001';
  end if;

  if
    v_weight_kg <= 0
    or v_weight_kg >= 'Infinity'::numeric
    or v_weight_kg = 'NaN'::numeric
  then
    raise exception 'invalid_waste_weight'
      using errcode = '23514';
  end if;

  insert into public.sales (
    owner_id,
    buyer_id,
    waste_record_id,
    weight_kg,
    unit_price
  )
  values (
    v_owner_id,
    p_buyer_id,
    p_waste_record_id,
    v_weight_kg,
    p_unit_price
  )
  returning * into v_sale;

  update public.waste_records
  set status = 'sold'
  where id = p_waste_record_id
    and owner_id = v_owner_id
    and status = 'available';

  if not found then
    raise exception 'waste_record_not_available'
      using errcode = 'P0001';
  end if;

  return v_sale;
end;
$$;

-- Authenticated clients may read their own sales, but cannot insert, update,
-- or delete sale rows directly. Creation is available only through the RPC.
revoke all on table public.sales from anon, authenticated;
revoke all on function public.create_sale(uuid, uuid, numeric)
  from public, anon, authenticated;

-- Prevent clients from marking waste as sold outside the transactional RPC.
revoke update on table public.waste_records from authenticated;

grant usage on schema public to authenticated;
grant select on table public.sales to authenticated;
grant execute on function public.create_sale(uuid, uuid, numeric)
  to authenticated;

commit;
