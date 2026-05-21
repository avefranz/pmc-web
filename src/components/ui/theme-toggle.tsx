import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/lib/stores/theme.store";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title={theme === "dark" ? t("common.themeDark") : t("common.themeLight")}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
        "text-fg-muted hover:text-fg hover:bg-bg-subtle",
        className,
      )}
    >
      {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
