import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4747);
const host = process.env.HOST ?? "127.0.0.1";
const dbPath = process.env.KOMORE_DB ?? resolve(HERE, "../data/komore.db");

const { server, close } = startServer({
  dbPath,
  staticDir: process.env.KOMORE_STATIC ?? resolve(HERE, "../dist"),
  publicUrl: process.env.KOMORE_PUBLIC_URL,
});

server.listen(port, host, () => {
  console.log(`komore server on http://${host}:${port}  (db: ${dbPath})`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    close().finally(() => process.exit(0));
  });
}
