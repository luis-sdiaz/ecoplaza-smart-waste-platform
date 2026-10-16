import assert from "node:assert/strict";
import test from "node:test";
import { createReportCsv } from "../src/services/reportCsvService.ts";
import { createSalesCsv } from "../src/services/salesCsv.ts";
import { createBuyerCsv } from "../src/services/buyerCsv.ts";
import { createWasteCsv } from "../src/services/wasteCsv.ts";
import { createInventoryCsv } from "../src/services/inventoryCsv.ts";
import { createContainerCsv } from "../src/services/containerCsv.ts";
import { createBuyerPurchaseCsv } from "../src/services/buyerPurchaseCsv.ts";
import { escapeCsvValue } from "../src/services/csvService.ts";
import { getCsvCategoryLabels } from "../src/services/csvCategoryLabels.ts";
import en from "../src/i18n/translations/en.ts";
import es from "../src/i18n/translations/es.ts";

const reportLabels = {
  section: "Section", metric: "Metric", value: "Value", unit: "Unit",
  summary: "Summary", distribution: "Distribution", salesPerformance: "Sales performance", salesTrend: "Daily sales trend", date: "Date", category: "Category",
  weight: "Weight (kg)", percentage: "Percentage (%)", records: "Records",
  historicalWeight: "Historical", availableWeight: "Available", soldWeight: "Sold",
  sales: "Sales", grossRevenue: "Revenue", countUnit: "records", kilogramsUnit: "kg",
  copUnit: "COP", period: "Period", from: "From", to: "To", allTime: "All history",
  categories: { organic: "Organic", recyclable: "Recyclable", nonRecyclable: "Other" },
};

const report = {
  wasteRecordCount: 2,
  totalRegisteredWeightKg: 12.5,
  availableWeightKg: 7,
  soldWeightKg: 5.5,
  salesCount: 1,
  grossSalesValue: 11000.25,
  distribution: [{ category: "organic" as const, weightKg: 12.5, percentage: 100 }],
  salesByCategory: [],
  salesTrend: [],
};

function translateFrom(
  translations: typeof es,
): (key: string) => string {
  return (key) => {
    const value = key.split(".").reduce<unknown>((current, segment) => {
      if (typeof current !== "object" || current === null || !(segment in current)) {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, translations);

    return typeof value === "string" ? value : key;
  };
}

test("resolves CSV waste category labels in Spanish and English", () => {
  const spanishLabels = getCsvCategoryLabels(translateFrom(es));
  const englishLabels = getCsvCategoryLabels(translateFrom(en));

  assert.deepEqual(spanishLabels, {
    organic: "Orgánicos",
    recyclable: "Reciclables",
    nonRecyclable: "No aprovechables",
  });
  assert.deepEqual(englishLabels, {
    organic: "Organic",
    recyclable: "Recyclable",
    nonRecyclable: "Non-recyclable",
  });
  assert.equal(
    [...Object.values(spanishLabels), ...Object.values(englishLabels)]
      .some((label) => label.startsWith("common.")),
    false,
  );
});

test("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
  assert.equal(escapeCsvValue("plain"), "plain");
  assert.equal(escapeCsvValue("a,b"), '"a,b"');
  assert.equal(escapeCsvValue("a;b", "es"), '"a;b"');
  assert.equal(escapeCsvValue('a"b'), '"a""b"');
  assert.equal(escapeCsvValue("a\nb"), '"a\nb"');
  assert.equal(escapeCsvValue("=1+1"), "'=1+1");
  assert.equal(escapeCsvValue("+1+1"), "'+1+1");
  assert.equal(escapeCsvValue("  -2+3"), "'  -2+3");
  assert.equal(escapeCsvValue("@SUM(A1)"), "'@SUM(A1)");
});

test("creates a Spanish Excel-compatible report without losing numeric precision", () => {
  const preciseReport = {
    ...report,
    totalRegisteredWeightKg: 2.5,
    availableWeightKg: 7,
    soldWeightKg: 0.123456789012345,
    grossSalesValue: 11000.255,
    distribution: [{
      category: "organic" as const,
      weightKg: 2.5,
      percentage: 33.333333333333336,
    }],
  };
  const csv = createReportCsv(preciseReport, reportLabels, "es", {
    startDate: "2026-10-01", endDate: "2026-10-13",
  });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.endsWith("\r\n"));
  assert.ok(csv.includes("Period;From;2026-10-01;\r\n"));
  assert.ok(csv.includes("Period;To;2026-10-13;\r\n"));
  assert.ok(csv.includes("Summary;Historical;2,5;kg"));
  assert.ok(csv.includes("Summary;Available;7;kg"));
  assert.ok(csv.includes("Summary;Sold;0,123456789012345;kg"));
  assert.ok(csv.includes("Summary;Revenue;11000,255;COP"));
  assert.ok(csv.includes("Distribution;Organic;2,5;33,333333333333336"));
  assert.equal(csv.includes("To: 2026-10-13"), false);
  assert.throws(() => createReportCsv(
    { ...report, grossSalesValue: Number.POSITIVE_INFINITY },
    reportLabels,
    "es",
  ));
});

