import assert from "node:assert/strict";
import test from "node:test";
import { createContainerExcel, type ContainerExcelLabels } from "../src/services/containerExcelService.ts";

const excelModule = await import("exceljs");
const Workbook = excelModule.Workbook ??
  (excelModule as unknown as { default: typeof excelModule }).default.Workbook;

process.env.TZ = "America/Bogota";

const labels: ContainerExcelLabels = {
  workbookTitle: "EcoPlaza registered containers",
  sheetName: "Containers",
  id: "Unique identifier (UUID)",
  code: "Container code",
  createdAt: "Creation date",
  availableRecordCount: "Available records",
  availableWeightKg: "Available weight (kg)",
};

test("creates a workbook from real containers with available stock when loaded", async () => {
  const containers = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      code: "CTR-B",
      createdAt: "2026-10-18T02:30:00.000Z",
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      code: "CTR-A",
      createdAt: "2026-10-15T15:00:00.000Z",
    },
  ];
  const stockByContainer = new Map([[containers[0].id, {
    containerId: containers[0].id,
    containerCode: containers[0].code,
    availableRecordCount: 3,
    availableWeightKg: 12.75,
  }]]);
  const bytes = await createContainerExcel(
    containers,
    stockByContainer,
    labels,
    "America/Bogota",
  );

  const reopened = new Workbook();
  await reopened.xlsx.load(
    Buffer.from(bytes) as unknown as Parameters<typeof reopened.xlsx.load>[0],
  );
  const worksheet = reopened.getWorksheet("Containers")!;

  assert.deepEqual((worksheet.getRow(3).values as unknown[]).slice(1), [
    "Unique identifier (UUID)", "Container code", "Creation date", "Available records", "Available weight (kg)",
  ]);
  assert.equal(worksheet.getCell("A4").value, containers[0].id);
  assert.equal(worksheet.getCell("A5").value, containers[1].id);
  assert.equal(worksheet.getCell("B4").value, "CTR-B");
  const createdAt = worksheet.getCell("C4").value;
  assert.ok(createdAt instanceof Date);
  assert.equal(createdAt.toISOString(), "2026-10-17T21:30:00.000Z");
  assert.equal(worksheet.getCell("D4").value, 3);
  assert.equal(typeof worksheet.getCell("D4").value, "number");
  assert.equal(worksheet.getCell("E4").value, 12.75);
  assert.match(worksheet.getCell("E4").numFmt, /kg/);
  assert.equal(worksheet.getCell("D5").value, null);
  assert.equal(worksheet.getCell("E5").value, null);
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.ok(worksheet.autoFilter);
});

test("rejects invalid stock values instead of writing a misleading workbook", async () => {
  const container = {
    id: "11111111-1111-4111-8111-111111111111",
    code: "CTR-A",
    createdAt: "2026-10-15T15:00:00.000Z",
  };
  await assert.rejects(() => createContainerExcel([container], new Map([[container.id, {
    containerId: container.id,
    containerCode: container.code,
    availableRecordCount: 1,
    availableWeightKg: Number.NaN,
  }]]), labels));
});
