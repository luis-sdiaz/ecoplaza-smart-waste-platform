import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface WasteRegistrationValues {
  category: "organic" | "recyclable" | "nonRecyclable";
  container: "container01" | "container02" | "container03";
  weight: number;
}

interface WasteRegistrationModalProps {
  onClose: () => void;
  onSubmit: (values: WasteRegistrationValues) => void;
}

function WasteRegistrationModal({
  onClose,
  onSubmit,
}: WasteRegistrationModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [container, setContainer] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!category) {
      setError(t("waste.selectCategory"));
      return;
    }

    if (!container) {
      setError(t("waste.selectContainer"));
      return;
    }

    const parsedWeight = Number(weight);
    if (!weight || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError(t("waste.invalidWeight"));
      return;
    }

    onSubmit({
      category: category as WasteRegistrationValues["category"],
      container: container as WasteRegistrationValues["container"],
      weight: parsedWeight,
    });
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/25 p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waste-registration-title"
        className="w-full max-w-md rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-xl"
      >
        <h2
          id="waste-registration-title"
          className="text-lg font-semibold text-ecoplaza-text"
        >
          {t("waste.modalTitle")}
        </h2>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="waste-category"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("waste.categoryField")}
            </label>
            <select
              id="waste-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setError("");
              }}
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="">{t("waste.selectOption")}</option>
              <option value="organic">{t("common.wasteOrganic")}</option>
              <option value="recyclable">{t("common.wasteRecyclable")}</option>
              <option value="nonRecyclable">
                {t("common.wasteNonRecoverable")}
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="waste-container"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("waste.containerField")}
            </label>
            <select
              id="waste-container"
              value={container}
              onChange={(event) => {
                setContainer(event.target.value);
                setError("");
              }}
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="">{t("waste.selectOption")}</option>
              <option value="container01">{`${t("waste.container")} 01`}</option>
              <option value="container02">{`${t("waste.container")} 02`}</option>
              <option value="container03">{`${t("waste.container")} 03`}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="waste-weight"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("waste.weightField")} ({t("common.kg")})
            </label>
            <input
              id="waste-weight"
              type="number"
              step="any"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
                setError("");
              }}
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-ecoplaza-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted"
            >
              {t("waste.cancel")}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              {t("waste.register")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WasteRegistrationModal;
