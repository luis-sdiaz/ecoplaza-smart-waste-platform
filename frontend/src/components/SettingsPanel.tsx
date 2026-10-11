import { useTranslation } from "react-i18next";
import { Check, Moon, Sun } from "lucide-react";
import i18n, { LANGUAGE_STORAGE_KEY } from "../i18n/config";
import { useTheme } from "../theme/useTheme";

function SettingsPanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

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
              defaultValue="kg"
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
    </div>
  );
}

export default SettingsPanel;
