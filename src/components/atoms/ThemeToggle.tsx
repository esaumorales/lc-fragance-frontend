"use client";

import { Icon } from "@/components/atoms/Icon";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      <Icon
        icon={theme === "dark" ? "mdi:weather-sunny" : "mdi:weather-night"}
        className="h-5 w-5"
      />
    </button>
  );
}
