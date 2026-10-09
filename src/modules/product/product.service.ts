import { AppError } from "../../utils/app-error.js";
import type { ActorContext } from "../access/access.middleware.js";
import { OPENING_STOCK_REASON } from "../stock/stock.constants.js";
import { stockLedger } from "../stock/stock-ledger.js";
import type { DocumentType } from "./product.constants.js";
import { ProductModel, type ProductDocument } from "./product.model.js";
import type {
  AddDocumentInput,
  CreateProductInput,
  ProductInput,
  UpdateClaimsInput,
} from "./product.schema.js";
import { toProductViews, toSingleProductView } from "./product.view.js";

/** Field tuỳ chọn của form sản phẩm: không gửi lên nghĩa là xoá. */
const OPTIONAL_PRODUCT_FIELDS = [
  "customerGroup",
  "category",
  "costPrice",
  "registrationNo",
  "shelfLife",
] as const satisfies readonly (keyof ProductInput)[];

/** Sắp xếp tiếng Việt đúng thứ tự chữ cái (Đ sau D, bỏ qua hoa/thường). */
const VIETNAMESE_COLLATION = { locale: "vi", strength: 1 } as const;

async function updateOwnProduct(
  actor: ActorContext,
  id: string,
  update: Parameters<typeof ProductModel.findOneAndUpdate>[1],
  options: { updatePipeline?: boolean } = {},
): Promise<ProductDocument> {
  const product = await ProductModel.findOneAndUpdate(
    { _id: id, shopId: actor.shopId },
    update,
    { returnDocument: "after", runValidators: true, ...options },
  );
  if (!product) throw AppError.notFound("Không tìm thấy sản phẩm");
  return product;
}

async function list(actor: ActorContext) {
  const products = await ProductModel.find({ shopId: actor.shopId })
    .collation(VIETNAMESE_COLLATION)
    .sort({ name: 1 });
  return toProductViews(actor, products);
}

async function get(actor: ActorContext, id: string) {
  const product = await stockLedger.findProductOrThrow(actor, id);
  return toSingleProductView(actor, product);
}

type CreateOptions = {
  /** Lý do ghi ở dòng thẻ kho tồn đầu, mặc định "Tồn đầu khi tạo sản phẩm". */
  openingReason?: string;
};

async function create(
  actor: ActorContext,
  input: CreateProductInput,
  options: CreateOptions = {},
) {
  const { initialStock, menuGroup, ...fields } = input;
  const product = await ProductModel.create({
    ...fields,
    ...(menuGroup && { menuGroup }),
    shopId: actor.shopId,
    stock: initialStock,
    createdBy: actor.actorId,
  });

  if (initialStock > 0) {
    try {
      await stockLedger.recordOpeningStock(actor, product, {
        type: "import",
        reason: options.openingReason ?? OPENING_STOCK_REASON,
      });
    } catch (err) {
      await ProductModel.deleteOne({ _id: product._id });
      throw err;
    }
  }
  return toSingleProductView(actor, product);
}

async function update(actor: ActorContext, id: string, input: ProductInput) {
  const { menuGroup, ...fields } = input;
  const clearMenuGroup = menuGroup === "";
  const unsetFields = [
    ...OPTIONAL_PRODUCT_FIELDS.filter((f) => input[f] === undefined),
    ...(clearMenuGroup ? ["menuGroup"] : []),
  ];
  const product = await updateOwnProduct(actor, id, {
    $set: { ...fields, ...(menuGroup && { menuGroup }) },
    ...(unsetFields.length > 0 && {
      $unset: Object.fromEntries(unsetFields.map((f) => [f, 1])),
    }),
  });
  return toSingleProductView(actor, product);
}

async function updateClaims(actor: ActorContext, id: string, input: UpdateClaimsInput) {
  const product = await updateOwnProduct(actor, id, { $set: { claims: input.claims } });
  return toSingleProductView(actor, product);
}

/** Mỗi loại giấy chỉ giữ một bản: thêm cùng loại thì thay bản cũ (một lệnh nguyên tử). */
async function addDocument(actor: ActorContext, id: string, input: AddDocumentInput) {
  const document = {
    ...input,
    uploadedBy: actor.actorName,
    uploadedAt: new Date(),
  };
  const product = await updateOwnProduct(
    actor,
    id,
    [
      {
        $set: {
          documents: {
            $concatArrays: [
              {
                $filter: {
                  input: "$documents",
                  cond: { $ne: ["$$this.type", input.type] },
                },
              },
              [{ $literal: document }],
            ],
          },
        },
      },
    ],
    { updatePipeline: true },
  );
  return toSingleProductView(actor, product);
}

async function removeDocument(actor: ActorContext, id: string, type: DocumentType) {
  const product = await updateOwnProduct(actor, id, {
    $pull: { documents: { type } },
  });
  return toSingleProductView(actor, product);
}

export const productService = {
  list,
  get,
  create,
  update,
  updateClaims,
  addDocument,
  removeDocument,
};
