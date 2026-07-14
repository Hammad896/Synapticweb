import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  /**
   * Fail the PRODUCTION build if Supabase is not configured.
   *
   * Without this, `npm run build` silently produces a bundle that falls back to
   * browser-local storage and the hardcoded dev credential gate — a deployment
   * that *looks* like a working HR system while storing salaries in whatever
   * browser happens to open it, behind a password anyone can read in the JS.
   *
   * That failure is invisible until it matters, which is the worst kind. So the
   * build refuses. Dev builds still fall back, so a fresh clone runs offline.
   */
  if (mode === "production") {
    const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].filter(
      (key) => !env[key],
    );

    if (missing.length > 0) {
      throw new Error(
        [
          "",
          "╔══════════════════════════════════════════════════════════════════════╗",
          "║  PRODUCTION BUILD BLOCKED — Supabase is not configured               ║",
          "╚══════════════════════════════════════════════════════════════════════╝",
          "",
          `Missing: ${missing.join(", ")}`,
          "",
          "Building without these produces an app that:",
          "  • stores employee records in localStorage (one browser, no backup),",
          "  • and gates /admin behind a password embedded in the bundle.",
          "",
          "Set them in .env, or run `npm run build:dev` if you deliberately want",
          "the offline fallback build.",
          "",
          "See docs/HR_MODULE.md §1.",
          "",
        ].join("\n"),
      );
    }
  }

  return {
    server: {
      host: true,
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Lets the auth layer strip the dev credential adapter from prod bundles.
      __DEV_AUTH__: JSON.stringify(mode !== "production"),
    },
  };
});
