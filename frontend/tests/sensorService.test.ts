import assert from "node:assert/strict";
import test from "node:test";
import {
  getContainerTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
  mapTelemetryRowToRecord,
  recordTelemetry,
  setSensorServiceClient,
  type SensorServiceClient,
  type TelemetryQueryResult,
  type TelemetryRow,
} from "../src/services/sensorService.ts";

const rows: TelemetryRow[] = [
  {
    id: "reading-2",
    container_id: "CTR-BOG-001",
    distance_cm: "18.25",
    fill_percentage: "82.5",
    recorded_at: "2026-11-10T12:00:05.000Z",
  },
  {
    id: "reading-1",
    container_id: "CTR-BOG-001",
    distance_cm: 35,
    fill_percentage: 65,
    recorded_at: "2026-11-10T12:00:00.000Z",
  },
];

function createClient(
  result: TelemetryQueryResult,
  onSelect?: (columns: string) => void,
  onEq?: (column: string, value: string) => void,
): SensorServiceClient {
  return {
    from(table: string) {
      assert.equal(table, "sensor_telemetry");
      return {
        select(columns: string) {
          onSelect?.(columns);
          return {
            eq(column: string, value: string) {
              onEq?.(column, value);
              return {
                order(orderColumn: string, options: { ascending: boolean }) {
                  assert.equal(orderColumn, "recorded_at");
                  assert.deepEqual(options, { ascending: false });
                  const query = Promise.resolve(result) as Promise<TelemetryQueryResult> & {
                    limit: (count: number) => Promise<TelemetryQueryResult>;
                  };
                  query.limit = async () => result;
                  return query;
                },
              };
            },
          };
        },
      };
    },
  };
}

test.afterEach(() => setSensorServiceClient(null));

test("maps the real sensor_telemetry columns without inventing measurements", () => {
  const record = mapTelemetryRowToRecord(rows[0]);
  assert.equal(record.batteryLevelPercent, undefined);
  assert.equal(record.temperatureCelsius, undefined);
  assert.deepEqual(record, {
    id: "reading-2",
    containerId: "CTR-BOG-001",
    distanceCm: 18.25,
    fillLevelPercent: 82.5,
    recordedAt: "2026-11-10T12:00:05.000Z",
  });
});

test("rejects malformed numeric telemetry instead of displaying a false value", () => {
  assert.throws(
    () => mapTelemetryRowToRecord({ ...rows[0], distance_cm: "invalid" }),
    /Invalid distance_cm/,
  );
});

test("queries history by textual container code and real columns", async () => {
  let selected = "";
  let filter: [string, string] | null = null;
  setSensorServiceClient(
    createClient(
      { data: rows, error: null },
      (columns) => { selected = columns; },
      (column, value) => { filter = [column, value]; },
    ),
  );

  const result = await getContainerTelemetry("  CTR-BOG-001  ");
  assert.match(selected, /distance_cm/);
  assert.match(selected, /fill_percentage/);
  assert.doesNotMatch(selected, /battery|temperature|fill_level_percent/);
  assert.deepEqual(filter, ["container_id", "CTR-BOG-001"]);
  assert.equal(result.length, 2);
});

test("returns the latest telemetry row and supports empty identifiers", async () => {
  setSensorServiceClient(createClient({ data: [rows[0]], error: null }));
  assert.equal((await getLatestTelemetry("CTR-BOG-001"))?.id, "reading-2");
  assert.equal(await getLatestTelemetry("  "), null);
  assert.deepEqual(await getContainerTelemetry(""), []);
});

test("limits history and propagates database failures", async () => {
  setSensorServiceClient(createClient({ data: rows, error: null }));
  assert.equal((await getTelemetryHistory("CTR-BOG-001", 50)).length, 2);

  setSensorServiceClient(
    createClient({ data: null, error: { message: "permission denied" } }),
  );
  await assert.rejects(
    getLatestTelemetry("CTR-BOG-001"),
    /permission denied/,
  );
});

test("records only distance_cm and fill_percentage using the textual code", async () => {
  let inserted: Record<string, unknown> | null = null;
  let selected = "";
  const insertedRow = rows[0];
  setSensorServiceClient({
    from(table: string) {
      assert.equal(table, "sensor_telemetry");
      return {
        select() {
          throw new Error("not used");
        },
        insert(values) {
          inserted = values as Record<string, unknown>;
          return {
            select(columns = "*") {
              selected = columns;
              return {
                async single() {
                  return { data: insertedRow, error: null };
                },
              };
            },
          };
        },
      };
    },
  });

  const result = await recordTelemetry({
    containerId: " CTR-BOG-001 ",
    distanceCm: 18.25,
    fillPercentage: 82.5,
    recordedAt: "2026-11-10T12:00:05.000Z",
  });

  assert.deepEqual(inserted, {
    container_id: "CTR-BOG-001",
    distance_cm: 18.25,
    fill_percentage: 82.5,
    recorded_at: "2026-11-10T12:00:05.000Z",
  });
  assert.match(selected, /distance_cm/);
  assert.equal(result.id, "reading-2");
});

test("validates telemetry writes before reaching Supabase", async () => {
  await assert.rejects(
    recordTelemetry({ containerId: "", distanceCm: 10, fillPercentage: 50 }),
    /containerId/,
  );
  await assert.rejects(
    recordTelemetry({
      containerId: "CTR-BOG-001",
      distanceCm: Number.NaN,
      fillPercentage: 50,
    }),
    /distanceCm/,
  );
  await assert.rejects(
    recordTelemetry({
      containerId: "CTR-BOG-001",
      distanceCm: 10,
      fillPercentage: 101,
    }),
    /fillPercentage/,
  );
});
