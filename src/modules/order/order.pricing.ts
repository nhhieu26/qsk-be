import { AppError } from "../../utils/app-error.js";
import type { ActorContext } from "../access/access.middleware.js";
import { ProductModel, type ProductDocument } from "../product/product.model.js";
import { parcelWeight } from "../shipping/shipping.service.js";
import { subtotalOf } from "./order.rules.js";

export type PricedLine = {
  product: ProductDocument;
  name: string;
  price: number;
  quantity: number;
};

/**
 * Đọc lại sản phẩm từ DB và chốt giá theo giá hiện tại (bỏ qua giá client gửi).
 * Chặn: sản phẩm không có, hàng giá liên hệ, số lượng vượt tồn.
 */
export async function priceLines(
  actor: ActorContext,
  lines: readonly { productId: string; quantity: number }[],
): Promise<PricedLine[]> {
  const products = await ProductModel.find({
    shopId: actor.shopId,
    _id: { $in: lines.map((l) => l.productId) },
  });
  const byId = new Map(products.map((p) => [p.id as string, p]));

  return lines.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product) throw AppError.notFound("Không tìm thấy sản phẩm");
    if (product.priceOnRequest) {
      throw AppError.badRequest(`${product.name} là hàng giá liên hệ, cần báo giá trước khi bán`);
    }
    if (quantity > product.stock) {
      throw AppError.badRequest(`${product.name} chỉ còn ${product.stock} trong kho`);
    }
    return { product, name: product.name, price: product.price, quantity };
  });
}

export function summarizeLines(lines: readonly PricedLine[]) {
  return {
    subtotal: subtotalOf(lines),
    weight: parcelWeight(lines.map((l) => ({ weight: l.product.weight, quantity: l.quantity }))),
  };
}
