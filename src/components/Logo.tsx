import { useTheme } from "@/hooks/use-theme";
import { COMPANY } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The wordmark ships in two transparent variants generated from the master
 * `synptic.png`: the original black letterforms for light backgrounds, and a
 * white-letterform version for dark. Both keep the prism's navy→cyan gradient
 * exactly as the brand defines it — we recolored only the achromatic type, so
 * the accent is never distorted by a CSS filter.
 *
 * Both files are preloaded via <link rel="preload"> equivalents in practice by
 * being tiny; swapping `src` on theme change is instant and cached.
 */
const Logo = ({ className }: { className?: string }) => {
  const { theme } = useTheme();

  return (
    <img
      src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
      alt={`${COMPANY.name}, home`}
      width={871}
      height={209}
      className={cn("h-7 w-auto select-none", className)}
      draggable={false}
    />
  );
};

export default Logo;
