import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const loadEnvFile = (file: string): void => {
  dotenv.config({ path: path.resolve(__dirname, "../../", file), quiet: true });
};

// .env is loaded first and wins (dotenv never overrides existing vars);
// its NODE_ENV picks which .env.<NODE_ENV> file supplies the defaults.
loadEnvFile(".env");
loadEnvFile(`.env.${process.env.NODE_ENV ?? "development"}`);

/** Biến tuỳ chọn: chuỗi rỗng coi như chưa cấu hình. */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1),
  AUTH_SERVICE_URL: z.url(),
  AUTH_FRONTEND_URL: z.url(),
  SSO_CLIENT_ID: z.string().min(1),
  SSO_CLIENT_SECRET: z.string().min(1),
  SSO_REDIRECT_URI: z.url(),

  /** Tỉnh/thành đặt quầy: giới hạn giao hoả tốc. */
  STORE_PROVINCE: z.string().default("Hà Nội"),

  // ViettelPost: thiếu thì API báo phí trả 503, các phần khác vẫn chạy.
  VIETTELPOST_BASE_URL: z.url().default("https://partner.viettelpost.vn"),
  VIETTELPOST_USERNAME: optionalString,
  VIETTELPOST_PASSWORD: optionalString,
  // Tài khoản chủ hàng chưa được cấp quyền đối tác API thì /Login từ chối:
  // khi đó Login bằng tài khoản đối tác rồi ownerconnect bằng tài khoản chủ hàng.
  VIETTELPOST_PARTNER_USERNAME: optionalString,
  VIETTELPOST_PARTNER_PASSWORD: optionalString,
  VIETTELPOST_SERVICE: z.string().default("VSL6"),
  VIETTELPOST_SENDER_NAME: optionalString,
  VIETTELPOST_SENDER_PHONE: optionalString,
  VIETTELPOST_SENDER_ADDRESS: optionalString,

  // Tài khoản nhận chuyển khoản (VietQR). Thiếu thì API thông tin thanh toán trả 503.
  PAYMENT_BANK_BIN: optionalString,
  PAYMENT_BANK_NAME: optionalString,
  PAYMENT_ACCOUNT_NUMBER: optionalString,
  PAYMENT_ACCOUNT_NAME: optionalString,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
