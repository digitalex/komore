import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const server = `http://127.0.0.1:${process.env.PORT ?? 4747}`;

export default defineConfig({
  root: "web",
  plugins: [react()],
  resolve: {
    // The Graphical component library's public entry (components/graphical/index.ts).
    alias: { "@graphical": fileURLToPath(new URL("./components/graphical/index.ts", import.meta.url)) },
  },
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
