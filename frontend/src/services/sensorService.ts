export interface TelemetryRecord {
  id: string;
  containerId: string;
  fillLevelPercent: number;
  batteryLevelPercent: number;
  temperatureCelsius: number | null;
  recordedAt: string;
}

export interface CreateTelemetryInput {
  containerId: string;
  fillLevel: number;
  batteryLevel: number;
  temperature?: number | null;
  recordedAt?: string;
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
    insert?: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
      select: (columns?: string) => {
        single: () => Promise<TelemetryQueryResult>;
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

export async function recordTelemetry(
  input: CreateTelemetryInput,
): Promise<TelemetryRecord> {
  const normalizedContainerId =
    typeof input?.containerId === "string" ? input.containerId.trim() : "";
  if (!normalizedContainerId) {
    throw new Error("containerId must be a non-empty string");
  }

  if (
    typeof input.fillLevel !== "number" ||
    !Number.isFinite(input.fillLevel) ||
    input.fillLevel < 0 ||
    input.fillLevel > 100
  ) {
    throw new Error("fillLevel must be a finite number between 0 and 100");
  }

  if (
    typeof input.batteryLevel !== "number" ||
    !Number.isFinite(input.batteryLevel) ||
    input.batteryLevel < 0 ||
    input.batteryLevel > 100
  ) {
    throw new Error("batteryLevel must be a finite number between 0 and 100");
  }

  if (input.temperature !== undefined && input.temperature !== null) {
    if (
      typeof input.temperature !== "number" ||
      !Number.isFinite(input.temperature) ||
      input.temperature < -50 ||
      input.temperature > 100
    ) {
      throw new Error(
        "temperature must be a finite number between -50 and 100 °C",
      );
    }
  }

  const recordedAt =
    typeof input.recordedAt === "string" && input.recordedAt.trim()
      ? input.recordedAt.trim()
      : new Date().toISOString();

  const client = await getSupabaseClient();
  const table = client.from("sensor_telemetry");
  if (!table.insert) {
    throw new Error("Database client does not support insert operation");
  }

  const result = await table
    .insert({
      container_id: normalizedContainerId,
      fill_level_percent: input.fillLevel,
      battery_level_percent: input.batteryLevel,
      temperature_celsius: input.temperature ?? null,
      recorded_at: recordedAt,
    })
    .select(
      "id, container_id, fill_level_percent, battery_level_percent, temperature_celsius, recorded_at",
    )
    .single();

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to record telemetry for container ${normalizedContainerId}`,
    );
  }

  if (!result.data) {
    throw new Error("No data returned after recording telemetry");
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) {
    throw new Error("Empty row returned after recording telemetry");
  }

  return mapTelemetryRowToRecord(row as TelemetryRow);
}


