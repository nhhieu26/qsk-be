import type { OrderDocument } from "./order.model.js";

/** Hình dạng đơn trả client, khớp type `Order` ở frontend/src/features/sales/types.ts. */
export function toOrderView(o: OrderDocument) {
  const { shipping, invoice } = o;
  const recipient = shipping.recipient;
  return {
    id: o.id as string,
    code: o.code,
    createdAt: o.createdAt.toISOString(),
    createdBy: o.createdBy,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    ...(o.paidAt && { paidAt: o.paidAt.toISOString() }),
    customer: {
      id: o.customer.ref.toString(),
      name: o.customer.name,
      phone: o.customer.phone,
      ...(o.customer.email && { email: o.customer.email }),
    },
    shipping: {
      method: shipping.method,
      fee: shipping.fee,
      ...(recipient && {
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          address: {
            province: recipient.address.province,
            ward: recipient.address.ward,
            street: recipient.address.street,
            ...(recipient.address.provinceId && { provinceId: recipient.address.provinceId }),
            ...(recipient.address.wardId && { wardId: recipient.address.wardId }),
          },
        },
      }),
      ...(shipping.trackingCode && { trackingCode: shipping.trackingCode }),
      ...(shipping.note && { note: shipping.note }),
    },
    ...(invoice && {
      invoice: {
        buyerType: invoice.buyerType,
        buyerName: invoice.buyerName,
        ...(invoice.taxCode && { taxCode: invoice.taxCode }),
        address: invoice.address,
        email: invoice.email,
      },
    }),
    lines: o.lines.map((l) => ({
      productId: l.product.toString(),
      name: l.name,
      price: l.price,
      quantity: l.quantity,
    })),
    pointsUsed: o.pointsUsed,
    totals: {
      subtotal: o.totals.subtotal,
      shippingFee: o.totals.shippingFee,
      pointsDiscount: o.totals.pointsDiscount,
      total: o.totals.total,
      earnedPoints: o.totals.earnedPoints,
    },
    ...(o.note && { note: o.note }),
    ...(o.cancelReason && { cancelReason: o.cancelReason }),
  };
}

export type OrderView = ReturnType<typeof toOrderView>;
