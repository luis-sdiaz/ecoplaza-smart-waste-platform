import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerPurchaseExcel, type BuyerPurchaseExcelLabels } from "../src/services/buyerPurchaseExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: BuyerPurchaseExcelLabels = {
  workbookTitle: "EcoPlaza purchases for Buyer",
  sheetName: "Purchase history",
  saleId: "Sale identifier (UUID)",
  soldAt: "Date",
  category: "Waste category",
  weightKg: "Purchased weight (kg)",
  unitPriceCop: "Unit price (COP/kg)",
  totalValueCop: "Total value (COP)",
  categories: { organic: "Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
};

const selectedBuyerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("exports only the selected buyer purchases in the supplied filtered order", async () => {
  const sales = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      buyerId: selectedBuyerId,
      wasteRecordId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      weightKg: 2.5,
      unitPrice: 1200.25,
      totalValue: 3000.625,
      soldAt: "2026-10-18T02:30:00.000Z",
      buyerName: "Buyer",
      wasteRecordNumber: "2",
      category: "recyclable" as const,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      buyerId: selectedBuyerId,
      wasteRecordId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      weightKg: 1.25,
      unitPrice: 1000,
      totalValue: 1250,
      soldAt: "2026-10-15T15:00:00.000Z",
      buyerName: "Buyer",
      wasteRecordNumber: "1",
      category: "organic" as const,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      buyerId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      wasteRecordId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      weightKg: 9,
      unitPrice: 900,
      totalValue: 8100,
      soldAt: "2026-10-16T15:00:00.000Z",
      buyerName: "Other buyer",
      wasteRecordNumber: "3",
      category: "nonRecyclable" as const,
    },
  ];
  const bytes = await createBuyerPurchaseExcel(sales, selectedBuyerId, labels, "America/Bogota");

  const reopened = new Workbook();
  await reopened.xlsx.load(
    Buffer.from(bytes) as unknown as Parameters<typeof reopened.xlsx.load>[0],
  );
  const worksheet = reopened.getWorksheet("Purchase history")!;

  assert.equal(worksheet.rowCount, 5);
  assert.equal(worksheet.getCell("A4").value, sales[0].id);
  assert.equal(worksheet.getCell("A5").value, sales[1].id);
  assert.equal(worksheet.getCell("A6").value, null);
  const soldAt = worksheet.getCell("B4").value;
  assert.ok(soldAt instanceof Date);
  assert.equal(soldAt.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(worksheet.getCell("D4").value, 2.5);
  assert.equal(worksheet.getCell("E4").value, 1200.25);
  assert.equal(worksheet.getCell("F4").value, 3000.625);
  assert.match(worksheet.getCell("E4").numFmt, /COP/);
  assert.match(worksheet.getCell("F4").numFmt, /COP/);
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.ok(worksheet.autoFilter);
});

test("creates a valid empty workbook when no selected buyer purchases are supplied", async () => {
  const bytes = await createBuyerPurchaseExcel([], selectedBuyerId, labels, "America/Bogota");
  const reopened = new Workbook();
  await reopened.xlsx.load(
    Buffer.from(bytes) as unknown as Parameters<typeof reopened.xlsx.load>[0],
  );
  assert.equal(reopened.getWorksheet("Purchase history")!.rowCount, 3);
});