test("uses English CSV separators and decimal points", () => {
  const csv = createReportCsv({
    ...report,
    salesByCategory: [{ category: "organic", salesCount: 2, soldWeightKg: 2.5, grossSalesValue: 9000.125 }],
    salesTrend: [{ date: "2026-10-12", salesCount: 2, grossSalesValue: 9000.125 }],
  }, reportLabels, "en", {
    startDate: "2026-10-01", endDate: "2026-10-13",
  });

  assert.ok(csv.includes("Section,Metric,Value,Unit"));
  assert.ok(csv.includes("Period,From,2026-10-01,"));
  assert.ok(csv.includes("Period,To,2026-10-13,"));
  assert.ok(csv.includes("Summary,Revenue,11000.25,COP"));
  assert.ok(csv.includes("Distribution,Organic,12.5,100"));
  assert.ok(csv.includes("Sales performance,Category,Sales,Sold,Revenue"));
  assert.ok(csv.includes("Sales performance,Organic,2,2.5,9000.125"));
  assert.ok(csv.includes("Daily sales trend,Date,Sales,Revenue"));
  assert.ok(csv.includes("Daily sales trend,2026-10-12,2,9000.125"));
});

test("creates sales CSV with complete UUIDs and bilingual professional headers", () => {
  const spanishLabels = {
    ...es.sales.csv,
    categories: getCsvCategoryLabels(translateFrom(es)),
  };
  const englishLabels = {
    ...en.sales.csv,
    categories: getCsvCategoryLabels(translateFrom(en)),
  };
  const firstSale = {
    id: "12345678-1234-4234-8234-123456789abc",
    buyerId: "22345678-1234-4234-8234-123456789abc",
    wasteRecordId: "32345678-1234-4234-8234-123456789abc",
    weightKg: 12.5,
    unitPrice: 2500.25,
    totalValue: 31253.125,
    soldAt: "2026-10-13T15:30:00.000Z",
    buyerName: "Excluded buyer",
    wasteRecordNumber: "9",
    category: "organic" as const,
  };
  const secondSale = {
    ...firstSale,
    id: "12345678-abcd-4abc-8abc-fedcba987654",
    category: "recyclable" as const,
    weightKg: 7,
    unitPrice: 1800,
    totalValue: 12600,
    soldAt: "2026-10-14T09:45:12.345-05:00",
  };

  const spanishCsv = createSalesCsv([firstSale, secondSale], spanishLabels, "es");
  const englishCsv = createSalesCsv([firstSale, secondSale], englishLabels, "en");
  const spanishRows = spanishCsv.slice(1, -2).split("\r\n");
  const englishRows = englishCsv.slice(1, -2).split("\r\n");

  assert.equal(
    spanishRows[0],
    "Identificador único de venta (UUID);Fecha de realización (ISO 8601);Categoría del residuo;Peso vendido (kg);Precio por kilogramo (COP);Valor total (COP)",
  );
  assert.equal(
    englishRows[0],
    "Unique sale identifier (UUID),Completion date (ISO 8601),Waste category,Weight sold (kg),Price per kilogram (COP),Total value (COP)",
  );
  assert.equal(
    spanishRows[1],
    "12345678-1234-4234-8234-123456789abc;2026-10-13T15:30:00.000Z;Orgánicos;12,5;2500,25;31253,125",
  );
  assert.equal(
    spanishRows[2],
    "12345678-abcd-4abc-8abc-fedcba987654;2026-10-14T09:45:12.345-05:00;Reciclables;7;1800;12600",
  );
  assert.equal(englishRows[1].split(",")[0], firstSale.id);
  assert.equal(englishRows[2].split(",")[0], secondSale.id);
  assert.notEqual(englishRows[1].split(",")[0], englishRows[2].split(",")[0]);
  assert.ok(englishRows[1].endsWith(",12.5,2500.25,31253.125"));
  assert.ok(spanishCsv.startsWith("\uFEFF"));
  assert.ok(spanishCsv.endsWith("\r\n"));
  assert.equal(spanishCsv.includes("SAL-12345678"), false);
  assert.equal(spanishCsv.includes("Excluded buyer"), false);
});

test("keeps sales CSV escaping, formula protection, and numeric validation", () => {
  const labels = {
    reference: "Identifier", completedAt: "Date", category: "Category",
    weightKg: "Weight", unitPriceCop: "Price", totalValueCop: "Total",
    categories: { organic: "=FORMULA;\"value\"", recyclable: "Recyclable", nonRecyclable: "Other" },
  };
  const sale = {
    id: "12345678-1234-4234-8234-123456789abc",
    buyerId: "22345678-1234-4234-8234-123456789abc",
    wasteRecordId: "32345678-1234-4234-8234-123456789abc",
    weightKg: 12.5,
    unitPrice: 2500.25,
    totalValue: 31253.125,
    soldAt: "2026-10-13T15:30:00.000Z",
    buyerName: "Excluded buyer",
    wasteRecordNumber: "9",
    category: "organic" as const,
  };

  const csv = createSalesCsv([sale], labels, "es");
  assert.ok(csv.includes(";\"'=FORMULA;\"\"value\"\"\";"));
  assert.throws(() => createSalesCsv([{ ...sale, totalValue: Number.NaN }], labels, "es"));
});

