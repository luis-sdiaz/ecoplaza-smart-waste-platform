import assert from "node:assert/strict";
import test from "node:test";
import { createReportCsv } from "../src/services/reportCsvService.ts";
import { createSalesCsv } from "../src/services/salesCsv.ts";
import { escapeCsvValue } from "../src/services/csvService.ts";
import { getCsvCategoryLabels } from "../src/services/csvCategoryLabels.ts";
import en from "../src/i18n/translations/en.ts";
import es from "../src/i18n/translations/es.ts";

const reportLabels = {
  section: "Section", metric: "Metric", value: "Value", unit: "Unit",
  summary: "Summary", distribution: "Distribution", category: "Category",
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
  assert.equal(escapeCsvValue("a;b"), '"a;b"');
  assert.equal(escapeCsvValue('a"b'), '"a""b"');
  assert.equal(escapeCsvValue("a\nb"), '"a\nb"');
  assert.equal(escapeCsvValue("=1+1"), "'=1+1");
  assert.equal(escapeCsvValue("+1+1"), "'+1+1");
  assert.equal(escapeCsvValue("  -2+3"), "'  -2+3");
  assert.equal(escapeCsvValue("@SUM(A1)"), "'@SUM(A1)");
});

test("creates a BOM-prefixed report CSV with filtered period and numeric values", () => {
  const csv = createReportCsv(report, reportLabels, {
    startDate: "2026-10-01", endDate: "2026-10-13",
  });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.endsWith("\r\n"));
  assert.ok(csv.includes("Period;From;2026-10-01;To: 2026-10-13"));
  assert.ok(csv.includes("Summary;Revenue;11000.25;COP"));
  assert.ok(csv.includes("Distribution;Organic;12.5;100"));
  assert.throws(() => createReportCsv({ ...report, grossSalesValue: Number.POSITIVE_INFINITY }, reportLabels));
});

test("creates sales CSV without personal fields and rejects invalid numbers", () => {
  const labels = {
    reference: "Reference", completedAt: "Date", category: "Category",
    weightKg: "Weight", unitPriceCop: "Price", totalValueCop: "Total",
    categories: { organic: "=FORMULA", recyclable: "Recyclable", nonRecyclable: "Other" },
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
  const csv = createSalesCsv([sale], labels);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("SAL-12345678;2026-10-13T15:30:00.000Z;'=FORMULA;12.5;2500.25;31253.125"));
  assert.equal(csv.includes("Excluded buyer"), false);
  assert.throws(() => createSalesCsv([{ ...sale, totalValue: Number.NaN }], labels));
});
