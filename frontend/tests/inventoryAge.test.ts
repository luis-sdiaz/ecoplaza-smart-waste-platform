import assert from "node:assert/strict";
import test from "node:test";
import { calculateStorageAgeDays } from "../src/services/inventoryAge.ts";

process.env.TZ = "America/Bogota";

test("calculates storage age by local calendar-day boundaries", () => {
  const now = new Date("2026-10-16T05:00:00.000Z");
  assert.equal(calculateStorageAgeDays("2026-10-16T04:59:59.999Z", now), 1);
  assert.equal(calculateStorageAgeDays("2026-10-16T05:00:00.000Z", now), 0);
  assert.equal(calculateStorageAgeDays("2026-10-15T12:00:00.000Z", now), 1);
});

test("clamps future inventory dates and rejects invalid dates", () => {
  const now = new Date("2026-10-16T12:00:00.000Z");
  assert.equal(calculateStorageAgeDays("2026-10-17T12:00:00.000Z", now), 0);
  assert.equal(calculateStorageAgeDays("invalid", now), null);
  assert.equal(calculateStorageAgeDays("2026-10-15T12:00:00.000Z", new Date("invalid")), null);
});
