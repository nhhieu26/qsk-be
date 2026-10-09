import { Schema, model } from "mongoose";

/** Token dài hạn (ownerconnect) của ViettelPost, khoá theo username. */
const viettelPostTokenSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    token: { type: String, required: true },
  },
  { timestamps: true },
);

export const ViettelPostTokenModel = model(
  "ViettelPostToken",
  viettelPostTokenSchema,
);
