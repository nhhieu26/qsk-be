import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected"),
  );
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB error:", err),
  );

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(
    `MongoDB connected: ${mongoose.connection.name} (${mongoose.connection.host}:${mongoose.connection.port})`,
  );
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
