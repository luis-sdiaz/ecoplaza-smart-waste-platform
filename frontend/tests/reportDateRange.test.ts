import assert from "node:assert/strict";
import test from "node:test";
import {
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
