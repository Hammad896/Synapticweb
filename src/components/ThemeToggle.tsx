import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Icon-only control, so the accessible name comes from aria-label. The icon
 * shows the theme you will GET, not the one you are in — the standard mental
 * model for this control.
 */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full",
        "text-muted-foreground transition-all duration-300 ease-apple",
        "hover:scale-[1.02] hover:text-foreground",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
};

export default ThemeToggle;
