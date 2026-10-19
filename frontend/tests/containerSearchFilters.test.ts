import assert from "node:assert/strict";
import test from "node:test";
import {
  filterContainers,
  type Container,
} from "../src/services/containerFilters.ts";

const sampleContainers: readonly Container[] = [
  {
    id: "cont-1",
    code: "CONT-001",
    category: "Orgánicos",
    wasteType: "Compost",
    location: "Bodega Norte",
    description: "Contenedor principal de orgánicos",
    currentWeightKg: 45.5,
  },
  {
    id: "cont-2",
    code: "CONT-002",
    category: "Reciclables",
    wasteType: "Plástico PET",
    location: "Patio Central",
    description: "Contenedor para botellas",
    currentWeightKg: 0,
  },
  {
    id: "cont-3",
    code: "CONT-003",
    category: "No aprovechables",
    wasteType: "Ordinarios",
    location: "Bodega Sur",
    description: "Residuos no reciclables",
    currentWeightKg: 12.3,
  },
  {
    id: "cont-4",
    code: "CONT-004",
    category: "Orgánicos",
    wasteType: "Restos de poda",
    location: "Jardín Oriental",
    description: "Material vegetal",
    currentWeightKg: null,
  },
];

test("filterContainers returns empty array when input is empty without throwing", () => {
  const result = filterContainers([], { query: "CONT", stockFilter: "with_stock" });
  assert.deepEqual(result, []);
});

test("filterContainers does not mutate the source array and returns a new reference", () => {
  const original = [...sampleContainers];
  const result = filterContainers(original, { query: "CONT" });
  assert.notEqual(result, original);
  assert.equal(original.length, 4);
});

test("text search is case-insensitive, ignores leading/trailing spaces and normalizes accents", () => {
  // Búsqueda por código con espacios y minúsculas
  const byCode = filterContainers(sampleContainers, { query: "   cont-001   " });
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].id, "cont-1");

  // Búsqueda por categoría sin tilde ("organicos" vs "Orgánicos")
  const byCategoryWithoutAccent = filterContainers(sampleContainers, { query: "organicos" });
  assert.equal(byCategoryWithoutAccent.length, 2);
  assert.deepEqual(
    byCategoryWithoutAccent.map((c) => c.id).sort(),
    ["cont-1", "cont-4"],
  );

  // Búsqueda por categoría con tilde y mayúsculas
  const byCategoryWithAccent = filterContainers(sampleContainers, { query: "ORGÁNICOS" });
  assert.equal(byCategoryWithAccent.length, 2);

  // Búsqueda por ubicación
  const byLocation = filterContainers(sampleContainers, { query: "patio central" });
  assert.equal(byLocation.length, 1);
  assert.equal(byLocation[0].id, "cont-2");

  // Búsqueda por descripción
  const byDescription = filterContainers(sampleContainers, { query: "botellas" });
  assert.equal(byDescription.length, 1);
  assert.equal(byDescription[0].id, "cont-2");

  // Query vacía o espacios devuelve todos
  const byEmpty = filterContainers(sampleContainers, { query: "    " });
  assert.equal(byEmpty.length, 4);
});

test('stockFilter "all" returns all containers matching search', () => {
  const result = filterContainers(sampleContainers, { stockFilter: "all" });
  assert.equal(result.length, 4);
});

test('stockFilter "with_stock" returns only containers with currentWeightKg > 0', () => {
  const result = filterContainers(sampleContainers, { stockFilter: "with_stock" });
  const ids = result.map((c) => c.id);
  assert.deepEqual(ids, ["cont-1", "cont-3"]);
  assert.ok(result.every((c) => (c.currentWeightKg ?? 0) > 0));
});

test('stockFilter "empty" returns containers with currentWeightKg === 0, null, or undefined', () => {
  const result = filterContainers(sampleContainers, { stockFilter: "empty" });
  const ids = result.map((c) => c.id);
  assert.deepEqual(ids, ["cont-2", "cont-4"]);
  assert.ok(result.every((c) => (c.currentWeightKg ?? 0) === 0));
});

test("combines textual search and stock filter deterministically", () => {
  // Buscar "organicos" + "with_stock" -> solo cont-1 (cont-4 tiene weight null)
  const organicWithStock = filterContainers(sampleContainers, {
    query: "organicos",
    stockFilter: "with_stock",
  });
  assert.equal(organicWithStock.length, 1);
  assert.equal(organicWithStock[0].id, "cont-1");

  // Buscar "organicos" + "empty" -> solo cont-4
  const organicEmpty = filterContainers(sampleContainers, {
    query: "organicos",
    stockFilter: "empty",
  });
  assert.equal(organicEmpty.length, 1);
  assert.equal(organicEmpty[0].id, "cont-4");

  // Buscar coincidencia inexistente con filtro de stock
  const noMatch = filterContainers(sampleContainers, {
    query: "VIDRIO-INEXISTENTE",
    stockFilter: "with_stock",
  });
  assert.equal(noMatch.length, 0);
});

