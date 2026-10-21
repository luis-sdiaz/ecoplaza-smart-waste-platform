export interface ContainerTelemetrySnapshot {
  containerId: string;
  containerName: string;
  fillLevel: number;
  batteryLevel: number;
  temperature?: number | null;
  updatedAt: string;
}

export interface IoTUrgentDispatchItem {
  containerId: string;
  containerName: string;
  fillLevel: number;
  priority: "CRITICAL" | "WARNING";
  recommendationKey: string;
}

export interface IoTFleetHealthSummary {
  totalMonitored: number;
  criticalCount: number; // >= 90%
  warningCount: number; // >= 75% y < 90%
  normalCount: number; // < 75%
  averageFillLevel: number; // redondeado a 1 decimal
  lowBatteryCount: number; // batería < 20%
  urgentDispatchList: IoTUrgentDispatchItem[];
  operationalStatusKey: string;
}

export function calculateFleetHealth(
  snapshots: ContainerTelemetrySnapshot[],
): IoTFleetHealthSummary {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      totalMonitored: 0,
      criticalCount: 0,
      warningCount: 0,
      normalCount: 0,
      averageFillLevel: 0,
      lowBatteryCount: 0,
      urgentDispatchList: [],
      operationalStatusKey: "empty",
    };
  }

  let criticalCount = 0;
  let warningCount = 0;
  let normalCount = 0;
  let lowBatteryCount = 0;
  let totalFill = 0;
  const urgentDispatchList: IoTUrgentDispatchItem[] = [];

  for (const snapshot of snapshots) {
    const fill =
      typeof snapshot.fillLevel === "number" && !Number.isNaN(snapshot.fillLevel)
        ? snapshot.fillLevel
        : 0;
    totalFill += fill;

    if (fill >= 90) {
      criticalCount++;
      urgentDispatchList.push({
        containerId: snapshot.containerId,
        containerName: snapshot.containerName,
        fillLevel: fill,
        priority: "CRITICAL",
        recommendationKey: "immediate_dispatch",
      });
    } else if (fill >= 75) {
      warningCount++;
      urgentDispatchList.push({
        containerId: snapshot.containerId,
        containerName: snapshot.containerName,
        fillLevel: fill,
        priority: "WARNING",
        recommendationKey: "scheduled_collection",
      });
    } else {
      normalCount++;
    }

    if (
      typeof snapshot.batteryLevel === "number" &&
      !Number.isNaN(snapshot.batteryLevel) &&
      snapshot.batteryLevel < 20
    ) {
      lowBatteryCount++;
    }
  }

  const averageFillLevel =
    Math.round((totalFill / snapshots.length) * 10) / 10;

  urgentDispatchList.sort((a, b) => b.fillLevel - a.fillLevel);

  let operationalStatusKey = "optimal";
  if (criticalCount > 0) {
    operationalStatusKey = "critical";
  } else if (warningCount > 0) {
    operationalStatusKey = "warning";
  }

  return {
    totalMonitored: snapshots.length,
    criticalCount,
    warningCount,
    normalCount,
    averageFillLevel,
    lowBatteryCount,
    urgentDispatchList,
    operationalStatusKey,
  };
}

export function generateIoTExecutiveSummary(
  summary: IoTFleetHealthSummary,
  lang: "es" | "en" = "es",
): string {
  const isEn = lang === "en";

  if (summary.totalMonitored === 0) {
    return isEn
      ? "No containers with active telemetry in the fleet."
      : "No hay contenedores con telemetría activa en la flota.";
  }

  const sentences: string[] = [];

  if (isEn) {
    sentences.push(
      `Monitoring ${summary.totalMonitored} container(s) with an average fill level of ${summary.averageFillLevel}%.`,
    );

    if (summary.criticalCount > 0) {
      let critMsg = `Immediate collection required for ${summary.criticalCount} critical container(s).`;
      if (summary.warningCount > 0) {
        critMsg += ` Preventive collection recommended for ${summary.warningCount} container(s).`;
      }
      sentences.push(critMsg);
    } else if (summary.warningCount > 0) {
      sentences.push(
        `Preventive collection recommended for ${summary.warningCount} container(s) with high fill level.`,
      );
    } else {
      sentences.push(
        "All containers are operating within normal capacity levels.",
      );
    }

    if (summary.lowBatteryCount > 0) {
      sentences.push(
        `Warning: ${summary.lowBatteryCount} device(s) reported low battery (< 20%).`,
      );
    } else {
      sentences.push("Battery levels are stable across the network.");
    }
  } else {
    sentences.push(
      `Se monitorean ${summary.totalMonitored} contenedor(es) con un nivel de llenado promedio de ${summary.averageFillLevel}%.`,
    );

    if (summary.criticalCount > 0) {
      let critMsg = `Se requiere recolección inmediata en ${summary.criticalCount} contenedor(es) crítico(s).`;
      if (summary.warningCount > 0) {
        critMsg += ` Se sugiere programar recolección preventiva para ${summary.warningCount} contenedor(es).`;
      }
      sentences.push(critMsg);
    } else if (summary.warningCount > 0) {
      sentences.push(
        `Se sugiere programar recolección preventiva para ${summary.warningCount} contenedor(es) con llenado alto.`,
      );
    } else {
      sentences.push(
        "Todos los contenedores se encuentran dentro de los niveles normales de capacidad.",
      );
    }

    if (summary.lowBatteryCount > 0) {
      sentences.push(
        `Alerta: ${summary.lowBatteryCount} dispositivo(s) registran batería baja (< 20%).`,
      );
    } else {
      sentences.push("Los niveles de batería son estables en toda la red.");
    }
  }

  return sentences.join(" ");
}

