import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

export interface WasteRegistrationValues {
  category: "organic" | "recyclable" | "nonRecyclable";
  container: "container01" | "container02" | "container03";
  weight: number;
}

interface WasteRegistrationModalProps {
  onClose: () => void;
  onSubmit: (values: WasteRegistrationValues) => boolean;
}

type WasteRegistrationErrors = {
  category: boolean;
  container: boolean;
  weight: boolean;
};

const emptyErrors: WasteRegistrationErrors = {
  category: false,
  container: false,
  weight: false,
};

function WasteRegistrationModal({
  onClose,
  onSubmit,
}: WasteRegistrationModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [container, setContainer] = useState("");
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<WasteRegistrationErrors>(emptyErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = Number(weight);
    const nextErrors: WasteRegistrationErrors = {
      category: category === "",
      container: container === "",
      weight:
        weight.trim() === "" ||
        !Number.isFinite(parsedWeight) ||
        parsedWeight <= 0,
    };

    setErrors(nextErrors);

    if (nextErrors.category || nextErrors.container || nextErrors.weight) {
      return;
    }

    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const didRegister = onSubmit({
      category: category as WasteRegistrationValues["category"],
      container: container as WasteRegistrationValues["container"],
      weight: parsedWeight,
    });

    if (!didRegister) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const fieldClassName = (hasError: boolean): string =>
    `mt-2 w-full rounded-xl border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
      hasError
        ? "border-ecoplaza-danger focus-visible:outline-ecoplaza-danger"
        : "border-ecoplaza-border focus-visible:outline-ecoplaza-accent"
    }`;

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

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
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
                if (errors.category) {
                  setErrors((current) => ({ ...current, category: false }));
                }
              }}
              aria-invalid={errors.category}
              aria-describedby={errors.category ? "waste-category-error" : undefined}
              className={fieldClassName(errors.category)}
            >
              <option value="">{t("waste.selectOption")}</option>
              <option value="organic">{t("common.wasteOrganic")}</option>
              <option value="recyclable">{t("common.wasteRecyclable")}</option>
              <option value="nonRecyclable">
                {t("common.wasteNonRecoverable")}
              </option>
            </select>
            {errors.category && (
              <p id="waste-category-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("waste.selectCategory")}
              </p>
            )}
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
                if (errors.container) {
                  setErrors((current) => ({ ...current, container: false }));
                }
              }}
              aria-invalid={errors.container}
              aria-describedby={errors.container ? "waste-container-error" : undefined}
              className={fieldClassName(errors.container)}
            >
              <option value="">{t("waste.selectOption")}</option>
              <option value="container01">{`${t("waste.container")} 01`}</option>
              <option value="container02">{`${t("waste.container")} 02`}</option>
              <option value="container03">{`${t("waste.container")} 03`}</option>
            </select>
            {errors.container && (
              <p id="waste-container-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("waste.selectContainer")}
              </p>
            )}
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
              inputMode="decimal"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
                if (errors.weight) {
                  setErrors((current) => ({ ...current, weight: false }));
                }
              }}
              aria-invalid={errors.weight}
              aria-describedby={errors.weight ? "waste-weight-error" : undefined}
              className={fieldClassName(errors.weight)}
            />
            {errors.weight && (
              <p id="waste-weight-error" role="alert" className="mt-1.5 text-sm text-ecoplaza-danger">
                {t("waste.invalidWeight")}
              </p>
            )}
          </div>

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
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="rounded-xl bg-ecoplaza-primary px-4 py-2.5 text-sm font-medium text-ecoplaza-on-primary disabled:cursor-not-allowed disabled:opacity-60"
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
