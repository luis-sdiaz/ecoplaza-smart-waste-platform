begin;

-- ============================================================================
-- Migración 20261104000000: Tabla de telemetría IoT para sensores EcoPlaza
-- Permite inserción desde firmware ESP32 con roles anon y authenticated.
-- ============================================================================

drop table if exists public.sensor_telemetry cascade;

create table public.sensor_telemetry (
  id uuid primary key default gen_random_uuid(),
  container_id text not null,
  distance_cm numeric(6, 2) not null,
  fill_percentage numeric(5, 2) not null,
  recorded_at timestamptz not null default now()
);

comment on table public.sensor_telemetry is
  'Lecturas periódicas de telemetría de sensores IoT (HC-SR04) para contenedores EcoPlaza.';
comment on column public.sensor_telemetry.container_id is
  'Identificador textual del contenedor (e.g., CTR-BOG-001).';
comment on column public.sensor_telemetry.distance_cm is
  'Distancia medida por el sensor ultrasónico en centímetros.';
comment on column public.sensor_telemetry.fill_percentage is
  'Porcentaje de llenado calculado para el contenedor (0.00 a 100.00).';
comment on column public.sensor_telemetry.recorded_at is
  'Marca de tiempo del registro de telemetría.';

-- Índice optimizado para búsquedas por contenedor ordenadas por fecha descendente
create index if not exists sensor_telemetry_container_recorded_idx
  on public.sensor_telemetry (container_id, recorded_at desc);

-- RLS activado
alter table public.sensor_telemetry enable row level security;

-- Políticas de seguridad RLS
create policy sensor_telemetry_insert_policy
  on public.sensor_telemetry
  for insert
  to anon, authenticated
  with check (true);

create policy sensor_telemetry_select_policy
  on public.sensor_telemetry
  for select
  to authenticated
  using (true);

-- Permisos explícitos
grant insert on table public.sensor_telemetry to anon, authenticated;
grant select on table public.sensor_telemetry to authenticated;

commit;

