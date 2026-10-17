import assert from "node:assert/strict";
import test from "node:test";
import { selectOldestAvailableInventory } from "../src/services/dashboardAgingInventory.ts";

process.env.TZ = "America/Bogota";

const now = new Date("2026-10-16T12:00:00.000-05:00");
const containers = [{ id: "container-a", code: "CTR-A" }];

test("selects at most five oldest valid available records in deterministic order", () => {
  const records = [
    { id: "waste-f", recordNumber: "6", containerId: "container-a", category: "organic", weightKg: 6, registeredAt: "2026-10-15T10:00:00.000-05:00", status: "available" },
    { id: "waste-e", recordNumber: "5", containerId: "container-a", category: "organic", weightKg: 5, registeredAt: "2026-09-01T10:00:00.000-05:00", status: "available" },
    { id: "waste-d", recordNumber: "4", containerId: "container-a", category: "recyclable", weightKg: 4, registeredAt: "2026-09-15T10:00:00.000-05:00", status: "available" },
    { id: "waste-c", recordNumber: "3", containerId: "container-a", category: "organic", weightKg: 3, registeredAt: "2026-09-15T11:00:00.000-05:00", status: "available" },
    { id: "waste-b", recordNumber: "2", containerId: "container-a", category: "nonRecyclable", weightKg: 2, registeredAt: "2026-10-01T10:00:00.000-05:00", status: "available" },
    { id: "waste-a", recordNumber: "1", containerId: "missing", category: "organic", weightKg: 1, registeredAt: "2026-10-10T10:00:00.000-05:00", status: "available" },
    { id: "invalid", recordNumber: "7", containerId: "container-a", category: "organic", weightKg: 7, registeredAt: "invalid", status: "available" },
    { id: "sold", recordNumber: "8", containerId: "container-a", category: "organic", weightKg: 8, registeredAt: "2026-01-01T10:00:00.000-05:00", status: "sold" },
  ] as const;

  const selected = selectOldestAvailableInventory(records, containers, now);
  assert.deepEqual(selected.map(({ id }) => id), ["waste-e", "waste-d", "waste-c", "waste-b", "waste-a"]);
  assert.deepEqual(selected[0], {
    id: "waste-e", reference: "RES-005", category: "organic", weightKg: 5,
    containerCode: "CTR-A", ageDays: 45,
  });
  assert.equal(selected[4]?.containerCode, null);
});

test("returns no misleading rows for invalid limits or dates", () => {
  assert.deepEqual(selectOldestAvailableInventory([], containers, now), []);
  assert.deepEqual(selectOldestAvailableInventory([], containers, now, 0), []);
});
