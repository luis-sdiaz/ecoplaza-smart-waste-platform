import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import BuyerTable from "../components/BuyerTable";
import { useTranslation } from "react-i18next";

const buyers = [
  {
    id: "BUY-001",
    name: "Reciclar del Sur",
    type: "Empresa recicladora",
    interest: "Reciclables",
    contact: "contacto@reciclardelsur.co",
    status: "Activo",
  },
  {
    id: "BUY-002",
    name: "BioCompost Nariño",
    type: "Productor de compost",
    interest: "Orgánicos",
    contact: "ventas@biocompost.co",
    status: "Activo",
  },
  {
    id: "BUY-003",
    name: "EcoMercado Local",
    type: "Comerciante",
    interest: "Reciclables",
    contact: "compras@ecomercado.co",
    status: "Interesado",
  },
  {
    id: "BUY-004",
    name: "Asociación Verde",
    type: "Asociación",
    interest: "Orgánicos",
    contact: "gestion@asociacionverde.co",
    status: "Activo",
  },
];
function BuyersPage() {
  const { t } = useTranslation();
  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("buyers.eyebrow")}
        title={t("buyers.title")}
        description={t("buyers.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("buyers.registered")}
          value="4"
          description={t("buyers.registeredContacts")}
        />

        <MetricCard
          title={t("buyers.active")}
          value="3"
          description={t("buyers.recentActivity")}
        />

        <MetricCard
          title={t("buyers.recyclableInterest")}
          value="2"
          description={t("buyers.registered")}
        />

        <MetricCard
          title={t("buyers.organicInterest")}
          value="2"
          description={t("buyers.registered")}
        />
      </div>
      <div className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("buyers.records")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("buyers.recordsDescription")}
          </p>
        </div>

        <div className="mt-4">
          <BuyerTable buyers={buyers} />
        </div>
      </div>
    </section>
  );
}

export default BuyersPage;
