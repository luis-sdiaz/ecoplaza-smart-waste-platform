import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Moon, RotateCcw, Sun } from "lucide-react";
import i18n, { LANGUAGE_STORAGE_KEY } from "../i18n/config";
import { useTheme } from "../theme/useTheme";
import {
  useDemoVisibility,
  DEFAULT_SHOW_DEMO_DATA,
} from "../context/DemoVisibilityContext";
import ResetPreferencesDialog from "./ResetPreferencesDialog";
import SuccessToast from "./SuccessToast";

const WEIGHT_UNIT_STORAGE_KEY = "ecoplaza-weight-unit";
const DEMO_CATEGORY_STORAGE_KEY = "ecoplaza-demo-category";

const DEFAULT_LANGUAGE = "es";
const DEFAULT_WEIGHT_UNIT = "kg";
const DEFAULT_DEMO_CATEGORY = "organic";
const DEFAULT_THEME = "light";

type WeightUnit = typeof DEFAULT_WEIGHT_UNIT;
type DemoCategory = "organic" | "recyclable" | "non-recyclable";

function readWeightUnit(): WeightUnit {
  try {
    const unit = localStorage.getItem(WEIGHT_UNIT_STORAGE_KEY);
    return unit === DEFAULT_WEIGHT_UNIT ? unit : DEFAULT_WEIGHT_UNIT;
  } catch {
    return DEFAULT_WEIGHT_UNIT;
  }
}

function readDemoCategory(): DemoCategory {
  try {
    const category = localStorage.getItem(DEMO_CATEGORY_STORAGE_KEY);
    return category === "organic" ||
      category === "recyclable" ||
      category === "non-recyclable"
      ? category
      : DEFAULT_DEMO_CATEGORY;
  } catch {
    return DEFAULT_DEMO_CATEGORY;
  }
}

function storePreference(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // The current session remains usable when storage is unavailable.
    return false;
  }
}

function SettingsPanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { showDemoData, setShowDemoData } = useDemoVisibility();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(readWeightUnit);
  const [demoCategory, setDemoCategory] =
    useState<DemoCategory>(readDemoCategory);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetToastId, setResetToastId] = useState<number | null>(null);

  const closeResetToast = useCallback((): void => {
    setResetToastId(null);
  }, []);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    if (language !== "es" && language !== "en") {
      return;
    }
    void i18n.changeLanguage(language);
    storePreference(LANGUAGE_STORAGE_KEY, language);
  };

  const handleWeightUnitChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    if (event.target.value !== DEFAULT_WEIGHT_UNIT) return;

    setWeightUnit(DEFAULT_WEIGHT_UNIT);
    storePreference(WEIGHT_UNIT_STORAGE_KEY, DEFAULT_WEIGHT_UNIT);
  };

  const handleDemoCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const category = event.target.value;
    if (
      category !== "organic" &&
      category !== "recyclable" &&
      category !== "non-recyclable"
    ) {
      return;
    }

    setDemoCategory(category);
    storePreference(DEMO_CATEGORY_STORAGE_KEY, category);
  };

  const handleResetPreferences = (): void => {
    const resetPreferences = async (): Promise<void> => {
      try {
        await i18n.changeLanguage(DEFAULT_LANGUAGE);

        const languageStored = storePreference(
          LANGUAGE_STORAGE_KEY,
          DEFAULT_LANGUAGE,
        );

        setWeightUnit(DEFAULT_WEIGHT_UNIT);
        const weightUnitStored = storePreference(
          WEIGHT_UNIT_STORAGE_KEY,
          DEFAULT_WEIGHT_UNIT,
        );

        setDemoCategory(DEFAULT_DEMO_CATEGORY);
        const demoCategoryStored = storePreference(
          DEMO_CATEGORY_STORAGE_KEY,
          DEFAULT_DEMO_CATEGORY,
        );

        setShowDemoData(DEFAULT_SHOW_DEMO_DATA);
        setTheme(DEFAULT_THEME);
        setIsResetDialogOpen(false);

        if (languageStored && weightUnitStored && demoCategoryStored) {
          setResetToastId((currentId) => (currentId ?? 0) + 1);
        }
      } catch {
        return;
      }
    };

    void resetPreferences();
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <article className="ecoplaza-settings-card rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
        <h2 className="text-base font-semibold text-ecoplaza-text">
          {t("settings.general")}
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          {t("settings.generalDescription")}
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("settings.language")}
            </label>

            <select
              id="language"
              value={i18n.language}
              onChange={handleLanguageChange}
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="es">{t("settings.spanish")}</option>
              <option value="en">{t("settings.english")}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="weight-unit"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              {t("settings.weightUnit")}
            </label>

            <select
              id="weight-unit"
              value={weightUnit}
              onChange={handleWeightUnitChange}
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="kg">{t("settings.kilograms")}</option>
            </select>
          </div>
        </div>
      </article>

      <article className="ecoplaza-settings-card rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
        <h2 className="text-base font-semibold text-ecoplaza-text">
          {t("settings.demoContainer")}
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          {t("settings.demoDescription")}
        </p>

        <div className="mt-6">
          <label
            htmlFor="demo-category"
            className="block text-sm font-medium text-ecoplaza-text"
          >
            {t("settings.assignedCategory")}
          </label>

          <select
            id="demo-category"
            value={demoCategory}
            onChange={handleDemoCategoryChange}
            className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
          >
            <option value="organic">{t("common.wasteOrganic")}</option>
            <option value="recyclable">{t("common.wasteRecyclable")}</option>
            <option value="non-recyclable">{t("common.wasteNonRecyclable")}</option>
          </select>

          <p className="mt-3 text-xs leading-5 text-ecoplaza-text-muted">
            {t("settings.demoHelp")}
          </p>

          <div className="mt-5 border-t border-ecoplaza-border pt-4">
            <label htmlFor="show-demo-data" className="flex items-center justify-between cursor-pointer">
              <span className="mr-3">
                <span className="block text-sm font-medium text-ecoplaza-text">{t("settings.showDemoData")}</span>
                <span className="mt-0.5 block text-xs leading-5 text-ecoplaza-text-muted">{t("settings.showDemoDataDescription")}</span>
              </span>
              <input
                id="show-demo-data"
                type="checkbox"
                checked={showDemoData}
                onChange={(event) => setShowDemoData(event.target.checked)}
                className="h-5 w-5 rounded border-ecoplaza-border text-ecoplaza-primary focus:ring-ecoplaza-primary"
              />
            </label>
          </div>
        </div>
      </article>

      <article className="ecoplaza-settings-card col-span-2 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
        <h2 className="text-base font-semibold text-ecoplaza-text">
          {t("settings.appearance")}
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          {t("settings.appearanceDescription")}
        </p>

        <fieldset className="mt-5 grid max-w-2xl grid-cols-2 gap-3">
          <legend className="sr-only">{t("settings.appearance")}</legend>

          <label className="cursor-pointer">
            <input
              type="radio"
              name="appearance-theme"
              value="light"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
              className="peer sr-only"
            />

            <span
              className={`block rounded-xl border p-3 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ecoplaza-primary ${
                theme === "light"
                  ? "border-ecoplaza-primary bg-ecoplaza-background"
                  : "ecoplaza-theme-option-inactive border-ecoplaza-border hover:border-ecoplaza-primary/60 hover:bg-ecoplaza-background"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-ecoplaza-text">
                  <Sun size={18} strokeWidth={2} aria-hidden="true" />
                  {t("settings.lightTheme")}
                </span>

                {theme === "light" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ecoplaza-primary text-ecoplaza-on-primary">
                    <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span className="sr-only">{t("settings.selectedTheme")}</span>
                  </span>
                )}
              </span>

              <span className="mt-3 flex h-16 overflow-hidden rounded-lg border border-[#d8e4dc] bg-[#f3f8f5] p-2">
                <span className="w-6 shrink-0 rounded-md bg-white p-1">
                  <span className="block h-2 rounded-sm bg-[#1f7a4d]" />
                  <span className="mt-1 block h-1 rounded-sm bg-[#d8e4dc]" />
                  <span className="mt-1 block h-1 rounded-sm bg-[#d8e4dc]" />
                </span>
                <span className="ml-2 flex-1">
                  <span className="block h-2 w-2/5 rounded-sm bg-[#18332a]" />
                  <span className="mt-2 block h-8 rounded-md border border-[#d8e4dc] bg-white" />
                </span>
              </span>
            </span>
          </label>

          <label className="cursor-pointer">
            <input
              type="radio"
              name="appearance-theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
              className="peer sr-only"
            />

            <span
              className={`block rounded-xl border p-3 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ecoplaza-primary ${
                theme === "dark"
                  ? "border-ecoplaza-primary bg-ecoplaza-background"
                  : "ecoplaza-theme-option-inactive border-ecoplaza-border hover:border-ecoplaza-primary/60 hover:bg-ecoplaza-background"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-ecoplaza-text">
                  <Moon size={18} strokeWidth={2} aria-hidden="true" />
                  {t("settings.darkTheme")}
                </span>

                {theme === "dark" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ecoplaza-primary text-ecoplaza-on-primary">
                    <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span className="sr-only">{t("settings.selectedTheme")}</span>
                  </span>
                )}
              </span>

              <span className="mt-3 flex h-16 overflow-hidden rounded-lg border border-[#34483b] bg-[#101a15] p-2">
                <span className="w-6 shrink-0 rounded-md bg-[#0c1812] p-1">
                  <span className="block h-2 rounded-sm bg-[#168552]" />
                  <span className="mt-1 block h-1 rounded-sm bg-[#34483b]" />
                  <span className="mt-1 block h-1 rounded-sm bg-[#34483b]" />
                </span>
                <span className="ml-2 flex-1">
                  <span className="block h-2 w-2/5 rounded-sm bg-[#e8f2eb]" />
                  <span className="mt-2 block h-8 rounded-md border border-[#34483b] bg-[#18251e]" />
                </span>
              </span>
            </span>
          </label>
        </fieldset>
      </article>

      <section className="ecoplaza-settings-card col-span-2 flex items-center justify-between gap-6 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-background text-ecoplaza-primary">
            <RotateCcw size={20} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ecoplaza-text">
              {t("settings.resetPreferences")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-ecoplaza-text-muted">
              {t("settings.resetPreferencesDescription")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsResetDialogOpen(true)}
          className="shrink-0 cursor-pointer rounded-xl border border-ecoplaza-border px-4 py-2.5 text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
        >
          {t("settings.resetPreferences")}
        </button>
      </section>

      <ResetPreferencesDialog
        isOpen={isResetDialogOpen}
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetPreferences}
      />

      {resetToastId !== null && (
        <SuccessToast
          key={resetToastId}
          title={t("settings.resetSuccessTitle")}
          description={t("settings.resetSuccessDescription")}
          closeLabel={t("settings.dismissNotification")}
          onClose={closeResetToast}
        />
      )}
    </div>
  );
}

export default SettingsPanel;
