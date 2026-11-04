import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFillStatus,
  fetchLatestTelemetryByContainer,
  mapTelemetryRowToSensorTelemetry,
  setTelemetryServiceClient,
  type SensorTelemetryRow,
  type TelemetryQueryResult,
  type TelemetryServiceClient,
} from "../src/services/telemetryService.ts";

function createMockSupabaseClient(
  data: SensorTelemetryRow[] | SensorTelemetryRow | null,
  error: { message: string } | null = null,
  options?: {
    expectedContainerId?: string;
    onQuery?: (params: { table: string; columns: string; containerId: string; orderColumn: string; ascending: boolean }) => void;
  },
): TelemetryServiceClient {
  return {
    from: (table: string) => {
      assert.equal(table, "sensor_telemetry");
      return {
        select: (columns: string) => {
          assert.match(columns, /container_id/);
          assert.match(columns, /distance_cm/);
          assert.match(columns, /fill_percentage/);
          assert.match(columns, /recorded_at/);

          return {
            eq: (column: string, value: string) => {
              assert.equal(column, "container_id");
              if (options?.expectedContainerId) {
                assert.equal(value, options.expectedContainerId);
              }

              return {
                order: (orderColumn: string, orderOptions: { ascending: boolean }) => {
                  assert.equal(orderColumn, "recorded_at");
                  assert.equal(orderOptions.ascending, false);

                  options?.onQuery?.({
                    table,
                    columns,
                    containerId: value,
                    orderColumn,
                    ascending: orderOptions.ascending,
                  });

                  const queryResult: TelemetryQueryResult = { data, error };
                  const promise = Promise.resolve(queryResult);

                  return Object.assign(promise, {
                    limit: (count: number) => {
                      assert.equal(count, 1);
                      return Promise.resolve(queryResult);
                    },
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

test("calculateFillStatus: calcula umbrales de severidad (< 70% normal, 70-89% warning, >= 90% critical)", () => {
  // Umbrales normales (< 70%)
  assert.equal(calculateFillStatus(0), "normal");
  assert.equal(calculateFillStatus(45.5), "normal");
  assert.equal(calculateFillStatus(69.9), "normal");

  // Umbrales de advertencia (70% a 89.99%)
  assert.equal(calculateFillStatus(70), "warning");
  assert.equal(calculateFillStatus(75.2), "warning");
  assert.equal(calculateFillStatus(89), "warning");
  assert.equal(calculateFillStatus(89.99), "warning");

  // Umbrales críticos (>= 90%)
  assert.equal(calculateFillStatus(90), "critical");
  assert.equal(calculateFillStatus(95), "critical");
  assert.equal(calculateFillStatus(100), "critical");

  // Casos límite y resiliencia
  assert.equal(calculateFillStatus(-10), "normal");
  assert.equal(calculateFillStatus(Number.NaN), "normal");
  assert.equal(calculateFillStatus(undefined as unknown as number), "normal");
});

test("mapTelemetryRowToSensorTelemetry: convierte tipos de base de datos a SensorTelemetry tipado", () => {
  const row: SensorTelemetryRow = {
    id: "f3c3a4d9-81bc-4e4b-a912-3486ec2d2b51",
    container_id: "CTR-BOG-001",
    distance_cm: "24.50",
    fill_percentage: "75.50",
    recorded_at: "2026-11-04T16:00:00.000Z",
  };

  const telemetry = mapTelemetryRowToSensorTelemetry(row);

  assert.equal(telemetry.id, "f3c3a4d9-81bc-4e4b-a912-3486ec2d2b51");
  assert.equal(telemetry.containerId, "CTR-BOG-001");
  assert.equal(telemetry.distanceCm, 24.5);
  assert.equal(telemetry.fillPercentage, 75.5);
  assert.equal(telemetry.recordedAt, "2026-11-04T16:00:00.000Z");
  assert.equal(telemetry.status, "warning");
});

test("fetchLatestTelemetryByContainer: retorna null si containerId está vacío o es solo espacios", async () => {
  let clientCalled = false;
  setTelemetryServiceClient({
    from: () => {
      clientCalled = true;
      throw new Error("No debe llamar a Supabase");
    },
  } as unknown as TelemetryServiceClient);

  try {
    assert.equal(await fetchLatestTelemetryByContainer(""), null);
    assert.equal(await fetchLatestTelemetryByContainer("   "), null);
    assert.equal(await fetchLatestTelemetryByContainer(null as unknown as string), null);
    assert.equal(clientCalled, false);
  } finally {
    setTelemetryServiceClient(null);
  }
});

test("fetchLatestTelemetryByContainer: consulta y mapea exitosamente la última lectura (formato array)", async () => {
  const mockRow: SensorTelemetryRow = {
    id: "uuid-telem-101",
    container_id: "CTR-BOG-001",
    distance_cm: 12.34,
    fill_percentage: 92.0,
    recorded_at: "2026-11-04T16:15:00.000Z",
  };

  let queryVerified = false;
  const mockClient = createMockSupabaseClient([mockRow], null, {
    expectedContainerId: "CTR-BOG-001",
    onQuery: () => {
      queryVerified = true;
    },
  });

  setTelemetryServiceClient(mockClient);

  try {
    const result = await fetchLatestTelemetryByContainer("  CTR-BOG-001  ");
    assert.equal(queryVerified, true);
    assert.ok(result);
    assert.equal(result.id, "uuid-telem-101");
    assert.equal(result.containerId, "CTR-BOG-001");
    assert.equal(result.distanceCm, 12.34);
    assert.equal(result.fillPercentage, 92.0);
    assert.equal(result.status, "critical");
    assert.equal(result.recordedAt, "2026-11-04T16:15:00.000Z");
  } finally {
    setTelemetryServiceClient(null);
  }
});

test("fetchLatestTelemetryByContainer: soporta retorno de fila única directa", async () => {
  const mockRow: SensorTelemetryRow = {
    id: "uuid-telem-102",
    container_id: "CTR-BOG-002",
    distance_cm: 65.0,
    fill_percentage: 35.0,
    recorded_at: "2026-11-04T16:20:00.000Z",
  };

  const mockClient = createMockSupabaseClient(mockRow, null, {
    expectedContainerId: "CTR-BOG-002",
  });

  setTelemetryServiceClient(mockClient);

  try {
    const result = await fetchLatestTelemetryByContainer("CTR-BOG-002");
    assert.ok(result);
    assert.equal(result.id, "uuid-telem-102");
    assert.equal(result.containerId, "CTR-BOG-002");
    assert.equal(result.fillPercentage, 35.0);
    assert.equal(result.status, "normal");
  } finally {
    setTelemetryServiceClient(null);
  }
});

test("fetchLatestTelemetryByContainer: retorna null cuando no existen lecturas", async () => {
  const mockClient = createMockSupabaseClient([], null, {
    expectedContainerId: "CTR-VACIO",
  });

  setTelemetryServiceClient(mockClient);

  try {
    const result = await fetchLatestTelemetryByContainer("CTR-VACIO");
    assert.equal(result, null);
  } finally {
    setTelemetryServiceClient(null);
  }
});

test("fetchLatestTelemetryByContainer: propaga error descriptivo ante fallo de Supabase", async () => {
  const mockClient = createMockSupabaseClient(null, {
    message: "Permiso denegado por política RLS",
  });

  setTelemetryServiceClient(mockClient);

  try {
    await assert.rejects(
      async () => {
        await fetchLatestTelemetryByContainer("CTR-BOG-001");
      },
      /Permiso denegado por política RLS/,
    );
  } finally {
    setTelemetryServiceClient(null);
  }
});

