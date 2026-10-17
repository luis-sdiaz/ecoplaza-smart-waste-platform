import assert from "node:assert/strict";
import test from "node:test";
import { createInventoryExcel, type InventoryExcelLabels } from "../src/services/inventoryExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: InventoryExcelLabels = {
  workbookTitle: "EcoPlaza available inventory",
  sheetName: "Available inventory",
  recordNumber: "Record number",
  container: "Container code",
  category: "Category",
  weightKg: "Available weight (kg)",
  registeredAt: "Registration date",
  storageAgeDays: "Storage age (days)",
  categories: { organic: "=Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
};

test("creates a formatted workbook from the supplied filtered inventory order", async () => {
  const records = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      recordNumber: "2",
      containerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      category: "organic" as const,
      weightKg: 7.5,
      registeredAt: "2026-10-16T02:00:00.000Z",
      status: "available" as const,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      recordNumber: "1",
      containerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      category: "recyclable" as const,
      weightKg: 2.125,
      registeredAt: "2026-10-15T15:00:00.000Z",
      status: "available" as const,
    },
  ];
  const containerCodes = new Map([
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "CON-001"],
    ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "=CON-002"],
  ]);

  const bytes = await createInventoryExcel(
    records,
    containerCodes,
    labels,
    new Date("2026-10-17T12:00:00.000Z"),
    "America/Bogota",
  );
  const reopened = new Workbook();
  await reopened.xlsx.load(Buffer.from(bytes));
  const worksheet = reopened.getWorksheet("Available inventory")!;

  assert.deepEqual((worksheet.getRow(3).values as unknown[]).slice(1), [
    "Record number",
    "Container code",
    "Category",
    "Available weight (kg)",
    "Registration date",
    "Storage age (days)",
  ]);
  assert.equal(worksheet.getCell("A4").value, "2");
  assert.equal(worksheet.getCell("A5").value, "1");
  assert.equal(worksheet.getCell("B4").value, "'=CON-002");
  assert.equal(worksheet.getCell("C4").value, "'=Organic");
  assert.equal(worksheet.getCell("D4").value, 7.5);
  assert.match(worksheet.getCell("D4").numFmt, /kg/);
  assert.ok(worksheet.getCell("E4").value instanceof Date);
  assert.equal(worksheet.getCell("E4").value.toISOString(), "2026-10-15T21:00:00.000Z");
  assert.equal(worksheet.getCell("E4").numFmt, "yyyy-mm-dd");
  assert.equal(worksheet.getCell("F4").value, 2);
  assert.equal(typeof worksheet.getCell("F4").value, "number");
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.ok(worksheet.autoFilter);
  assert.equal(worksheet.getCell("A3").alignment.wrapText, true);
});

test("rejects invalid inventory numbers instead of writing a misleading workbook", async () => {
  await assert.rejects(() => createInventoryExcel([{
    id: "11111111-1111-4111-8111-111111111111",
    recordNumber: "1",
    containerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    category: "recyclable",
    weightKg: Number.NaN,
    registeredAt: "2026-10-15T15:00:00.000Z",
    status: "available",
  }], new Map(), labels));
});
