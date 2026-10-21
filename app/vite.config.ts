import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const server = `http://127.0.0.1:${process.env.PORT ?? 4747}`;

export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": server,
      "/ws": { target: server.replace("http", "ws"), ws: true },
      "/SKILL.md": server,
      "/agent-guide.md": server,
    },
  },
});
