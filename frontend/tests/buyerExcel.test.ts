import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerExcel, type BuyerExcelLabels } from "../src/services/buyerExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: BuyerExcelLabels = {
  workbookTitle: "EcoPlaza buyer directory",
  sheetName: "Buyers",
  id: "Unique identifier (UUID)",
  name: "Name",
  email: "Email address",
  phone: "Phone number",
  updatedAt: "Last updated",
};

test("creates a safe workbook from the supplied filtered buyer directory", async () => {
  const buyers = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "=HYPERLINK(\"https://invalid.example\")",
      email: "@unsafe.example",
      phone: "+57 300 123 4567",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-18T02:30:00.000Z",
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Buyer without contact",
      email: null,
      phone: null,
      createdAt: "2026-10-02T12:00:00.000Z",
      updatedAt: "2026-10-15T15:00:00.000Z",
    },
  ];
  const bytes = await createBuyerExcel(buyers, labels, "America/Bogota");

  const reopened = new Workbook();
  await reopened.xlsx.load(Buffer.from(bytes));
  const worksheet = reopened.getWorksheet("Buyers")!;

  assert.deepEqual((worksheet.getRow(3).values as unknown[]).slice(1), [
    "Unique identifier (UUID)", "Name", "Email address", "Phone number", "Last updated",
  ]);
  assert.equal(worksheet.getCell("A4").value, buyers[0].id);
  assert.equal(worksheet.getCell("A5").value, buyers[1].id);
  assert.equal(worksheet.getCell("B4").value, "'=HYPERLINK(\"https://invalid.example\")");
  assert.equal(worksheet.getCell("C4").value, "'@unsafe.example");
  assert.equal(worksheet.getCell("D4").value, "'+57 300 123 4567");
  assert.equal(worksheet.getCell("C5").value, "");
  assert.equal(worksheet.getCell("D5").value, "");
  assert.ok(worksheet.getCell("E4").value instanceof Date);
  assert.equal(worksheet.getCell("E4").value.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(worksheet.getCell("E4").numFmt, "yyyy-mm-dd hh:mm");
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.ok(worksheet.autoFilter);
  assert.equal(worksheet.getCell("A3").alignment.wrapText, true);
});

test("rejects invalid update timestamps instead of writing misleading dates", async () => {
  await assert.rejects(() => createBuyerExcel([{
    id: "11111111-1111-4111-8111-111111111111",
    name: "Buyer",
    email: null,
    phone: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "invalid",
  }], labels));
});
