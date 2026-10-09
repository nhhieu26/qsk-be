import crypto from "node:crypto";

export function randomString(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Base64url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}
