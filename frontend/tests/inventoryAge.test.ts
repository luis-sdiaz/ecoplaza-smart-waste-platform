import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStorageAgeDays,
  filterInventoryByStorageAge,
} from "../src/services/inventoryAge.ts";

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

test("filters inclusive storage-age boundaries and excludes invalid dates from age buckets", () => {
  const now = new Date("2026-10-16T12:00:00.000-05:00");
  const records = [
    { id: "today", registeredAt: "2026-10-16T08:00:00.000-05:00" },
    { id: "day-7", registeredAt: "2026-10-09T08:00:00.000-05:00" },
    { id: "day-8", registeredAt: "2026-10-08T08:00:00.000-05:00" },
    { id: "day-30", registeredAt: "2026-09-16T08:00:00.000-05:00" },
    { id: "day-31", registeredAt: "2026-09-15T08:00:00.000-05:00" },
    { id: "invalid", registeredAt: "not-a-date" },
  ];

  assert.deepEqual(filterInventoryByStorageAge(records, "all", now).map(({ id }) => id),
    ["today", "day-7", "day-8", "day-30", "day-31", "invalid"]);
  assert.deepEqual(filterInventoryByStorageAge(records, "upTo7", now).map(({ id }) => id),
    ["today", "day-7"]);
  assert.deepEqual(filterInventoryByStorageAge(records, "from8To30", now).map(({ id }) => id),
    ["day-8", "day-30"]);
  assert.deepEqual(filterInventoryByStorageAge(records, "over30", now).map(({ id }) => id),
    ["day-31"]);
});

test("reclassifies inventory when the local calendar day changes", () => {
  const records = [{ id: "boundary", registeredAt: "2026-10-09T23:59:00.000-05:00" }];

  assert.deepEqual(filterInventoryByStorageAge(
    records,
    "upTo7",
    new Date("2026-10-16T23:59:59.000-05:00"),
  ).map(({ id }) => id), ["boundary"]);
  assert.deepEqual(filterInventoryByStorageAge(
    records,
    "upTo7",
    new Date("2026-10-17T00:00:00.000-05:00"),
  ), []);
  assert.deepEqual(filterInventoryByStorageAge(
    records,
    "from8To30",
    new Date("2026-10-17T00:00:00.000-05:00"),
  ).map(({ id }) => id), ["boundary"]);
});
