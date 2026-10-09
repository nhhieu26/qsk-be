import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

let server: Server;

async function bootstrap() {
  await connectDatabase();
  server = app.listen(env.PORT, () => {
    console.log(
      `Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 10000).unref();
  server?.close();
  await disconnectDatabase();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
