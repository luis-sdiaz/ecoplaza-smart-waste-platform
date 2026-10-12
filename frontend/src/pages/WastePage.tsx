import { useCallback, useRef, useState } from "react";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import SuccessToast from "../components/SuccessToast";
import WasteRecordTable, {
  type WasteRecord,
} from "../components/WasteRecordTable";
import WasteRegistrationModal, {
  type WasteRegistrationValues,
} from "../components/WasteRegistrationModal";
import { useTranslation } from "react-i18next";

const WASTE_RECORDS_STORAGE_KEY = "ecoplaza-waste-records";

type WasteRegistrationNotification = {
  id: number;
  variant: "success" | "error";
};

const baseWasteRecords: WasteRecord[] = [
  {
    id: "RES-001",
    category: "Orgánicos",
    weight: "18.4 kg",
    container: "Contenedor 01",
    date: "03/10/2026",
    status: "Disponible",
  },
  {
    id: "RES-002",
    category: "Reciclables",
    weight: "12.7 kg",
    container: "Contenedor 02",
    date: "03/10/2026",
    status: "Disponible",
  },
  {
    id: "RES-003",
    category: "No aprovechables",
    weight: "23.1 kg",
    container: "Contenedor 03",
    date: "02/10/2026",
    status: "Registrado",
  },
  {
    id: "RES-004",
    category: "Orgánicos",
    weight: "15.8 kg",
    container: "Contenedor 01",
    date: "02/10/2026",
    status: "Disponible",
  },
];

function readSavedWasteRecords(): WasteRecord[] {
  try {
    const storedRecords = localStorage.getItem(WASTE_RECORDS_STORAGE_KEY);
    if (!storedRecords) return [];

    const parsedRecords: unknown = JSON.parse(storedRecords);
    if (!Array.isArray(parsedRecords)) {
      return [];
    }

    return parsedRecords.filter(
      (record): record is WasteRecord =>
        typeof record === "object" &&
        record !== null &&
        typeof record.id === "string" &&
        typeof record.category === "string" &&
        typeof record.weight === "number" &&
        Number.isFinite(record.weight) &&
        record.weight > 0 &&
        typeof record.container === "string" &&
        typeof record.date === "string" &&
        record.status === "available",
    );
  } catch {
    return [];
  }
}

function getCurrentDate() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

function WastePage() {
  const { t } = useTranslation();
  const [savedRecords, setSavedRecords] = useState<WasteRecord[]>(
    readSavedWasteRecords,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] =
    useState<WasteRegistrationNotification | null>(null);
  const notificationSequenceRef = useRef(0);
  const records = [...baseWasteRecords, ...savedRecords];

  const showNotification = (variant: WasteRegistrationNotification["variant"]): void => {
    notificationSequenceRef.current += 1;
    setNotification({ id: notificationSequenceRef.current, variant });
  };

  const closeNotification = useCallback((): void => {
    setNotification(null);
  }, []);

  const handleRegisterWaste = (values: WasteRegistrationValues): boolean => {
    const highestId = records.reduce((highest, record) => {
      const match = /^RES-(\d+)$/.exec(record.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const newRecord: WasteRecord = {
      id: `RES-${String(highestId + 1).padStart(3, "0")}`,
      category: values.category,
      weight: values.weight,
      container: values.container,
      date: getCurrentDate(),
      status: "available",
    };
    const updatedRecords = [...savedRecords, newRecord];

    try {
      localStorage.setItem(
        WASTE_RECORDS_STORAGE_KEY,
        JSON.stringify(updatedRecords),
      );
    } catch {
      showNotification("error");
      return false;
    }

    setSavedRecords(updatedRecords);
    setIsModalOpen(false);
    showNotification("success");
    return true;
  };

  return (
    <section className="p-8">
      <PageHeader
        eyebrow={t("waste.eyebrow")}
        title={t("waste.title")}
        description={t("waste.description")}
      />

      <div className="mt-8 grid grid-cols-4 gap-4">
        <MetricCard
          title={t("waste.totalRegistered")}
          value="1.248 kg"
          description={t("waste.accumulatedWaste")}
        />

        <MetricCard
          title={t("common.organic")}
          value="540 kg"
          description={t("waste.percentageOfTotal", { percentage: 43 })}
        />

        <MetricCard
          title={t("common.recyclable")}
          value="430 kg"
          description={t("waste.percentageOfTotal", { percentage: 34 })}
        />

        <MetricCard
          title={t("common.nonRecyclable")}
          value="278 kg"
          description={t("waste.percentageOfTotal", { percentage: 23 })}
        />
      </div>
      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
          <h2 className="text-lg font-semibold text-ecoplaza-text">
            {t("waste.recentRecords")}
          </h2>

          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("waste.recentDescription")}
          </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNotification(null);
              setIsModalOpen(true);
            }}
            className="shrink-0 rounded-xl bg-ecoplaza-primary px-4 py-3 text-sm font-medium text-ecoplaza-on-primary"
          >
            + {t("waste.registerButton")}
          </button>
        </div>

        <div className="mt-4">
          <WasteRecordTable records={records} />
        </div>
      </div>
      {isModalOpen && (
        <WasteRegistrationModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleRegisterWaste}
        />
      )}
      {notification && (
        <SuccessToast
          key={notification.id}
          title={t(
            notification.variant === "success"
              ? "waste.registerSuccessTitle"
              : "waste.registerErrorTitle",
          )}
          description={t(
            notification.variant === "success"
              ? "waste.registerSuccessDescription"
              : "waste.registerErrorDescription",
          )}
          closeLabel={t("waste.dismissNotification")}
          onClose={closeNotification}
          duration={notification.variant === "error" ? 7000 : undefined}
          variant={notification.variant}
        />
      )}
    </section>
  );
}

export default WastePage;
