export interface TelemetryRecord {
  id: string;
  containerId: string;
  distanceCm: number;
  fillLevelPercent: number;
  recordedAt: string;
  /** Not provided by the current HC-SR04 telemetry schema. */
  batteryLevelPercent?: number | null;
  /** Not provided by the current HC-SR04 telemetry schema. */
  temperatureCelsius?: number | null;
}

export interface CreateTelemetryInput {
  containerId: string;
  distanceCm: number;
  fillPercentage: number;
  recordedAt?: string;
}

export type TelemetryRow = {
  id: string;
  container_id: string;
  distance_cm: number | string;
  fill_percentage: number | string;
  recorded_at: string;
};

export type TelemetryQueryResult = {
  data: TelemetryRow[] | TelemetryRow | null;
  error: { message: string } | null;
};

export type SensorServiceClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
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

const TELEMETRY_COLUMNS =
  "id, container_id, distance_cm, fill_percentage, recorded_at";

let clientOverride: SensorServiceClient | null = null;

export function setSensorServiceClient(client: SensorServiceClient | null): void {
  clientOverride = client;
}

async function getSupabaseClient(): Promise<SensorServiceClient> {
  if (clientOverride) return clientOverride;
  const { supabase } = await import("../lib/supabase");
  return supabase as unknown as SensorServiceClient;
}

function toFiniteNumber(value: number | string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field} value returned by sensor_telemetry`);
  }
  return parsed;
}

export function mapTelemetryRowToRecord(row: TelemetryRow): TelemetryRecord {
  return {
    id: row.id,
    containerId: row.container_id,
    distanceCm: toFiniteNumber(row.distance_cm, "distance_cm"),
    fillLevelPercent: toFiniteNumber(row.fill_percentage, "fill_percentage"),
    recordedAt: row.recorded_at,
  };
}

async function queryTelemetry(
  containerId: string,
  limitCount?: number,
): Promise<TelemetryQueryResult> {
  const client = await getSupabaseClient();
  const query = client
    .from("sensor_telemetry")
    .select(TELEMETRY_COLUMNS)
    .eq("container_id", containerId)
    .order("recorded_at", { ascending: false });

  return limitCount !== undefined && query.limit
    ? query.limit(limitCount)
    : query;
}

export async function getContainerTelemetry(
  containerId: string,
): Promise<TelemetryRecord[]> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) return [];

  const result = await queryTelemetry(normalizedId);
  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch telemetry for container ${normalizedId}`,
    );
  }

  return Array.isArray(result.data)
    ? result.data.map(mapTelemetryRowToRecord)
    : [];
}

export async function getLatestTelemetry(
  containerId: string,
): Promise<TelemetryRecord | null> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) return null;

  const result = await queryTelemetry(normalizedId, 1);
  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch latest telemetry for container ${normalizedId}`,
    );
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? mapTelemetryRowToRecord(row) : null;
}

export async function getTelemetryHistory(
  containerId: string,
  limitCount = 50,
): Promise<TelemetryRecord[]> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) return [];

  const safeLimit = Number.isInteger(limitCount)
    ? Math.min(Math.max(limitCount, 1), 500)
    : 50;
  const result = await queryTelemetry(normalizedId, safeLimit);
  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to fetch telemetry history for container ${normalizedId}`,
    );
  }

  return Array.isArray(result.data)
    ? result.data.map(mapTelemetryRowToRecord)
    : [];
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
    typeof input.distanceCm !== "number" ||
    !Number.isFinite(input.distanceCm) ||
    input.distanceCm < 0 ||
    input.distanceCm > 9999.99
  ) {
    throw new Error("distanceCm must be a finite number between 0 and 9999.99");
  }

  if (
    typeof input.fillPercentage !== "number" ||
    !Number.isFinite(input.fillPercentage) ||
    input.fillPercentage < 0 ||
    input.fillPercentage > 100
  ) {
    throw new Error("fillPercentage must be a finite number between 0 and 100");
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
      distance_cm: input.distanceCm,
      fill_percentage: input.fillPercentage,
      recorded_at: recordedAt,
    })
    .select(TELEMETRY_COLUMNS)
    .single();

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Failed to record telemetry for container ${normalizedContainerId}`,
    );
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("No data returned after recording telemetry");
  return mapTelemetryRowToRecord(row);
}
