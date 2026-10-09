import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Mỗi file test dùng MongoDB trong bộ nhớ riêng, chạy tuần tự cho dễ đọc log.
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Biến môi trường giả để env.ts parse được; test KHÔNG kết nối DB thật.
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://memory-server-set-in-setup",
      AUTH_SERVICE_URL: "http://auth.test",
      AUTH_FRONTEND_URL: "http://auth-frontend.test",
      SSO_CLIENT_ID: "quay-suc-khoe",
      SSO_CLIENT_SECRET: "test-secret",
      SSO_REDIRECT_URI: "http://localhost:5173/auth/callback",
      // Chặn dùng tài khoản thật trong .env; test mock client ViettelPost.
      VIETTELPOST_USERNAME: "test-vtp-user",
      VIETTELPOST_PASSWORD: "test-vtp-pass",
      VIETTELPOST_PARTNER_USERNAME: "test-vtp-partner",
      VIETTELPOST_PARTNER_PASSWORD: "test-vtp-partner-pass",
      // Server giả lập ViettelPost trong test/viettelpost.client.test.ts.
      VIETTELPOST_BASE_URL: "http://127.0.0.1:39876",
      VIETTELPOST_SENDER_ADDRESS: "Số 1, Phường Hà Đông, Hà Nội",
      STORE_PROVINCE: "Hà Nội",
      PAYMENT_BANK_BIN: "970436",
      PAYMENT_BANK_NAME: "Vietcombank",
      PAYMENT_ACCOUNT_NUMBER: "0011001234567",
      PAYMENT_ACCOUNT_NAME: "QUAY SUC KHOE TEST",
    },
  },
});
