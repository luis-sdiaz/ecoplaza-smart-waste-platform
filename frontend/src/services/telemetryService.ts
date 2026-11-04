export type FillStatus = "normal" | "warning" | "critical";

export interface SensorTelemetry {
  id: string;
  containerId: string;
  distanceCm: number;
  fillPercentage: number;
  recordedAt: string;
  status: FillStatus;
}

export type SensorTelemetryRow = {
  id: string;
  container_id: string;
  distance_cm: number | string;
  fill_percentage: number | string;
  recorded_at: string;
};

export type TelemetryQueryResult = {
  data: SensorTelemetryRow[] | SensorTelemetryRow | null;
  error: { message: string } | null;
};

export type TelemetryServiceClient = {
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
          limit: (count: number) => Promise<TelemetryQueryResult>;
        } & Promise<TelemetryQueryResult>;
      };
    };
  };
};

let clientOverride: TelemetryServiceClient | null = null;

export function setTelemetryServiceClient(
  client: TelemetryServiceClient | null,
): void {
  clientOverride = client;
}

async function getSupabaseClient(): Promise<TelemetryServiceClient> {
  if (clientOverride) {
    return clientOverride;
  }
  const { supabase } = await import("../lib/supabase");
  return supabase as unknown as TelemetryServiceClient;
}

/**
 * Función utilitaria de pureza:
 * Determina el estado del contenedor ('normal' | 'warning' | 'critical') según umbrales seguros:
 * - < 70% normal
 * - 70% a 89.99% warning
 * - >= 90% critical
 */
export function calculateFillStatus(fillPercentage: number): FillStatus {
  if (typeof fillPercentage !== "number" || Number.isNaN(fillPercentage)) {
    return "normal";
  }
  if (fillPercentage >= 90) {
    return "critical";
  }
  if (fillPercentage >= 70) {
    return "warning";
  }
  return "normal";
}

/**
 * Mapea una fila cruda de la base de datos (snake_case) al objeto tipado SensorTelemetry (camelCase).
 */
export function mapTelemetryRowToSensorTelemetry(
  row: SensorTelemetryRow,
): SensorTelemetry {
  const fillPercentage = Number(row.fill_percentage);
  return {
    id: row.id,
    containerId: row.container_id,
    distanceCm: Number(row.distance_cm),
    fillPercentage,
    recordedAt: row.recorded_at,
    status: calculateFillStatus(fillPercentage),
  };
}

/**
 * Consulta la última lectura de telemetría para un contenedor ordenado por 'recorded_at desc'
 * usando el cliente Supabase configurado en 'src/lib/supabase.ts'.
 */
export async function fetchLatestTelemetryByContainer(
  containerId: string,
): Promise<SensorTelemetry | null> {
  const normalizedId = containerId?.trim();
  if (!normalizedId) {
    return null;
  }

  const client = await getSupabaseClient();
  const query = client
    .from("sensor_telemetry")
    .select("id, container_id, distance_cm, fill_percentage, recorded_at")
    .eq("container_id", normalizedId)
    .order("recorded_at", { ascending: false });

  const result = query.limit ? await query.limit(1) : await query;

  if (result.error) {
    throw new Error(
      result.error.message ||
        `Error al consultar telemetría para el contenedor ${normalizedId}`,
    );
  }

  const data = result.data;
  if (!data) {
    return null;
  }

  const row: SensorTelemetryRow | undefined = Array.isArray(data)
    ? data[0]
    : data;

  if (!row) {
    return null;
  }

  return mapTelemetryRowToSensorTelemetry(row);
}

