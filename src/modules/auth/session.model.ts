import { Schema, model } from "mongoose";

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    miduAccessToken: { type: String, required: true },
    miduRefreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export const SessionModel = model("Session", sessionSchema);
