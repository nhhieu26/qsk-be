import { env } from "../../config/env.js";
import type { ActorContext } from "../access/access.middleware.js";
import { bankNameOf } from "./settings.constants.js";
import { ShopSettingsModel, type ShopSettingsDocument } from "./settings.model.js";
import { appliedRules } from "./settings.rules.js";
import type { UpdatePaymentAccountInput, UpdateStoreInput } from "./settings.schema.js";

export type PaymentAccount = {
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

const EMPTY_STORE = { name: "", phone: "", address: "", code: "" };

function toSettingsView(doc: ShopSettingsDocument | null) {
  const store = doc?.store;
  const account = doc?.paymentAccount;
  return {
    store: store
      ? { name: store.name ?? "", phone: store.phone ?? "", address: store.address ?? "", code: store.code ?? "" }
      : EMPTY_STORE,
    ...(account && {
      paymentAccount: {
        bankBin: account.bankBin,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        updatedBy: account.updatedBy,
        updatedAt: account.updatedAt.toISOString(),
      },
    }),
    rules: appliedRules(),
  };
}

async function get(actor: ActorContext) {
  return toSettingsView(await ShopSettingsModel.findOne({ shopId: actor.shopId }));
}

async function upsert(actor: ActorContext, set: Record<string, unknown>) {
  const doc = await ShopSettingsModel.findOneAndUpdate(
    { shopId: actor.shopId },
    { $set: set, $setOnInsert: { shopId: actor.shopId } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  return toSettingsView(doc);
}

function updateStore(actor: ActorContext, input: UpdateStoreInput) {
  return upsert(actor, { store: input });
}

function updatePaymentAccount(actor: ActorContext, input: UpdatePaymentAccountInput) {
  return upsert(actor, {
    paymentAccount: {
      ...input,
      bankName: bankNameOf(input.bankBin) ?? input.bankBin,
      updatedBy: actor.actorName,
      updatedAt: new Date(),
    },
  });
}

/**
 * Tài khoản nhận chuyển khoản của quầy: ưu tiên Cài đặt, chưa cài thì dùng
 * biến môi trường `PAYMENT_*` (cấu hình chung). Không có cả hai → `undefined`.
 */
async function getPaymentAccount(shopId: string): Promise<PaymentAccount | undefined> {
  const doc = await ShopSettingsModel.findOne({ shopId }).select("paymentAccount");
  const saved = doc?.paymentAccount;
  if (saved) {
    return {
      bankBin: saved.bankBin,
      bankName: saved.bankName,
      accountNumber: saved.accountNumber,
      accountName: saved.accountName,
    };
  }
  const { PAYMENT_BANK_BIN: bankBin, PAYMENT_BANK_NAME: bankName } = env;
  const { PAYMENT_ACCOUNT_NUMBER: accountNumber, PAYMENT_ACCOUNT_NAME: accountName } = env;
  if (!bankBin || !bankName || !accountNumber || !accountName) return undefined;
  return { bankBin, bankName, accountNumber, accountName };
}

export const settingsService = { get, updateStore, updatePaymentAccount, getPaymentAccount };
