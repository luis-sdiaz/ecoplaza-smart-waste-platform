import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPaginatedData,
  filterAvailableInventory,
  filterSalesHistory,
  filterWasteHistory,
  RequestRevisionTracker,
  sortSalesHistory,
  summarizeAvailableStockByContainer,
} from "../src/services/coreWorkflow.ts";
import { filterAndSortBuyers } from "../src/services/buyerFilters.ts";

process.env.TZ = "America/Bogota";

const buyerA = "11111111-1111-4111-8111-111111111111";
const buyerB = "22222222-2222-4222-8222-222222222222";

const sales = [
  { id: "sale-1", buyerId: buyerA, soldAt: "2026-10-01T05:00:00.000Z", totalValue: 500 },
  { id: "sale-2", buyerId: buyerB, soldAt: "2026-10-08T17:00:00.000Z", totalValue: 900 },
  { id: "sale-3", buyerId: buyerA, soldAt: "2026-10-11T04:59:59.999Z", totalValue: 900 },
  { id: "sale-4", buyerId: buyerA, soldAt: "2026-10-11T05:00:00.000Z", totalValue: 200 },
];

const dateRange = {
  startInclusive: "2026-10-01T05:00:00.000Z",
  endExclusive: "2026-10-11T05:00:00.000Z",
};

test("filters buyers by available contact together with search and sorting", () => {
  const buyers = [
    { id: "buyer-b", name: "Beta", email: null, phone: "1234567", createdAt: "2026-01-01", updatedAt: "2026-01-02" },
    { id: "buyer-a", name: "Álvaro", email: "alvaro@example.test", phone: null, createdAt: "2026-01-01", updatedAt: "2026-01-03" },
    { id: "buyer-c", name: "Alpine", email: "alpine@example.test", phone: "7654321", createdAt: "2026-01-01", updatedAt: "2026-01-04" },
  ];
  assert.deepEqual(filterAndSortBuyers(buyers, "al", "name_asc", "es-CO", "email").map(({ id }) => id), ["buyer-c", "buyer-a"]);
  assert.deepEqual(filterAndSortBuyers(buyers, "", "updated_desc", "es-CO", "phone").map(({ id }) => id), ["buyer-c", "buyer-b"]);
});

test("filters sales by date, buyer, and both filters without including the end boundary", () => {
  assert.deepEqual(filterSalesHistory(sales, dateRange).map(({ id }) => id), ["sale-1", "sale-2", "sale-3"]);
  assert.deepEqual(filterSalesHistory(sales, undefined, buyerA).map(({ id }) => id), ["sale-1", "sale-3", "sale-4"]);
  assert.deepEqual(filterSalesHistory(sales, dateRange, buyerA).map(({ id }) => id), ["sale-1", "sale-3"]);
  assert.deepEqual(filterSalesHistory(sales, dateRange, "33333333-3333-4333-8333-333333333333"), []);
});

test("sorts completed sales by date and value with deterministic tie breakers", () => {
  assert.deepEqual(sortSalesHistory(sales, "newest").map(({ id }) => id), ["sale-4", "sale-3", "sale-2", "sale-1"]);
  assert.deepEqual(sortSalesHistory(sales, "oldest").map(({ id }) => id), ["sale-1", "sale-2", "sale-3", "sale-4"]);
  assert.deepEqual(sortSalesHistory(sales, "valueDesc").map(({ id }) => id), ["sale-3", "sale-2", "sale-1", "sale-4"]);
  assert.deepEqual(sortSalesHistory(sales, "valueAsc").map(({ id }) => id), ["sale-4", "sale-1", "sale-3", "sale-2"]);
  assert.deepEqual(sales.map(({ id }) => id), ["sale-1", "sale-2", "sale-3", "sale-4"]);

  const exactTies = [
    { id: "sale-b", soldAt: "2026-10-10T12:00:00.000Z", totalValue: 700 },
    { id: "sale-a", soldAt: "2026-10-10T12:00:00.000Z", totalValue: 700 },
  ];
  assert.deepEqual(sortSalesHistory(exactTies, "newest").map(({ id }) => id), ["sale-a", "sale-b"]);
  assert.deepEqual(sortSalesHistory(exactTies, "valueDesc").map(({ id }) => id), ["sale-a", "sale-b"]);
});

test("sorts the complete result after combining sales filters", () => {
  const filtered = filterSalesHistory(sales, dateRange, buyerA);
  assert.deepEqual(sortSalesHistory(filtered, "valueDesc").map(({ id }) => id), ["sale-3", "sale-1"]);
});

const wasteRecords = [
  { id: "waste-1", status: "available", category: "organic", containerId: "container-a", registeredAt: "2026-10-01T05:00:00.000Z" },
  { id: "waste-2", status: "sold", category: "organic", containerId: "container-a", registeredAt: "2026-10-05T12:00:00.000Z" },
  { id: "waste-3", status: "available", category: "recyclable", containerId: "container-b", registeredAt: "2026-10-11T04:59:59.999Z" },
  { id: "waste-4", status: "registered", category: "nonRecyclable", containerId: "container-b", registeredAt: "2026-10-11T05:00:00.000Z" },
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

test("combines waste history date and container filters with local-day boundaries", () => {
  assert.deepEqual(
    filterWasteHistory(wasteRecords, "all", "all", "container-a", dateRange).map(({ id }) => id),
    ["waste-1", "waste-2"],
  );
  assert.deepEqual(
    filterWasteHistory(wasteRecords, "sold", "organic", "container-a", dateRange).map(({ id }) => id),
    ["waste-2"],
  );
  assert.deepEqual(
    filterWasteHistory(wasteRecords, "all", "all", "container-b", dateRange).map(({ id }) => id),
    ["waste-3"],
  );
  assert.deepEqual(filterWasteHistory(wasteRecords, "all", "all", "container-a", {
    startInclusive: "2026-11-01T05:00:00.000Z",
    endExclusive: "2026-12-01T05:00:00.000Z",
  }), []);
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
