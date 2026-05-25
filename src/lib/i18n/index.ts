import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import th from "./th";
import ru from "./ru";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
      ru: { translation: ru },
    },
    lng: localStorage.getItem("pmc_lang") ?? "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Disable Suspense for language switches — all translations are
      // pre-bundled so there's nothing async to wait for, and Suspense
      // can silently swallow the re-render that updates the language.
      useSuspense: false,
    },
  });

export default i18n;
