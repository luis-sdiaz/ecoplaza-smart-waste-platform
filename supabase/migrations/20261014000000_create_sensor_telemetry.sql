begin;

-- ============================================================================
-- Sensor Telemetry for EcoPlaza IoT hardware
-- Stores periodic readings from ESP32 devices measuring fill level,
-- battery status, and ambient/internal temperature for waste containers.
-- ============================================================================

create table public.sensor_telemetry (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.containers (id) on delete cascade,
  fill_level_percent integer not null,
  battery_level_percent integer not null,
  temperature_celsius numeric,
  recorded_at timestamptz not null default now(),
  constraint sensor_telemetry_fill_level_check
    check (fill_level_percent between 0 and 100),
  constraint sensor_telemetry_battery_level_check
    check (battery_level_percent between 0 and 100)
);

comment on table public.sensor_telemetry is
  'IoT hardware telemetry readings (fill level, battery, temperature) for waste containers.';
comment on column public.sensor_telemetry.container_id is
  'Foreign key referencing the monitored waste container in public.containers.';
comment on column public.sensor_telemetry.fill_level_percent is
  'Current fill percentage of the container (0 to 100).';
comment on column public.sensor_telemetry.battery_level_percent is
  'Hardware battery charge percentage (0 to 100).';
comment on column public.sensor_telemetry.temperature_celsius is
  'Optional temperature reading in degrees Celsius.';
comment on column public.sensor_telemetry.recorded_at is
  'Timestamp when the telemetry reading was captured.';

-- Indexes for optimal lookup performance:
-- 1. By container and recorded_at descending (for historical timeseries and latest state)
create index sensor_telemetry_container_recorded_at_idx
  on public.sensor_telemetry (container_id, recorded_at desc);

-- 2. By recorded_at descending (for global or cleanup queries)
create index sensor_telemetry_recorded_at_idx
  on public.sensor_telemetry (recorded_at desc);

-- Enable Row Level Security (RLS)
alter table public.sensor_telemetry enable row level security;

-- RLS Policy: Select
-- Authenticated users can only read telemetry of containers they own
create policy sensor_telemetry_select_own
  on public.sensor_telemetry
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.containers
      where containers.id = sensor_telemetry.container_id
        and containers.owner_id = (select auth.uid())
    )
  );

-- RLS Policy: Insert
-- Allows telemetry insertion for existing containers.
-- Note: Intended for ESP32 devices via Service Role or Edge Functions / Webhooks,
-- but kept open to authenticated users temporarily for development simplicity.
create policy sensor_telemetry_insert_authenticated
  on public.sensor_telemetry
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.containers
      where containers.id = sensor_telemetry.container_id
    )
  );

-- Privileges
revoke all on table public.sensor_telemetry from anon, authenticated;

grant select, insert on table public.sensor_telemetry to authenticated;

commit;

