import type { Types, UpdateQuery } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import type { ActorContext } from "../access/access.middleware.js";
import {
  ProductModel,
  type Product,
  type ProductDocument,
} from "../product/product.model.js";
import type { MovementType } from "./stock.constants.js";
import { StockMovementModel } from "./stock-movement.model.js";

/**
 * Điểm DUY NHẤT được phép đổi `product.stock`, luôn kèm một dòng thẻ kho.
 *
 * MongoDB đang chạy standalone (không replica set) nên không có transaction:
 * - đổi tồn bằng một lệnh update nguyên tử có điều kiện (không bao giờ âm,
 *   chạy đồng thời vẫn đúng);
 * - nếu ghi thẻ kho lỗi thì hoàn lại tồn rồi ném lỗi tiếp.
 */

export type MovementMeta = {
  type: MovementType;
  reason?: string;
  reference?: string;
  counterparty?: string;
  unitPrice?: number;
  loan?: Types.ObjectId;
};

type ProductRef = { _id: Types.ObjectId; name: string };

function productFilter(actor: ActorContext, productId: string | Types.ObjectId) {
  return { _id: productId, shopId: actor.shopId };
}

async function findProductOrThrow(actor: ActorContext, productId: string | Types.ObjectId) {
  const product = await ProductModel.findOne(productFilter(actor, productId));
  if (!product) throw AppError.notFound("Không tìm thấy sản phẩm");
  return product;
}

async function insertMovement(
  actor: ActorContext,
  product: ProductRef,
  before: number,
  after: number,
  meta: MovementMeta,
) {
  await StockMovementModel.create({
    shopId: actor.shopId,
    product: product._id,
    productName: product.name,
    quantity: after - before,
    before,
    after,
    actor: actor.actorName,
    actorId: actor.actorId,
    ...meta,
  });
}

/** Ghi dòng thẻ kho cho tồn đầu của sản phẩm vừa tạo (tồn đã nằm sẵn trong product). */
async function recordOpeningStock(
  actor: ActorContext,
  product: ProductRef & { stock: number },
  meta: MovementMeta,
) {
  await insertMovement(actor, product, 0, product.stock, meta);
}

/**
 * Cộng/trừ tồn `delta` (khác 0). Trừ quá tồn thì ném 409 và không đổi gì.
 * `extraSet` cập nhật thêm field khác của sản phẩm trong cùng lệnh (vd giá nhập).
 */
async function changeStock(
  actor: ActorContext,
  productId: string | Types.ObjectId,
  delta: number,
  meta: MovementMeta,
  extraSet: Partial<Product> = {},
): Promise<ProductDocument> {
  const filter = {
    ...productFilter(actor, productId),
    ...(delta < 0 && { stock: { $gte: -delta } }),
  };
  const update: UpdateQuery<Product> = { $inc: { stock: delta }, $set: extraSet };
  const updated = await ProductModel.findOneAndUpdate(filter, update, { returnDocument: "after" });

  if (!updated) {
    const current = await findProductOrThrow(actor, productId);
    throw AppError.conflict(
      `Kho chỉ còn ${current.stock}, không trừ được ${-delta}`,
    );
  }

  try {
    await insertMovement(actor, updated, updated.stock - delta, updated.stock, meta);
  } catch (err) {
    await ProductModel.updateOne({ _id: updated._id }, { $inc: { stock: -delta } });
    throw err;
  }
  return updated;
}

/**
 * Đặt tồn bằng số đếm được (kiểm kê). Trả `changed: false` và không ghi thẻ
 * kho nếu tồn đã đúng bằng số đếm.
 */
async function setStock(
  actor: ActorContext,
  productId: string | Types.ObjectId,
  counted: number,
  meta: MovementMeta,
): Promise<{ product: ProductDocument; changed: boolean }> {
  const previous = await ProductModel.findOneAndUpdate(
    { ...productFilter(actor, productId), stock: { $ne: counted } },
    { $set: { stock: counted } },
    { returnDocument: "before" },
  );

  if (!previous) {
    return { product: await findProductOrThrow(actor, productId), changed: false };
  }

  try {
    await insertMovement(actor, previous, previous.stock, counted, meta);
  } catch (err) {
    await ProductModel.updateOne(
      { _id: previous._id, stock: counted },
      { $set: { stock: previous.stock } },
    );
    throw err;
  }
  const product = await findProductOrThrow(actor, productId);
  return { product, changed: true };
}

export const stockLedger = { recordOpeningStock, changeStock, setStock, findProductOrThrow };
