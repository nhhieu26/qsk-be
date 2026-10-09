import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import { getActor } from "../access/access.middleware.js";
import type {
  AdjustStockInput,
  ImportStockInput,
  ListMovementsQuery,
  ReturnLoanInput,
  StocktakeInput,
} from "./stock.schema.js";
import { stockService } from "./stock.service.js";

async function listMovements(req: Request, res: Response) {
  const movements = await stockService.listMovements(
    getActor(req),
    req.query as unknown as ListMovementsQuery,
  );
  sendSuccess(res, { movements });
}

async function importStock(req: Request, res: Response) {
  const product = await stockService.importStock(
    getActor(req),
    req.body as ImportStockInput,
  );
  sendSuccess(res, { product }, { message: "Đã ghi nhập kho" });
}

async function adjust(req: Request, res: Response) {
  const product = await stockService.adjust(
    getActor(req),
    req.body as AdjustStockInput,
  );
  sendSuccess(res, { product }, { message: "Đã ghi vào thẻ kho" });
}

async function stocktake(req: Request, res: Response) {
  const result = await stockService.stocktake(
    getActor(req),
    req.body as StocktakeInput,
  );
  sendSuccess(res, result, { message: "Đã ghi kiểm kê" });
}

async function returnLoan(req: Request<{ loanId: string }>, res: Response) {
  const product = await stockService.returnLoan(
    getActor(req),
    req.params.loanId,
    req.body as ReturnLoanInput,
  );
  sendSuccess(res, { product }, { message: "Đã nhận lại vào kho" });
}

export const stockController = {
  listMovements,
  importStock,
  adjust,
  stocktake,
  returnLoan,
};
