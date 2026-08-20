import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_URL ?? "https://buildsense-qltv.onrender.com",
          changeOrigin: true,
          secure: true,
        },
      },
    },
    plugins: [
      tanstackRouter({ autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      viteTsconfigPaths(),
    ],
  };
});
