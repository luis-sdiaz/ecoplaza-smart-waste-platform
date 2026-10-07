import { useTranslation } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY } from "../i18n/config";

function SettingsPanel() {
  const { t } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    if (language !== "es" && language !== "en") {
      return;
    }
    void i18n.changeLanguage(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
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
              defaultValue="kg"
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="kg">{t("settings.kilograms")}</option>
            </select>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
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
            defaultValue="organic"
            className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
          >
            <option value="organic">{t("common.wasteOrganic")}</option>
            <option value="recyclable">{t("common.wasteRecyclable")}</option>
            <option value="non-recyclable">{t("common.wasteNonRecyclable")}</option>
          </select>

          <p className="mt-3 text-xs leading-5 text-ecoplaza-text-muted">
            {t("settings.demoHelp")}
          </p>
        </div>
      </article>
    </div>
  );
}

export default SettingsPanel;
