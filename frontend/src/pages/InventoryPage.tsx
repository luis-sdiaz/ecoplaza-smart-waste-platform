import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import InventoryTable from "../components/InventoryTable";
import { useTranslation } from "react-i18next";

const inventoryItems = [
  {
    id: "LOT-001",
    category: "Orgánicos",
    quantity: 120,
    unitPrice: 1800,
    status: "Disponible",
  },
  {
    id: "LOT-002",
    category: "Reciclables",
    quantity: 98,
    unitPrice: 2500,
    status: "Disponible",
  },
  {
    id: "LOT-003",
    category: "Orgánicos",
    quantity: 76,
    unitPrice: 900,
    status: "Disponible",
  },
  {
    id: "LOT-004",
    category: "Reciclables",
    quantity: 92,
    unitPrice: 2200,
    status: "Reservado",
  },
];

function InventoryPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("inventory.eyebrow")}
        title={t("inventory.title")}
        description={t("inventory.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("inventory.inventoryMaterial")}
          value="386 kg"
          description={t("inventory.availableReserved")}
        />

        <MetricCard
          title={t("inventory.lots")}
          value="4"
          description={t("inventory.activeInventory")}
        />

        <MetricCard
          title={t("inventory.categories")}
          value="2"
          description={t("inventory.availableCategories")}
        />

        <MetricCard
          title={t("inventory.estimatedValue")}
          value="$731.800"
          description={t("inventory.currentInventoryEstimate")}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("inventory.inventoryLots")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("inventory.lotsDescription")}
          </p>
        </div>

        <div className="mt-4">
          <InventoryTable items={inventoryItems} />
        </div>
      </div>
    </section>
  );
}

export default InventoryPage;
