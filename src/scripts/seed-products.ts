/**
 * Nhập danh mục sản phẩm chuẩn vào một quầy.
 *
 *   npx tsx src/scripts/seed-products.ts --shop-id <shopId> [--dry-run]
 *   (bash: npm run seed:products -- --shop-id <shopId>; PowerShell nuốt `--`
 *   nên dùng lệnh npx ở trên)
 *
 * Chạy lại an toàn: sản phẩm trùng tên (không phân biệt hoa/thường, dấu) trong
 * quầy thì bỏ qua. Tồn đầu ghi thẻ kho như khi tạo sản phẩm trên giao diện.
 */
import { parseArgs } from "node:util";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import type { ActorContext } from "../modules/access/access.middleware.js";
import { ProductModel } from "../modules/product/product.model.js";
import { createProductSchema } from "../modules/product/product.schema.js";
import { productService } from "../modules/product/product.service.js";
import { UserModel } from "../modules/user/user.model.js";
import { STANDARD_PRODUCTS } from "./data/standard-products.js";

const NAME_MATCH_COLLATION = { locale: "vi", strength: 1 } as const;
const OPENING_REASON = "Tồn chuyển từ phần mềm cũ (bản Vercel)";

function readArgs() {
  const { values } = parseArgs({
    options: {
      "shop-id": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const shopId = values["shop-id"]?.trim();
  if (!shopId) throw new Error("Thiếu --shop-id <shopId>");
  return { shopId, dryRun: values["dry-run"] ?? false };
}

/** Người thao tác ghi vào thẻ kho: chủ quầy nếu có, không thì tên hệ thống. */
async function resolveActor(shopId: string): Promise<ActorContext> {
  const owner = await UserModel.findOne({ shopId }).sort({ createdAt: 1 });
  if (!owner) throw new Error(`Không có tài khoản nào thuộc quầy ${shopId}`);
  return {
    shopId,
    actorId: owner._id,
    actorName: owner.fullName || owner.phoneNumber,
  };
}

async function existsInShop(shopId: string, name: string) {
  const found = await ProductModel.findOne({ shopId, name })
    .collation(NAME_MATCH_COLLATION)
    .select("_id");
  return found !== null;
}

async function seed() {
  const { shopId, dryRun } = readArgs();
  await connectDatabase();
  try {
    const actor = await resolveActor(shopId);
    console.log(`Quầy ${shopId}, người nhập: ${actor.actorName}${dryRun ? " (chạy thử)" : ""}`);

    let created = 0;
    for (const { claims, ...raw } of STANDARD_PRODUCTS) {
      const input = createProductSchema.parse(raw);
      if (await existsInShop(shopId, input.name)) {
        console.log(`  bỏ qua (đã có): ${input.name}`);
        continue;
      }
      if (!dryRun) {
        const product = await productService.create(actor, input, {
          openingReason: OPENING_REASON,
        });
        if (claims.length > 0) {
          await productService.updateClaims(actor, product.id, { claims: [...claims] });
        }
      }
      created += 1;
      console.log(`  ${dryRun ? "sẽ thêm" : "đã thêm"}: ${input.name} (tồn ${input.initialStock})`);
    }
    console.log(`Xong: ${created}/${STANDARD_PRODUCTS.length} sản phẩm ${dryRun ? "sẽ được thêm" : "đã thêm"}.`);
  } finally {
    await disconnectDatabase();
  }
}

seed().catch((err: unknown) => {
  console.error("Nhập sản phẩm thất bại:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
