import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";
import { getActor } from "../access/access.middleware.js";
import {
  documentTypeParamSchema,
  type AddDocumentInput,
  type CreateProductInput,
  type ProductInput,
  type UpdateClaimsInput,
} from "./product.schema.js";
import { productService } from "./product.service.js";

type IdParams = { id: string };
type DocumentParams = IdParams & { type: string };

async function list(req: Request, res: Response) {
  const products = await productService.list(getActor(req));
  sendSuccess(res, { products });
}

async function get(req: Request<IdParams>, res: Response) {
  const product = await productService.get(getActor(req), req.params.id);
  sendSuccess(res, { product });
}

async function create(req: Request, res: Response) {
  const product = await productService.create(
    getActor(req),
    req.body as CreateProductInput,
  );
  sendCreated(res, { product }, "Đã thêm sản phẩm");
}

async function update(req: Request<IdParams>, res: Response) {
  const product = await productService.update(
    getActor(req),
    req.params.id,
    req.body as ProductInput,
  );
  sendSuccess(res, { product }, { message: "Đã lưu sản phẩm" });
}

async function updateClaims(req: Request<IdParams>, res: Response) {
  const product = await productService.updateClaims(
    getActor(req),
    req.params.id,
    req.body as UpdateClaimsInput,
  );
  sendSuccess(res, { product }, { message: "Đã lưu câu công dụng" });
}

async function addDocument(req: Request<IdParams>, res: Response) {
  const product = await productService.addDocument(
    getActor(req),
    req.params.id,
    req.body as AddDocumentInput,
  );
  sendSuccess(res, { product }, { message: "Đã lưu tài liệu" });
}

async function removeDocument(req: Request<DocumentParams>, res: Response) {
  const type = documentTypeParamSchema.safeParse(req.params.type);
  if (!type.success) throw AppError.notFound("Không có loại tài liệu này");

  const product = await productService.removeDocument(
    getActor(req),
    req.params.id,
    type.data,
  );
  sendSuccess(res, { product }, { message: "Đã gỡ tài liệu" });
}

export const productController = {
  list,
  get,
  create,
  update,
  updateClaims,
  addDocument,
  removeDocument,
};
