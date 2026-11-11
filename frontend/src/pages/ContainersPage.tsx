import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/PageHeader";
import ContainerManagementPanel from "../components/ContainerManagementPanel";
import type { Container } from "../services/containerService";
import {
  fetchLatestTelemetryByContainer,
  isTelemetryFresh,
  type SensorTelemetry,
} from "../services/telemetryService";

export type ContainersPageProps = {
  initialContainers?: Container[];
  initialTelemetry?: SensorTelemetry | null;
  pollIntervalMs?: number;
};

function formatTelemetryTimestamp(
  isoDateStr: string | null | undefined,
  locale: string,
): string {
  if (!isoDateStr) return "—";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return "—";
  }
}

export function ContainersPage({
  initialContainers,
  initialTelemetry,
  pollIntervalMs,
}: ContainersPageProps = {}) {
  const { t, i18n } = useTranslation();
  const telemetryRevisionRef = useRef(0);
  const [liveTelemetry, setLiveTelemetry] = useState<SensorTelemetry | null>(
    initialTelemetry !== undefined ? initialTelemetry : null,
  );

  useEffect(() => {
    if (initialTelemetry !== undefined && pollIntervalMs === 0) return;

    const syncTelemetry = (): void => {
      const requestRevision = ++telemetryRevisionRef.current;
      void fetchLatestTelemetryByContainer("CTR-BOG-001")
        .then((data) => {
          if (requestRevision !== telemetryRevisionRef.current) return;
          setLiveTelemetry(
            data && isTelemetryFresh(data.recordedAt) ? data : null,
          );
        })
        .catch(() => {
          if (requestRevision !== telemetryRevisionRef.current) return;
          setLiveTelemetry(null);
        });
    };

    if (initialTelemetry === undefined) {
      syncTelemetry();
    }

    const intervalTime = pollIntervalMs ?? 10000;
    const intervalId = window.setInterval(syncTelemetry, intervalTime);

    return () => {
      telemetryRevisionRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [initialTelemetry, pollIntervalMs]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";

  return (
    <section className="p-8">
      <PageHeader
        title={t("containers.title")}
        description={t("containers.description")}
      />

      {liveTelemetry && (
        <article
          role="region"
          aria-label={`Telemetría en vivo del contenedor físico ${liveTelemetry.containerId}`}
          className="mt-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 backdrop-blur-md shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-inner">
                <Radio size={22} className="animate-pulse" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {liveTelemetry.containerId}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                      aria-hidden="true"
                    />
                    IoT Live
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      liveTelemetry.status === "critical"
                        ? "border-rose-400/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : liveTelemetry.status === "warning"
                          ? "border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {liveTelemetry.status === "critical"
                      ? "Critical"
                      : liveTelemetry.status === "warning"
                        ? "Warning"
                        : "Normal"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("sensors.liveTelemetrySubtitle")} · {t("sensors.lastReading")}:{" "}
                  {formatTelemetryTimestamp(liveTelemetry.recordedAt, locale)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 self-stretch sm:self-auto border-t sm:border-t-0 sm:border-l border-emerald-500/20 pt-3 sm:pt-0 sm:pl-6">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t("sensors.fillLevel")}
                </span>
                <span
                  className={`text-xl font-black ${
                    liveTelemetry.status === "critical"
                      ? "text-rose-600 dark:text-rose-400"
                      : liveTelemetry.status === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {liveTelemetry.fillPercentage}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t("sensors.ultrasonicDistance")}
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {liveTelemetry.distanceCm} cm
                </span>
              </div>
            </div>
          </div>
        </article>
      )}

      <div className="mt-8">
        <ContainerManagementPanel
          initialContainers={initialContainers}
          liveTelemetry={liveTelemetry}
        />
      </div>
    </section>
  );
}

export default ContainersPage;
