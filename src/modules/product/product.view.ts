import type { Types } from "mongoose";
import type { ActorContext } from "../access/access.middleware.js";
import { LoanModel, type LoanDocument } from "../stock/loan.model.js";
import type { ProductDocument } from "./product.model.js";

/**
 * Hình dạng sản phẩm trả cho client, khớp type `Product` ở
 * frontend/src/features/products/types.ts. Field tuỳ chọn không có giá trị
 * thì bỏ hẳn khỏi JSON (frontend dùng `undefined`).
 */
export type ProductLoanView = {
  id: string;
  borrower: string;
  /** Số còn đang mượn. */
  quantity: number;
  date: string;
  note?: string;
};

export type ProductView = ReturnType<typeof toProductView>;

function toLoanView(loan: LoanDocument): ProductLoanView {
  return {
    id: loan.id,
    borrower: loan.borrower,
    quantity: loan.remaining,
    date: loan.date,
    ...(loan.note && { note: loan.note }),
  };
}

export function toProductView(product: ProductDocument, loans: readonly LoanDocument[]) {
  return {
    id: product.id as string,
    name: product.name,
    ...(product.customerGroup && { customerGroup: product.customerGroup }),
    ...(product.category && { category: product.category }),
    price: product.price,
    ...(product.costPrice !== undefined && product.costPrice !== null && { costPrice: product.costPrice }),
    stock: product.stock,
    threshold: product.threshold,
    ...(product.registrationNo && { registrationNo: product.registrationNo }),
    ...(product.shelfLife && { shelfLife: product.shelfLife }),
    ...(product.menuGroup && { menuGroup: product.menuGroup }),
    priceOnRequest: product.priceOnRequest,
    ...(product.weight && { weight: product.weight }),
    documents: product.documents.map((doc) => ({
      type: doc.type,
      url: doc.url,
      ...(doc.fileName && { fileName: doc.fileName }),
      ...(doc.expiresAt && { expiresAt: doc.expiresAt }),
      ...(doc.note && { note: doc.note }),
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
    claims: [...product.claims],
    loans: loans.map(toLoanView),
  };
}

async function openLoansByProduct(
  actor: ActorContext,
  productIds: readonly Types.ObjectId[],
): Promise<Map<string, LoanDocument[]>> {
  const loans = await LoanModel.find({
    shopId: actor.shopId,
    product: { $in: productIds },
    remaining: { $gt: 0 },
  }).sort({ createdAt: 1 });

  return loans.reduce((byProduct, loan) => {
    const key = loan.product.toString();
    return byProduct.set(key, [...(byProduct.get(key) ?? []), loan]);
  }, new Map<string, LoanDocument[]>());
}

export async function toProductViews(
  actor: ActorContext,
  products: readonly ProductDocument[],
): Promise<ProductView[]> {
  const loans = await openLoansByProduct(actor, products.map((p) => p._id));
  return products.map((p) => toProductView(p, loans.get(p.id) ?? []));
}

export async function toSingleProductView(
  actor: ActorContext,
  product: ProductDocument,
): Promise<ProductView> {
  const [view] = await toProductViews(actor, [product]);
  return view;
}
