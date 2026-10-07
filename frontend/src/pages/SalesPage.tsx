import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SalesTable from "../components/SalesTable";
import { useTranslation } from "react-i18next";

const sales = [
  {
    id: "SAL-001",
    buyer: "Reciclar del Sur",
    material: "Reciclables",
    quantity: 80,
    total: 640000,
    date: "03/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-002",
    buyer: "BioCompost Nariño",
    material: "Orgánicos",
    quantity: 72,
    total: 540000,
    date: "02/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-003",
    buyer: "EcoMercado Local",
    material: "Reciclables",
    quantity: 90,
    total: 780000,
    date: "01/10/2026",
    status: "Completada",
  },
  {
    id: "SAL-004",
    buyer: "Reciclar del Sur",
    material: "Reciclables",
    quantity: 70,
    total: 520000,
    date: "30/09/2026",
    status: "Completada",
  },
];
function SalesPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("sales.eyebrow")}
        title={t("sales.title")}
        description={t("sales.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("sales.completedSales")}
          value="4"
          description={t("sales.operations")}
        />

        <MetricCard
          title={t("dashboard.revenue")}
          value="$2.480.000"
          description={t("dashboard.accumulatedSales")}
        />

        <MetricCard
          title={t("sales.soldMaterial")}
          value="312 kg"
          description={t("sales.quantitySold")}
        />

        <MetricCard
          title={t("sales.servedBuyers")}
          value="3"
          description={t("sales.buyersWithSales")}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("sales.records")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("sales.recordsDescription")}
          </p>
        </div>

        <div className="mt-4">
          <SalesTable sales={sales} />
        </div>
      </div>
    </section>
  );
}

export default SalesPage;
