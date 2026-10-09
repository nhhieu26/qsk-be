/**
 * Chuyển đơn cũ sang luồng trạng thái mới và điền `searchText` để tìm kiếm.
 *
 *   npx tsx src/scripts/migrate-order-statuses.ts [--dry-run]
 *
 * pending → new, confirmed → approved; đơn `confirmed` đã có mã vận đơn thì
 * coi như đã bàn giao (awaitingPickup). Chạy lại an toàn (idempotent).
 */
import { parseArgs } from "node:util";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { OrderModel } from "../modules/order/order.model.js";
import { buildOrderSearchText } from "../modules/order/order.service.js";

type LegacyRule = { from: string; to: string; filter?: Record<string, unknown> };

const STATUS_RULES: readonly LegacyRule[] = [
  { from: "pending", to: "new" },
  { from: "confirmed", to: "awaitingPickup", filter: { "shipping.trackingCode": { $exists: true, $ne: "" } } },
  { from: "confirmed", to: "approved" },
];

async function migrateStatuses(dryRun: boolean) {
  for (const rule of STATUS_RULES) {
    const filter = { status: rule.from, ...rule.filter };
    const count = await OrderModel.collection.countDocuments(filter);
    console.log(`${rule.from} → ${rule.to}: ${count} đơn`);
    if (!dryRun && count > 0) await OrderModel.collection.updateMany(filter, { $set: { status: rule.to } });
  }
}

async function fillSearchText(dryRun: boolean) {
  const missing = OrderModel.find({ $or: [{ searchText: { $exists: false } }, { searchText: "" }] });
  let count = 0;
  for await (const order of missing) {
    count += 1;
    if (dryRun) continue;
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: { searchText: buildOrderSearchText(order.code, order.customer.name, order.customer.phone) } },
    );
  }
  console.log(`Điền searchText: ${count} đơn`);
}

async function main() {
  const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
  const dryRun = values["dry-run"] ?? false;
  await connectDatabase();
  try {
    if (dryRun) console.log("Chạy thử, không ghi gì.");
    await migrateStatuses(dryRun);
    await fillSearchText(dryRun);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
