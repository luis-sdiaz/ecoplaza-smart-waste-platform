import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportDateRangePreset,
  isTimestampInRange,
  isValidReportDateRange,
  toTimestampRange,
} from "../src/services/reportDateRange.ts";

process.env.TZ = "America/Bogota";

test("builds inclusive local-day limits with an exclusive upper timestamp", () => {
  assert.deepEqual(toTimestampRange({ startDate: "2026-10-13", endDate: "2026-10-13" }), {
    startInclusive: "2026-10-13T05:00:00.000Z",
    endExclusive: "2026-10-14T05:00:00.000Z",
  });
});

test("preserves distinct initial and final boundaries", () => {
  assert.deepEqual(toTimestampRange({ startDate: "2026-10-01", endDate: "2026-10-31" }), {
    startInclusive: "2026-10-01T05:00:00.000Z",
    endExclusive: "2026-11-01T05:00:00.000Z",
  });
});

test("rejects reversed, incomplete, and impossible ranges", () => {
  assert.equal(isValidReportDateRange({ startDate: "2026-10-14", endDate: "2026-10-13" }), false);
  assert.equal(isValidReportDateRange({ startDate: "", endDate: "2026-10-13" }), false);
  assert.equal(isValidReportDateRange({ startDate: "2026-02-30", endDate: "2026-03-01" }), false);
  assert.throws(() => toTimestampRange({ startDate: "2026-10-14", endDate: "2026-10-13" }));
});

test("matches the inclusive start and exclusive end boundaries", () => {
  const range = toTimestampRange({ startDate: "2026-10-13", endDate: "2026-10-13" });
  assert.equal(isTimestampInRange("2026-10-13T05:00:00.000Z", range), true);
  assert.equal(isTimestampInRange("2026-10-14T04:59:59.999Z", range), true);
  assert.equal(isTimestampInRange("2026-10-14T05:00:00.000Z", range), false);
  assert.equal(isTimestampInRange("invalid", range), false);
});

test("builds inclusive quick ranges from the user's local calendar", () => {
  const now = new Date(2026, 9, 13, 23, 30);

  assert.deepEqual(getReportDateRangePreset("last7Days", now), {
    startDate: "2026-10-07",
    endDate: "2026-10-13",
  });
  assert.deepEqual(getReportDateRangePreset("last30Days", now), {
    startDate: "2026-09-14",
    endDate: "2026-10-13",
  });
  assert.deepEqual(getReportDateRangePreset("currentMonth", now), {
    startDate: "2026-10-01",
    endDate: "2026-10-13",
  });
});

test("quick ranges cross month and year boundaries without using UTC dates", () => {
  assert.deepEqual(getReportDateRangePreset("last7Days", new Date(2026, 0, 3)), {
    startDate: "2025-12-28",
    endDate: "2026-01-03",
  });
  assert.throws(() => getReportDateRangePreset("last7Days", new Date("invalid")));
});
