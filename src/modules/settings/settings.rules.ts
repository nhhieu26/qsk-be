import { env } from "../../config/env.js";
import { POINT_EARN_RATE } from "../order/order.rules.js";
import { DEFAULT_PRODUCT_WEIGHT_GRAMS } from "../product/product.constants.js";
import { SHIPPING_METHODS } from "../shipping/shipping.constants.js";

export type RuleGroup = "sales" | "shipping" | "stock";

export type AppliedRule = {
  group: RuleGroup;
  label: string;
  value: string;
};

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

/**
 * Quy tắc hệ thống ĐANG thực thi, dựng từ chính hằng số/cấu hình mà code dùng
 * để tính tiền, nên màn Cài đặt không bao giờ hiện khác thực tế.
 */
export function appliedRules(): AppliedRule[] {
  return [
    { group: "sales", label: "Tích điểm Mi khi mua hàng", value: `${POINT_EARN_RATE * 100}% tiền hàng khách trả` },
    { group: "sales", label: "Thời điểm cộng điểm Mi", value: "Khi đơn hoàn tất" },
    { group: "sales", label: "Dùng điểm Mi", value: "1 điểm = 1đ, không trừ vào phí ship" },
    { group: "sales", label: "Huỷ đơn", value: "Hoàn kho và hoàn điểm đã dùng, trước khi hàng rời quầy" },
    { group: "sales", label: "Hàng giá liên hệ", value: "Không bán tại quầy, cần báo giá trước" },
    { group: "shipping", label: "Phí giao Viettel Post", value: `Theo bảng giá ViettelPost, dịch vụ ${env.VIETTELPOST_SERVICE}` },
    { group: "shipping", label: "Miễn phí giao Viettel Post", value: `Đơn từ ${formatVnd(SHIPPING_METHODS.viettel.freeFrom)}` },
    {
      group: "shipping",
      label: "Giao hoả tốc",
      value: `${formatVnd(SHIPPING_METHODS.express.flatFee)}, chỉ trong ${env.STORE_PROVINCE}`,
    },
    {
      group: "shipping",
      label: "Cân nặng tạm tính",
      value: `${DEFAULT_PRODUCT_WEIGHT_GRAMS}g mỗi sản phẩm chưa nhập cân nặng`,
    },
    { group: "stock", label: "Tồn kho", value: "Không cho âm, mọi thay đổi đều ghi thẻ kho" },
  ];
}
