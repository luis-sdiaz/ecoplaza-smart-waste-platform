import assert from "node:assert/strict";
import test from "node:test";
import { createWasteExcel, type WasteExcelLabels } from "../src/services/wasteExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: WasteExcelLabels = {
  workbookTitle: "EcoPlaza waste history",
  sheetName: "Waste history",
  id: "Unique identifier (UUID)",
  recordNumber: "Visible record number",
  category: "Category",
  weightKg: "Weight (kg)",
  container: "Container",
  registeredAt: "Registration date",
  status: "Status",
  categories: { organic: "=Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
  statuses: { registered: "Registered", available: "Available", sold: "Sold" },
};

test("creates a professional workbook from the supplied filtered waste history", async () => {
  const records = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      recordNumber: "42",
      containerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      category: "organic" as const,
      weightKg: 7.5,
      registeredAt: "2026-10-18T02:30:00.000Z",
      status: "sold" as const,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      recordNumber: "7",
      containerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      category: "recyclable" as const,
      weightKg: 2.125,
      registeredAt: "2026-10-15T15:00:00.000Z",
      status: "available" as const,
    },
  ];
  const bytes = await createWasteExcel(records, new Map([
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "CON-001"],
    ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "=CON-002"],
  ]), labels, "America/Bogota");

  const reopened = new Workbook();
  await reopened.xlsx.load(Buffer.from(bytes));
  const worksheet = reopened.getWorksheet("Waste history")!;

  assert.deepEqual((worksheet.getRow(3).values as unknown[]).slice(1), [
    "Unique identifier (UUID)",
    "Visible record number",
    "Category",
    "Weight (kg)",
    "Container",
    "Registration date",
    "Status",
  ]);
  assert.equal(worksheet.getCell("A4").value, records[0].id);
  assert.equal(worksheet.getCell("B4").value, "RES-042");
  assert.equal(worksheet.getCell("B5").value, "RES-007");
  assert.equal(worksheet.getCell("C4").value, "'=Organic");
  assert.equal(worksheet.getCell("D4").value, 7.5);
  assert.equal(typeof worksheet.getCell("D4").value, "number");
  assert.equal(worksheet.getCell("E4").value, "'=CON-002");
  assert.ok(worksheet.getCell("F4").value instanceof Date);
  assert.equal(worksheet.getCell("F4").value.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(worksheet.getCell("F4").numFmt, "yyyy-mm-dd hh:mm");
  assert.equal(worksheet.getCell("G4").value, "Sold");
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.ok(worksheet.autoFilter);
  assert.equal(worksheet.getCell("A3").alignment.wrapText, true);
});

test("rejects invalid waste weights instead of writing a misleading workbook", async () => {
  await assert.rejects(() => createWasteExcel([{
    id: "11111111-1111-4111-8111-111111111111",
    recordNumber: "1",
    containerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    category: "recyclable",
    weightKg: Number.POSITIVE_INFINITY,
    registeredAt: "2026-10-15T15:00:00.000Z",
    status: "available",
  }], new Map(), labels));
});
