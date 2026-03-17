import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devPort = Number(env.VITE_DEV_PORT || "5173");
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000";

  return {
    server: {
      host: "::",
      port: Number.isFinite(devPort) ? devPort : 5173,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api/v1": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        "/health": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    },
  };
});
