import assert from "node:assert/strict";
import test from "node:test";
import {
  getContainerTelemetry,
  getLatestTelemetry,
  mapTelemetryRowToRecord,
  setSensorServiceClient,
  type SensorServiceClient,
  type TelemetryQueryResult,
  type TelemetryRow,
} from "../src/services/sensorService.ts";

process.env.TZ = "America/Bogota";

const mockTelemetryRows: TelemetryRow[] = [
  {
    id: "telem-1",
    container_id: "ctr-abc-123",
    fill_level_percent: 75,
    battery_level_percent: 92,
    temperature_celsius: 23.4,
    recorded_at: "2026-10-20T14:00:00.000Z",
  },
  {
    id: "telem-2",
    container_id: "ctr-abc-123",
    fill_level_percent: 50,
    battery_level_percent: 94,
    temperature_celsius: null,
    recorded_at: "2026-10-20T13:00:00.000Z",
  },
];

function createMockSupabaseClient(
  data: TelemetryRow[] | null,
  error: { message: string } | null = null,
): SensorServiceClient {
  return {
    from: (table: string) => {
      assert.equal(table, "sensor_telemetry");
      return {
        select: (columns: string) => {
          assert.match(columns, /container_id/);
          assert.match(columns, /fill_level_percent/);
          return {
            eq: (column: string, value: string) => {
              assert.equal(column, "container_id");
              assert.equal(value, "ctr-abc-123");
              return {
                order: (orderColumn: string, options: { ascending: boolean }) => {
                  assert.equal(orderColumn, "recorded_at");
                  assert.equal(options.ascending, false);

                  const queryResult: TelemetryQueryResult = { data, error };
                  const promise = Promise.resolve(queryResult);

                  return {
                    then: promise.then.bind(promise),
                    catch: promise.catch.bind(promise),
                    finally: promise.finally.bind(promise),
                    limit: (count: number) => {
                      assert.equal(count, 1);
                      const limitedData =
                        Array.isArray(data) && data.length > 0
                          ? [data[0]]
                          : data;
                      return Promise.resolve({ data: limitedData, error });
                    },
                  } as unknown as ReturnType<
                    ReturnType<
                      ReturnType<
                        ReturnType<SensorServiceClient["from"]>["select"]
                      >["eq"]
                    >["order"]
                  >;
                },
              };
            },
          };
        },
      };
    },
  };
}

test("mapTelemetryRowToRecord maps database row to camelCase TelemetryRecord", () => {
  const row: TelemetryRow = {
    id: "uuid-1",
    container_id: "ctr-1",
    fill_level_percent: 85,
    battery_level_percent: 90,
    temperature_celsius: 21.5,
    recorded_at: "2026-10-20T10:00:00.000Z",
  };

  const record = mapTelemetryRowToRecord(row);

  assert.equal(record.id, "uuid-1");
  assert.equal(record.containerId, "ctr-1");
  assert.equal(record.fillLevelPercent, 85);
  assert.equal(record.batteryLevelPercent, 90);
  assert.equal(record.temperatureCelsius, 21.5);
  assert.equal(record.recordedAt, "2026-10-20T10:00:00.000Z");
});

test("mapTelemetryRowToRecord handles numeric string conversions and null temperature", () => {
  const row: TelemetryRow = {
    id: "uuid-2",
    container_id: "ctr-2",
    fill_level_percent: "40",
    battery_level_percent: "88",
    temperature_celsius: null,
    recorded_at: "2026-10-20T11:00:00.000Z",
  };

  const record = mapTelemetryRowToRecord(row);

  assert.equal(record.fillLevelPercent, 40);
  assert.equal(record.batteryLevelPercent, 88);
  assert.equal(record.temperatureCelsius, null);
});

test("getContainerTelemetry returns ordered telemetry history for valid container", async () => {
  const mockClient = createMockSupabaseClient(mockTelemetryRows);
  setSensorServiceClient(mockClient);

  try {
    const telemetry = await getContainerTelemetry("ctr-abc-123");

    assert.equal(telemetry.length, 2);
    assert.equal(telemetry[0].id, "telem-1");
    assert.equal(telemetry[0].containerId, "ctr-abc-123");
    assert.equal(telemetry[0].fillLevelPercent, 75);
    assert.equal(telemetry[0].batteryLevelPercent, 92);
    assert.equal(telemetry[0].temperatureCelsius, 23.4);
    assert.equal(telemetry[0].recordedAt, "2026-10-20T14:00:00.000Z");

    assert.equal(telemetry[1].id, "telem-2");
    assert.equal(telemetry[1].temperatureCelsius, null);
  } finally {
    setSensorServiceClient(null);
  }
});

test("getContainerTelemetry returns empty array for empty containerId or empty database", async () => {
  // Empty or invalid containerId
  assert.deepEqual(await getContainerTelemetry(""), []);
  assert.deepEqual(await getContainerTelemetry("   "), []);

  // Empty data from database
  const mockClient = createMockSupabaseClient([]);
  setSensorServiceClient(mockClient);

  try {
    const telemetry = await getContainerTelemetry("ctr-abc-123");
    assert.deepEqual(telemetry, []);
  } finally {
    setSensorServiceClient(null);
  }
});

test("getContainerTelemetry throws error when database query fails", async () => {
  const mockClient = createMockSupabaseClient(null, {
    message: "Network connection refused",
  });
  setSensorServiceClient(mockClient);

  try {
    await assert.rejects(
      () => getContainerTelemetry("ctr-abc-123"),
      /Network connection refused/,
    );
  } finally {
    setSensorServiceClient(null);
  }
});

test("getLatestTelemetry returns the single newest telemetry record", async () => {
  const mockClient = createMockSupabaseClient(mockTelemetryRows);
  setSensorServiceClient(mockClient);

  try {
    const latest = await getLatestTelemetry("ctr-abc-123");

    assert.notEqual(latest, null);
    assert.equal(latest?.id, "telem-1");
    assert.equal(latest?.containerId, "ctr-abc-123");
    assert.equal(latest?.fillLevelPercent, 75);
    assert.equal(latest?.batteryLevelPercent, 92);
    assert.equal(latest?.temperatureCelsius, 23.4);
  } finally {
    setSensorServiceClient(null);
  }
});

test("getLatestTelemetry returns null when container has no telemetry or invalid id", async () => {
  assert.equal(await getLatestTelemetry(""), null);
  assert.equal(await getLatestTelemetry("   "), null);

  const mockClient = createMockSupabaseClient([]);
  setSensorServiceClient(mockClient);

  try {
    const latest = await getLatestTelemetry("ctr-abc-123");
    assert.equal(latest, null);
  } finally {
    setSensorServiceClient(null);
  }
});

test("getLatestTelemetry throws error when database query fails", async () => {
  const mockClient = createMockSupabaseClient(null, {
    message: "Permission denied",
  });
  setSensorServiceClient(mockClient);

  try {
    await assert.rejects(
      () => getLatestTelemetry("ctr-abc-123"),
      /Permission denied/,
    );
  } finally {
    setSensorServiceClient(null);
  }
});

