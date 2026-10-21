export interface TelemetryRecord {
  id: string;
  containerId: string;
  fillLevelPercent: number;
  batteryLevelPercent: number;
  temperatureCelsius: number | null;
  recordedAt: string;
}

export type TelemetryRow = {
  id: string;
  container_id: string;
  fill_level_percent: number | string;
  battery_level_percent: number | string;
  temperature_celsius?: number | string | null;
  recorded_at: string;
};

export type TelemetryQueryResult = {
  data: TelemetryRow[] | TelemetryRow | null;
  error: { message: string } | null;
};

export type SensorServiceClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => {
          limit?: (count: number) => Promise<TelemetryQueryResult>;
          then?: (
            onfulfilled?: (value: TelemetryQueryResult) => unknown,
            onrejected?: (reason: unknown) => unknown,
          ) => Promise<unknown>;
        } & Promise<TelemetryQueryResult>;
      };
    };
  };
};

let clientOverride: SensorServiceClient | null = null;

export function setSensorServiceClient(
  client: SensorServiceClient | null,
): void {
  clientOverride = client;
}

async function getSupabaseClient(): Promise<SensorServiceClient> {
  if (clientOverride) {
    return clientOverride;
  }
  const { supabase } = await import("../lib/supabase");
  return supabase as unknown as SensorServiceClient;
}

export function mapTelemetryRowToRecord(row: TelemetryRow): TelemetryRecord {
  return {
    id: row.id,
    containerId: row.container_id,
    fillLevelPercent: Number(row.fill_level_percent),
    batteryLevelPercent: Number(row.battery_level_percent),
    temperatureCelsius:
      row.temperature_celsius !== null && row.temperature_celsius !== undefined
        ? Number(row.temperature_celsius)
        : null,
    recordedAt: row.recorded_at,
  };
}

export async function getContainerTelemetry(
  containerId: string,
): Promise<TelemetryRecord[]> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) {
    return [];
  }

  const client = await getSupabaseClient();
  const result = await client
    .from("sensor_telemetry")
    .select(
      "id, container_id, fill_level_percent, battery_level_percent, temperature_celsius, recorded_at",
    )
    .eq("container_id", normalizedId)
    .order("recorded_at", { ascending: false });

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch telemetry for container ${containerId}`,
    );
  }

  const data = result.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapTelemetryRowToRecord);
}

export async function getLatestTelemetry(
  containerId: string,
): Promise<TelemetryRecord | null> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) {
    return null;
  }

  const client = await getSupabaseClient();
  const query = client
    .from("sensor_telemetry")
    .select(
      "id, container_id, fill_level_percent, battery_level_percent, temperature_celsius, recorded_at",
    )
    .eq("container_id", normalizedId)
    .order("recorded_at", { ascending: false });

  const result = query.limit ? await query.limit(1) : await query;

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch latest telemetry for container ${containerId}`,
    );
  }

  const data = result.data;
  if (!data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return mapTelemetryRowToRecord(row);
}

export async function getTelemetryHistory(
  containerId: string,
  limitCount = 50,
): Promise<TelemetryRecord[]> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) {
    return [];
  }

  const client = await getSupabaseClient();
  const query = client
    .from("sensor_telemetry")
    .select(
      "id, container_id, fill_level_percent, battery_level_percent, temperature_celsius, recorded_at",
    )
    .eq("container_id", normalizedId)
    .order("recorded_at", { ascending: false });

  const result = query.limit ? await query.limit(limitCount) : await query;

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch telemetry history for container ${containerId}`,
    );
  }

  const data = result.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapTelemetryRowToRecord);
}


