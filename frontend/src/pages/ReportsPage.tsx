import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WasteDistributionChart from "../components/WasteDistributionChart";
import {
  getReportStatistics,
  type ReportErrorCode,
  type ReportStatistics,
} from "../services/reportService";

function getReportErrorKey(code: ReportErrorCode): string {
  if (code === "unauthorized") return "reports.unauthorized";
  if (code === "network_error") return "reports.networkError";
  if (code === "permission_denied") return "reports.permissionError";
  return "reports.databaseError";
}

function UserReportsPage({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyResult = useCallback((
    result: Awaited<ReturnType<typeof getReportStatistics>>,
    requestRevision: number,
  ): void => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setStatistics(null);
      setLoadError(getReportErrorKey(result.error.code));
      setIsLoading(false);
      return;
    }

    setStatistics(result.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadReport = useCallback(async (): Promise<void> => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getReportStatistics();
      applyResult(result, requestRevision);
    } catch {
      if (requestRevision !== requestRevisionRef.current) return;
      setStatistics(null);
      setLoadError("reports.databaseError");
      setIsLoading(false);
    }
  }, [applyResult]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void getReportStatistics()
      .then((result) => {
        applyResult(result, requestRevision);
      })
      .catch(() => {
        if (requestRevision !== requestRevisionRef.current) return;
        setStatistics(null);
        setLoadError("reports.databaseError");
        setIsLoading(false);
      });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyResult, userId]);

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
  const metricsUnavailable = isLoading || loadError !== null || statistics === null;
  const formatWeight = (weightKg: number): string =>
    `${numberFormatter.format(weightKg)} ${t("common.kg")}`;
  const metricValue = (format: (data: ReportStatistics) => string): string =>
    metricsUnavailable || statistics === null ? "—" : format(statistics);

  return (
    <section className="p-4 md:p-8">
      <PageHeader
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
      />

      {isLoading && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-3 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          {t("reports.loading")}
        </div>
      )}

      {!isLoading && loadError && (
        <div
          role="alert"
          className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-ecoplaza-danger/30 bg-ecoplaza-danger/10 px-4 py-3 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3 text-sm text-ecoplaza-danger">
            <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(loadError)}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-ecoplaza-danger/30 px-3 py-2 text-sm font-medium text-ecoplaza-danger"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("reports.retry")}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title={t("reports.wasteRecords")}
          value={metricValue((data) => numberFormatter.format(data.wasteRecordCount))}
          description={t("reports.wasteRecordsDescription")}
          badge={t("reports.realData")}
        />
        <MetricCard
          title={t("reports.historicalWeight")}
          value={metricValue((data) => formatWeight(data.totalRegisteredWeightKg))}
          description={t("reports.historicalWeightDescription")}
          badge={t("reports.realData")}
        />
        <MetricCard
          title={t("reports.availableWeight")}
          value={metricValue((data) => formatWeight(data.availableWeightKg))}
          description={t("reports.availableWeightDescription")}
          badge={t("reports.realData")}
        />
        <MetricCard
          title={t("reports.soldWeight")}
          value={metricValue((data) => formatWeight(data.soldWeightKg))}
          description={t("reports.soldWeightDescription")}
          badge={t("reports.realData")}
        />
        <MetricCard
          title={t("reports.salesCount")}
          value={metricValue((data) => numberFormatter.format(data.salesCount))}
          description={t("reports.salesCountDescription")}
          badge={t("reports.realData")}
        />
        <MetricCard
          title={t("reports.grossSales")}
          value={metricValue((data) => currencyFormatter.format(data.grossSalesValue))}
          description={t("reports.grossSalesDescription")}
          badge={t("reports.realData")}
        />
      </div>

      {!metricsUnavailable && statistics !== null && (
        <div className="mt-8">
          <WasteDistributionChart data={statistics.distribution} />
        </div>
      )}
    </section>
  );
}

function ReportsPage() {
  const { user } = useAuth();
  return user ? <UserReportsPage key={user.id} userId={user.id} /> : null;
}

export default ReportsPage;
