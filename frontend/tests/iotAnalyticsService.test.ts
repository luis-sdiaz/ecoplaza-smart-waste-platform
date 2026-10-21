import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFleetHealth,
  generateIoTExecutiveSummary,
  type ContainerTelemetrySnapshot,
} from "../src/services/iotAnalyticsService.ts";

test("calculateFleetHealth: debe ser resiliente ante lista vacía", () => {
  const result = calculateFleetHealth([]);
  assert.equal(result.totalMonitored, 0);
  assert.equal(result.criticalCount, 0);
  assert.equal(result.warningCount, 0);
  assert.equal(result.normalCount, 0);
  assert.equal(result.averageFillLevel, 0);
  assert.equal(result.lowBatteryCount, 0);
  assert.deepEqual(result.urgentDispatchList, []);
  assert.equal(result.operationalStatusKey, "empty");

  const summaryEs = generateIoTExecutiveSummary(result, "es");
  const summaryEn = generateIoTExecutiveSummary(result, "en");
  assert.match(summaryEs, /No hay contenedores con telemetría activa/i);
  assert.match(summaryEn, /No containers with active telemetry/i);
});

test("calculateFleetHealth: cálculo exacto de contadores críticos, advertencias y normales", () => {
  const snapshots: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "Contenedor Norte",
      fillLevel: 95,
      batteryLevel: 80,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "Contenedor Centro",
      fillLevel: 75,
      batteryLevel: 60,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-3",
      containerName: "Contenedor Sur",
      fillLevel: 45,
      batteryLevel: 90,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-4",
      containerName: "Contenedor Este",
      fillLevel: 20,
      batteryLevel: 85,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];

  const result = calculateFleetHealth(snapshots);
  assert.equal(result.totalMonitored, 4);
  assert.equal(result.criticalCount, 1); // 95%
  assert.equal(result.warningCount, 1); // 75%
  assert.equal(result.normalCount, 2); // 45%, 20%
  assert.equal(result.operationalStatusKey, "critical");
});

test("calculateFleetHealth: cálculo de promedio con redondeo a 1 decimal", () => {
  const snapshots: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "C1",
      fillLevel: 80,
      batteryLevel: 100,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "C2",
      fillLevel: 85,
      batteryLevel: 100,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-3",
      containerName: "C3",
      fillLevel: 92,
      batteryLevel: 100,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];

  // (80 + 85 + 92) / 3 = 257 / 3 = 85.6666... -> 85.7
  const result = calculateFleetHealth(snapshots);
  assert.equal(result.averageFillLevel, 85.7);
});

test("calculateFleetHealth: detección precisa de sensores con batería baja (< 20%)", () => {
  const snapshots: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "C1",
      fillLevel: 10,
      batteryLevel: 15, // < 20
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "C2",
      fillLevel: 20,
      batteryLevel: 19.9, // < 20
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-3",
      containerName: "C3",
      fillLevel: 30,
      batteryLevel: 20, // no es < 20
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-4",
      containerName: "C4",
      fillLevel: 40,
      batteryLevel: 95,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];

  const result = calculateFleetHealth(snapshots);
  assert.equal(result.lowBatteryCount, 2);
});

test("calculateFleetHealth: ordenamiento descendente en urgentDispatchList por severidad", () => {
  const snapshots: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-warn-1",
      containerName: "Contenedor Alerta 1",
      fillLevel: 78,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-crit-1",
      containerName: "Contenedor Crítico 1",
      fillLevel: 98,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-warn-2",
      containerName: "Contenedor Alerta 2",
      fillLevel: 88,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-crit-2",
      containerName: "Contenedor Crítico 2",
      fillLevel: 92,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-normal",
      containerName: "Contenedor Normal",
      fillLevel: 35,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];

  const result = calculateFleetHealth(snapshots);
  assert.equal(result.urgentDispatchList.length, 4);

  // Orden descendente esperado: 98, 92, 88, 78
  assert.equal(result.urgentDispatchList[0].fillLevel, 98);
  assert.equal(result.urgentDispatchList[0].priority, "CRITICAL");
  assert.equal(result.urgentDispatchList[0].recommendationKey, "immediate_dispatch");

  assert.equal(result.urgentDispatchList[1].fillLevel, 92);
  assert.equal(result.urgentDispatchList[1].priority, "CRITICAL");
  assert.equal(result.urgentDispatchList[1].recommendationKey, "immediate_dispatch");

  assert.equal(result.urgentDispatchList[2].fillLevel, 88);
  assert.equal(result.urgentDispatchList[2].priority, "WARNING");
  assert.equal(result.urgentDispatchList[2].recommendationKey, "scheduled_collection");

  assert.equal(result.urgentDispatchList[3].fillLevel, 78);
  assert.equal(result.urgentDispatchList[3].priority, "WARNING");
  assert.equal(result.urgentDispatchList[3].recommendationKey, "scheduled_collection");
});

test("calculateFleetHealth: asigna 'warning' u 'optimal' según corresponda", () => {
  const warningOnly: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "C1",
      fillLevel: 80,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "C2",
      fillLevel: 50,
      batteryLevel: 50,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];
  assert.equal(calculateFleetHealth(warningOnly).operationalStatusKey, "warning");

  const optimalFleet: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "C1",
      fillLevel: 30,
      batteryLevel: 80,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "C2",
      fillLevel: 55,
      batteryLevel: 90,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];
  assert.equal(calculateFleetHealth(optimalFleet).operationalStatusKey, "optimal");
});

test("generateIoTExecutiveSummary: genera resumen ejecutivo coherente en español e inglés", () => {
  const snapshots: ContainerTelemetrySnapshot[] = [
    {
      containerId: "c-1",
      containerName: "Plaza Central",
      fillLevel: 96,
      batteryLevel: 15,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-2",
      containerName: "Mercado Mayorista",
      fillLevel: 82,
      batteryLevel: 65,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
    {
      containerId: "c-3",
      containerName: "Parque Industrial",
      fillLevel: 40,
      batteryLevel: 90,
      updatedAt: "2026-10-20T10:00:00.000Z",
    },
  ];

  const health = calculateFleetHealth(snapshots);

  // Verificación en español
  const summaryEs = generateIoTExecutiveSummary(health, "es");
  assert.match(summaryEs, /Se monitorean 3 contenedor\(es\)/);
  assert.match(summaryEs, /nivel de llenado promedio de 72\.7%/);
  assert.match(summaryEs, /recolección inmediata en 1 contenedor\(es\) crítico\(s\)/);
  assert.match(summaryEs, /recolección preventiva para 1 contenedor\(es\)/);
  assert.match(summaryEs, /Alerta: 1 dispositivo\(s\) registran batería baja/);

  // Verificación en inglés
  const summaryEn = generateIoTExecutiveSummary(health, "en");
  assert.match(summaryEn, /Monitoring 3 container\(s\)/);
  assert.match(summaryEn, /average fill level of 72\.7%/);
  assert.match(summaryEn, /Immediate collection required for 1 critical container\(s\)/);
  assert.match(summaryEn, /Preventive collection recommended for 1 container\(s\)/);
  assert.match(summaryEn, /Warning: 1 device\(s\) reported low battery/);
});