test("exports only the supplied filtered buyers with complete identifiers and safe contacts", () => {
  const buyers = [{
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "=Unsafe Buyer",
    email: "buyer@example.test",
    phone: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-02T12:00:00.000Z",
  }];
  const labels = { id: "Identifier", name: "Name", email: "Email", phone: "Phone" };

  const englishCsv = createBuyerCsv(buyers, labels, "en");
  const spanishCsv = createBuyerCsv(buyers, labels, "es");

  assert.ok(englishCsv.includes("Identifier,Name,Email,Phone"));
  assert.ok(englishCsv.includes("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,'=Unsafe Buyer,buyer@example.test,"));
  assert.ok(spanishCsv.includes("Identifier;Name;Email;Phone"));
  assert.equal(spanishCsv.includes("BUY-"), false);
});

test("exports supplied containers in their visible order with complete identifiers", () => {
  const containers = [
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", code: "CTR-2", createdAt: "2026-10-15T14:00:00.000Z" },
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", code: "=UNSAFE", createdAt: "2026-10-14T14:00:00.000Z" },
  ];
  const labels = { id: "UUID", code: "Code", createdAt: "Created" };

  const englishCsv = createContainerCsv(containers, labels, "en");
  const spanishCsv = createContainerCsv(containers, labels, "es");

  assert.ok(englishCsv.includes("UUID,Code,Created"));
  assert.ok(englishCsv.indexOf("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") < englishCsv.indexOf("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"));
  assert.ok(englishCsv.includes("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,'=UNSAFE,2026-10-14T14:00:00.000Z"));
  assert.ok(spanishCsv.includes("UUID;Code;Created"));
});

test("exports only the selected buyer's real purchase history", () => {
  const selectedBuyerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const sales = [
    { id: "11111111-1111-4111-8111-111111111111", buyerId: selectedBuyerId, wasteRecordId: "33333333-3333-4333-8333-333333333333", weightKg: 2.5, unitPrice: 1200, totalValue: 3000, soldAt: "2026-10-15T14:00:00.000Z", buyerName: "Selected", wasteRecordNumber: "1", category: "organic" as const },
    { id: "22222222-2222-4222-8222-222222222222", buyerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", wasteRecordId: "44444444-4444-4444-8444-444444444444", weightKg: 1, unitPrice: 900, totalValue: 900, soldAt: "2026-10-14T14:00:00.000Z", buyerName: "Other", wasteRecordNumber: "2", category: "recyclable" as const },
  ];
  const labels = { reference: "Sale UUID", completedAt: "Date", category: "Category", weightKg: "Weight", unitPriceCop: "Unit price", totalValueCop: "Total", categories: { organic: "Organic", recyclable: "Recyclable", nonRecyclable: "Other" } };

  const csv = createBuyerPurchaseCsv(sales, selectedBuyerId, labels, "en");

  assert.ok(csv.includes("11111111-1111-4111-8111-111111111111,2026-10-15T14:00:00.000Z,Organic,2.5,1200,3000"));
  assert.equal(csv.includes("22222222-2222-4222-8222-222222222222"), false);
});

test("exports the supplied filtered waste history with localized values", () => {
  const records = [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", recordNumber: "42", containerId: "container-1", category: "organic" as const, weightKg: 2.5, registeredAt: "2026-10-15T14:00:00.000Z", status: "available" as const }];
  const labels = { recordNumber: "Registro", id: "UUID", category: "Categoría", weightKg: "Peso", container: "Contenedor", registeredAt: "Fecha", status: "Estado", categories: { organic: "Orgánicos", recyclable: "Reciclables", nonRecyclable: "No aprovechables" }, statuses: { registered: "Registrado", available: "Disponible", sold: "Vendido" } };
  const csv = createWasteCsv(records, new Map([["container-1", "CON-001"]]), labels, "es");
  assert.ok(csv.includes("Registro;UUID;Categoría;Peso;Contenedor;Fecha;Estado"));
  assert.ok(csv.includes("42;bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb;Orgánicos;2,5;CON-001;2026-10-15T14:00:00.000Z;Disponible"));
  assert.equal(csv.includes("RES-"), false);
});

test("exports only supplied available inventory records", () => {
  const records = [{ id: "record-id", recordNumber: "7", containerId: "container-1", category: "recyclable" as const, weightKg: 4.125, registeredAt: "2026-10-15T15:00:00.000Z", status: "available" as const }];
  const labels = { recordNumber: "Record", container: "Container", category: "Category", weightKg: "Weight", registeredAt: "Date", categories: { organic: "Organic", recyclable: "Recyclable", nonRecyclable: "Other" } };
  const csv = createInventoryCsv(records, new Map([["container-1", "CON-001"]]), labels, "en");
  assert.ok(csv.includes("Record,Container,Category,Weight,Date"));
  assert.ok(csv.includes("7,CON-001,Recyclable,4.125,2026-10-15T15:00:00.000Z"));
});
