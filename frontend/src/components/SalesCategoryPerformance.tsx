import { LoaderCircle, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_MONETARY_FRACTION_DIGITS } from "../services/monetarySafety";

export interface SalesCategoryPerformanceItem {
  category: string;
  salesCount?: number;
  count?: number;
  soldWeightKg?: number;
  weight?: number;
  weightKg?: number;
  grossSalesValue?: number;
  revenue?: number;
  averagePricePerKg?: number;
  averagePrice?: number;
  percentage?: number;
  participationPercentage?: number;
}

export interface SalesCategoryPerformanceProps {
  data?: readonly SalesCategoryPerformanceItem[];
  isFiltered?: boolean;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

function SalesCategoryPerformance({
  data = [],
  isFiltered = false,
  isLoading = false,
  title,
  subtitle,
  className = "",
  role,
  ariaLabel,
  testId = "sales-category-performance",
}: SalesCategoryPerformanceProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const numberFormatter = new Intl.NumberFormat(locale);
  const weightFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: MAX_MONETARY_FRACTION_DIGITS,
  });
  const percentageFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });

  const displayTitle = title ?? t("reports.salesByCategory");
  const displaySubtitle = subtitle ?? t("reports.salesByCategoryDescription");
  const cardRole = role ?? "region";
  const cardAriaLabel = ariaLabel ?? displayTitle;

  // Cálculo de totales agregados para derivación resiliente de porcentajes si no vienen definidos
  const totalRevenueAggregate = data.reduce((sum, item) => {
    const rev = item.grossSalesValue ?? item.revenue ?? 0;
    return sum + (typeof rev === "number" && !Number.isNaN(rev) && rev > 0 ? rev : 0);
  }, 0);

  const totalWeightAggregate = data.reduce((sum, item) => {
    const w = item.soldWeightKg ?? item.weight ?? item.weightKg ?? 0;
    return sum + (typeof w === "number" && !Number.isNaN(w) && w > 0 ? w : 0);
  }, 0);

  const normalizedItems = data.map((item) => {
    const rawCategory = item.category ?? "";
    const categoryLabel =
      t(`common.${rawCategory}`, "") || rawCategory || t("common.other");

    const salesCount =
      typeof item.salesCount === "number" && !Number.isNaN(item.salesCount)
        ? Math.max(0, item.salesCount)
        : typeof item.count === "number" && !Number.isNaN(item.count)
          ? Math.max(0, item.count)
          : 0;

    const soldWeightKg =
      typeof item.soldWeightKg === "number" && !Number.isNaN(item.soldWeightKg)
        ? Math.max(0, item.soldWeightKg)
        : typeof item.weight === "number" && !Number.isNaN(item.weight)
          ? Math.max(0, item.weight)
          : typeof item.weightKg === "number" && !Number.isNaN(item.weightKg)
            ? Math.max(0, item.weightKg)
            : 0;

    const grossSalesValue =
      typeof item.grossSalesValue === "number" && !Number.isNaN(item.grossSalesValue)
        ? Math.max(0, item.grossSalesValue)
        : typeof item.revenue === "number" && !Number.isNaN(item.revenue)
          ? Math.max(0, item.revenue)
          : 0;

    const averagePricePerKg =
      typeof item.averagePricePerKg === "number" && !Number.isNaN(item.averagePricePerKg)
        ? Math.max(0, item.averagePricePerKg)
        : typeof item.averagePrice === "number" && !Number.isNaN(item.averagePrice)
          ? Math.max(0, item.averagePrice)
          : soldWeightKg > 0
            ? grossSalesValue / soldWeightKg
            : 0;

    const percentage =
      typeof item.percentage === "number" && !Number.isNaN(item.percentage)
        ? Math.min(100, Math.max(0, item.percentage))
        : typeof item.participationPercentage === "number" &&
            !Number.isNaN(item.participationPercentage)
          ? Math.min(100, Math.max(0, item.participationPercentage))
          : totalRevenueAggregate > 0
            ? Number(((grossSalesValue / totalRevenueAggregate) * 100).toFixed(1))
            : totalWeightAggregate > 0
              ? Number(((soldWeightKg / totalWeightAggregate) * 100).toFixed(1))
              : 0;

    return {
      rawCategory,
      categoryLabel,
      salesCount,
      soldWeightKg,
      grossSalesValue,
      averagePricePerKg,
      percentage,
    };
  });

  const hasSales = normalizedItems.some(
    (item) => item.salesCount > 0 || item.grossSalesValue > 0 || item.soldWeightKg > 0,
  );

  return (
    <article
      data-testid={testId}
      role={cardRole}
      aria-label={cardAriaLabel}
      className={`glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-200 ${className}`}
    >
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">{displayTitle}</h2>
          {displaySubtitle && (
            <p className="mt-1 text-sm text-ecoplaza-text-muted">{displaySubtitle}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-ecoplaza-background px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-text-muted">
          {t(isFiltered ? "reports.filteredData" : "reports.realData")}
        </span>
      </div>

      {/* Estado de carga */}
      {isLoading ? (
        <div
          role="status"
          className="mt-6 flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-ecoplaza-text-muted"
        >
          <LoaderCircle
            className="animate-spin text-ecoplaza-primary"
            size={24}
            aria-hidden="true"
          />
          <span>{t("reports.loadingSalesCategory")}</span>
        </div>
      ) : normalizedItems.length === 0 ? (
        /* Estado vacío cuando no hay ítems en la colección */
        <div className="mt-6 flex min-h-40 flex-col items-center justify-center rounded-xl bg-ecoplaza-background p-5 text-center">
          <PackageOpen
            size={26}
            strokeWidth={1.8}
            className="text-ecoplaza-primary"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">
            {t("reports.emptySalesCategoryTitle")}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ecoplaza-text-muted">
            {t(
              isFiltered
                ? "reports.emptySalesByCategoryPeriod"
                : "reports.emptySalesByCategory",
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Aviso informativo cuando hay categorías pero ninguna tiene ventas registradas */}
          {!hasSales && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text-muted"
            >
              {t(
                isFiltered
                  ? "reports.emptySalesByCategoryPeriod"
                  : "reports.emptySalesByCategory",
              )}
            </p>
          )}

          {/* Resumen accesible oculto para tecnologías asistivas */}
          <div className="sr-only">
            <table>
              <caption>{displayTitle}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("common.category")}</th>
                  <th scope="col">{t("reports.categorySalesCount")}</th>
                  <th scope="col">{t("reports.categorySoldWeight")}</th>
                  <th scope="col">{t("reports.categoryGrossRevenue")}</th>
                  <th scope="col">{t("reports.categoryParticipation")}</th>
                </tr>
              </thead>
              <tbody>
                {normalizedItems.map((item) => (
                  <tr key={item.rawCategory}>
                    <th scope="row">{item.categoryLabel}</th>
                    <td>{numberFormatter.format(item.salesCount)}</td>
                    <td>
                      {weightFormatter.format(item.soldWeightKg)} {t("common.kg")}
                    </td>
                    <td>{currencyFormatter.format(item.grossSalesValue)}</td>
                    <td>{percentageFormatter.format(item.percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grilla visual de tarjetas de categorías */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {normalizedItems.map((item) => (
              <section
                key={item.rawCategory}
                className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background p-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ecoplaza-text">
                    {item.categoryLabel}
                  </h3>
                  <span className="rounded-md bg-ecoplaza-surface px-2 py-0.5 text-xs font-semibold text-ecoplaza-primary">
                    {percentageFormatter.format(item.percentage)}%
                  </span>
                </div>

                {/* Barra de progreso de participación de la categoría */}
                <div
                  role="progressbar"
                  aria-valuenow={item.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.categoryLabel}: ${percentageFormatter.format(item.percentage)}%`}
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ecoplaza-text-muted">
                      {t("reports.categorySalesCount")}
                    </dt>
                    <dd className="font-semibold text-ecoplaza-text">
                      {numberFormatter.format(item.salesCount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ecoplaza-text-muted">
                      {t("reports.categorySoldWeight")}
                    </dt>
                    <dd className="font-semibold text-ecoplaza-text">
                      {weightFormatter.format(item.soldWeightKg)} {t("common.kg")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ecoplaza-text-muted">
                      {t("reports.categoryGrossRevenue")}
                    </dt>
                    <dd className="text-right font-semibold text-ecoplaza-primary">
                      {currencyFormatter.format(item.grossSalesValue)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ecoplaza-text-muted">
                      {t("reports.categoryAveragePrice")}
                    </dt>
                    <dd className="text-right font-semibold text-ecoplaza-primary">
                      {currencyFormatter.format(item.averagePricePerKg)} / {t("common.kg")}
                    </dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

export default SalesCategoryPerformance;
