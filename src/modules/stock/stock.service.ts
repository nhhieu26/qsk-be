import { AppError } from "../../utils/app-error.js";
import { todayInAppTimeZone } from "../../utils/date.js";
import type { ActorContext } from "../access/access.middleware.js";
import { toSingleProductView } from "../product/product.view.js";
import { LoanModel } from "./loan.model.js";
import {
  MOVEMENT_DIRECTIONS,
  STOCKTAKE_ALL_REASON,
} from "./stock.constants.js";
import { stockLedger } from "./stock-ledger.js";
import { StockMovementModel, type StockMovementDocument } from "./stock-movement.model.js";
import type {
  AdjustStockInput,
  ImportStockInput,
  ListMovementsQuery,
  ReturnLoanInput,
  StocktakeInput,
} from "./stock.schema.js";

function toMovementView(m: StockMovementDocument) {
  return {
    id: m.id as string,
    productId: m.product.toString(),
    productName: m.productName,
    type: m.type,
    quantity: m.quantity,
    before: m.before,
    after: m.after,
    actor: m.actor,
    ...(m.reason && { reason: m.reason }),
    ...(m.reference && { reference: m.reference }),
    ...(m.counterparty && { counterparty: m.counterparty }),
    createdAt: m.createdAt.toISOString(),
  };
}

async function listMovements(actor: ActorContext, query: ListMovementsQuery) {
  const movements = await StockMovementModel.find({
    shopId: actor.shopId,
    ...(query.productId && { product: query.productId }),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(query.limit);
  return movements.map(toMovementView);
}

async function importStock(actor: ActorContext, input: ImportStockInput) {
  const product = await stockLedger.changeStock(
    actor,
    input.productId,
    input.quantity,
    {
      type: "import",
      reason: input.note,
      reference: input.reference,
      counterparty: input.supplier,
      unitPrice: input.unitPrice,
    },
    input.unitPrice !== undefined ? { costPrice: input.unitPrice } : {},
  );
  return toSingleProductView(actor, product);
}

type LendInput = {
  productId: string;
  quantity: number;
  reason: string;
  counterparty: string;
};

/** Cho mượn: tạo lượt mượn trước, trừ tồn sau; trừ tồn lỗi thì xoá lượt mượn. */
async function lendStock(actor: ActorContext, input: LendInput) {
  const loan = await LoanModel.create({
    shopId: actor.shopId,
    product: input.productId,
    borrower: input.counterparty,
    quantity: input.quantity,
    remaining: input.quantity,
    date: todayInAppTimeZone(),
    note: input.reason,
    createdBy: actor.actorId,
  });

  try {
    return await stockLedger.changeStock(actor, input.productId, -input.quantity, {
      type: "loan",
      reason: input.reason,
      counterparty: input.counterparty,
      loan: loan._id,
    });
  } catch (err) {
    await LoanModel.deleteOne({ _id: loan._id });
    throw err;
  }
}

async function adjust(actor: ActorContext, input: AdjustStockInput) {
  if (input.type === "stocktake") {
    const { product, changed } = await stockLedger.setStock(
      actor,
      input.productId,
      input.countedQuantity,
      { type: "stocktake", reason: input.reason },
    );
    if (!changed) throw AppError.badRequest("Số đếm khớp tồn, không có chênh lệch");
    return toSingleProductView(actor, product);
  }

  if (input.type === "loan") {
    if (!input.counterparty) throw AppError.badRequest("Ghi tên người mượn");
    const lendInput = { ...input, counterparty: input.counterparty };
    return toSingleProductView(actor, await lendStock(actor, lendInput));
  }

  const product = await stockLedger.changeStock(
    actor,
    input.productId,
    MOVEMENT_DIRECTIONS[input.type] * input.quantity,
    { type: input.type, reason: input.reason, counterparty: input.counterparty },
  );
  return toSingleProductView(actor, product);
}

/**
 * Kiểm kê cả kho: mỗi mặt hàng xử lý độc lập; mặt hàng không lệch thì bỏ qua.
 * Một mặt hàng lỗi (vd không tồn tại) thì dừng, các mặt trước đó vẫn giữ.
 */
async function stocktake(actor: ActorContext, input: StocktakeInput) {
  let adjustedCount = 0;
  for (const { productId, countedQuantity } of input.counts) {
    const { changed } = await stockLedger.setStock(actor, productId, countedQuantity, {
      type: "stocktake",
      reason: STOCKTAKE_ALL_REASON,
    });
    if (changed) adjustedCount += 1;
  }
  return { adjustedCount };
}

/** Nhận trả: giảm số đang mượn trước (có điều kiện), cộng tồn sau; lỗi thì hoàn lại. */
async function returnLoan(actor: ActorContext, loanId: string, input: ReturnLoanInput) {
  const loanFilter = { _id: loanId, shopId: actor.shopId, product: input.productId };
  const loan = await LoanModel.findOneAndUpdate(
    { ...loanFilter, remaining: { $gte: input.quantity } },
    { $inc: { remaining: -input.quantity } },
    { returnDocument: "after" },
  );

  if (!loan) {
    const current = await LoanModel.findOne(loanFilter);
    if (!current || current.remaining === 0) {
      throw AppError.notFound("Không tìm thấy lượt mượn");
    }
    throw AppError.badRequest(`Số lượng trả phải từ 1 đến ${current.remaining}`);
  }

  try {
    const product = await stockLedger.changeStock(actor, input.productId, input.quantity, {
      type: "return",
      reason: input.note,
      counterparty: loan.borrower,
      loan: loan._id,
    });
    return toSingleProductView(actor, product);
  } catch (err) {
    await LoanModel.updateOne({ _id: loan._id }, { $inc: { remaining: input.quantity } });
    throw err;
  }
}

export const stockService = {
  listMovements,
  importStock,
  adjust,
  stocktake,
  returnLoan,
};
