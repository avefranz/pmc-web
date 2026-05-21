import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils/cn";

const LANGUAGES = ["en", "th", "ru"] as const;
type Lang = (typeof LANGUAGES)[number];

const LABELS: Record<Lang, string> = { en: "EN", th: "TH", ru: "RU" };
const TITLES: Record<Lang, string> = {
  en: "Switch to Thai",
  th: "Switch to Russian",
  ru: "Switch to English",
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (LANGUAGES.includes(i18n.language as Lang) ? i18n.language : "en") as Lang;

  function cycle() {
    const idx = LANGUAGES.indexOf(current);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    i18n.changeLanguage(next);
    localStorage.setItem("pmc_lang", next);
  }

  return (
    <button
      onClick={cycle}
      title={TITLES[current]}
      className={cn(
        "h-8 px-2.5 rounded-full flex items-center gap-1 text-xs font-semibold transition-colors",
        "text-fg-muted hover:text-fg hover:bg-bg-subtle",
        className,
      )}
    >
      {LANGUAGES.map((lang, i) => (
        <span key={lang} className="flex items-center gap-1">
          {i > 0 && <span className="text-fg-muted/40">/</span>}
          <span className={cn("transition-opacity", current === lang ? "opacity-100" : "opacity-35")}>
            {LABELS[lang]}
          </span>
        </span>
      ))}
    </button>
  );
}
