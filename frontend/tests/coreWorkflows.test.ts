import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPaginatedData,
  filterAvailableInventory,
  filterSalesHistory,
  filterWasteHistory,
  RequestRevisionTracker,
  summarizeAvailableStockByContainer,
} from "../src/services/coreWorkflow.ts";

process.env.TZ = "America/Bogota";

const buyerA = "11111111-1111-4111-8111-111111111111";
const buyerB = "22222222-2222-4222-8222-222222222222";

const sales = [
  { id: "sale-1", buyerId: buyerA, soldAt: "2026-10-01T05:00:00.000Z" },
  { id: "sale-2", buyerId: buyerB, soldAt: "2026-10-08T17:00:00.000Z" },
  { id: "sale-3", buyerId: buyerA, soldAt: "2026-10-11T04:59:59.999Z" },
  { id: "sale-4", buyerId: buyerA, soldAt: "2026-10-11T05:00:00.000Z" },
];

const dateRange = {
  startInclusive: "2026-10-01T05:00:00.000Z",
  endExclusive: "2026-10-11T05:00:00.000Z",
};

test("filters sales by date, buyer, and both filters without including the end boundary", () => {
  assert.deepEqual(filterSalesHistory(sales, dateRange).map(({ id }) => id), ["sale-1", "sale-2", "sale-3"]);
  assert.deepEqual(filterSalesHistory(sales, undefined, buyerA).map(({ id }) => id), ["sale-1", "sale-3", "sale-4"]);
  assert.deepEqual(filterSalesHistory(sales, dateRange, buyerA).map(({ id }) => id), ["sale-1", "sale-3"]);
  assert.deepEqual(filterSalesHistory(sales, dateRange, "33333333-3333-4333-8333-333333333333"), []);
});

const wasteRecords = [
  { id: "waste-1", status: "available", category: "organic", containerId: "container-a" },
  { id: "waste-2", status: "sold", category: "organic", containerId: "container-a" },
  { id: "waste-3", status: "available", category: "recyclable", containerId: "container-b" },
  { id: "waste-4", status: "registered", category: "nonRecyclable", containerId: "container-b" },
] as const;

test("keeps only available inventory and combines category and container filters", () => {
  assert.deepEqual(filterAvailableInventory(wasteRecords).map(({ id }) => id), ["waste-1", "waste-3"]);
  assert.deepEqual(filterAvailableInventory(wasteRecords, "organic", "container-a").map(({ id }) => id), ["waste-1"]);
  assert.deepEqual(filterAvailableInventory(wasteRecords, "organic", "container-b"), []);
});

test("summarizes available stock for every real container without double counting", () => {
  const containers = [
    { id: "container-a", code: "CTR-A" },
    { id: "container-b", code: "CTR-B" },
    { id: "container-c", code: "CTR-C" },
  ];
  const records = [
    { id: "waste-1", status: "available", category: "organic", containerId: "container-a", weightKg: 1.25 },
    { id: "waste-2", status: "available", category: "recyclable", containerId: "container-a", weightKg: 0.75 },
    { id: "waste-3", status: "available", category: "organic", containerId: "container-b", weightKg: 3 },
    { id: "waste-3", status: "available", category: "organic", containerId: "container-b", weightKg: 3 },
  ] as const;

  assert.deepEqual(summarizeAvailableStockByContainer(containers, records), [
    { containerId: "container-b", containerCode: "CTR-B", availableWeightKg: 3, availableRecordCount: 1 },
    { containerId: "container-a", containerCode: "CTR-A", availableWeightKg: 2, availableRecordCount: 2 },
    { containerId: "container-c", containerCode: "CTR-C", availableWeightKg: 0, availableRecordCount: 0 },
  ]);
});

test("excludes sold records and records outside the real container set from stock summaries", () => {
  const summaries = summarizeAvailableStockByContainer(
    [{ id: "container-a", code: "CTR-A" }],
    [
      { id: "waste-1", status: "sold", category: "organic", containerId: "container-a", weightKg: 9 },
      { id: "waste-2", status: "available", category: "organic", containerId: "missing", weightKg: 4 },
    ],
  );

  assert.deepEqual(summaries, [
    { containerId: "container-a", containerCode: "CTR-A", availableWeightKg: 0, availableRecordCount: 0 },
  ]);
  assert.equal(summaries.reduce((total, summary) => total + summary.availableWeightKg, 0), 0);
});

test("preserves sold waste in history and combines status and category filters", () => {
  assert.deepEqual(filterWasteHistory(wasteRecords).map(({ id }) => id), ["waste-1", "waste-2", "waste-3", "waste-4"]);
  assert.deepEqual(filterWasteHistory(wasteRecords, "sold").map(({ id }) => id), ["waste-2"]);
  assert.deepEqual(filterWasteHistory(wasteRecords, "available", "organic").map(({ id }) => id), ["waste-1"]);
  assert.deepEqual(filterWasteHistory(wasteRecords, "sold", "recyclable"), []);
});

test("collects every page using inclusive database ranges", async () => {
  const ranges: Array<[number, number]> = [];
  const pages = [[1, 2], [3, 4], [5]];
  const result = await collectPaginatedData(2, async (from, to) => {
    ranges.push([from, to]);
    return { ok: true, data: pages[ranges.length - 1] ?? [] };
  });

  assert.deepEqual(result, { ok: true, data: [1, 2, 3, 4, 5] });
  assert.deepEqual(ranges, [[0, 1], [2, 3], [4, 5]]);
});

test("stops pagination at the first error and preserves it", async () => {
  let calls = 0;
  const result = await collectPaginatedData<number, { code: string }>(2, async () => {
    calls += 1;
    return calls === 1
      ? { ok: true, data: [1, 2] }
      : { ok: false, error: { code: "network_error" } };
  });

  assert.deepEqual(result, { ok: false, error: { code: "network_error" } });
  assert.equal(calls, 2);
  await assert.rejects(() => collectPaginatedData(0, async () => ({ ok: true, data: [] })));
});

test("rejects obsolete responses after a newer request or invalidation", async () => {
  const tracker = new RequestRevisionTracker();
  const first = tracker.issue();
  const second = tracker.issue();

  assert.equal(tracker.isCurrent(first), false);
  assert.equal(tracker.isCurrent(second), true);

  tracker.invalidate();
  assert.equal(tracker.isCurrent(second), false);
});
