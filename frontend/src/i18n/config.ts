import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./translations/en";
import es from "./translations/es";

export const LANGUAGE_STORAGE_KEY = "ecoplaza-language";

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage = savedLanguage === "en" || savedLanguage === "es" ? savedLanguage : "es";

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "es",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;