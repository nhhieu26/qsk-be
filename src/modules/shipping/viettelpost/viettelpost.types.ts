/** Phong bì chung của mọi API ViettelPost. Thành công: `status === 200 && !error`. */
export type VtpEnvelope<T> = {
  status: number;
  error: boolean;
  message: string;
  data: T;
};

export type VtpProvince = {
  PROVINCE_ID: number;
  PROVINCE_CODE?: string;
  PROVINCE_NAME: string;
};

export type VtpWard = {
  WARDS_ID: number;
  WARDS_NAME: string;
  PROVINCE_ID: number;
};

/** Body `/v2/order/getPriceNlp`: địa chỉ dạng chữ, cân nặng gram, tiền VND. */
export type VtpPriceRequest = {
  PRODUCT_WEIGHT: number;
  PRODUCT_PRICE: number;
  MONEY_COLLECTION: number;
  ORDER_SERVICE_ADD: string | null;
  ORDER_SERVICE: string;
  SENDER_ADDRESS: string;
  RECEIVER_ADDRESS: string;
  PRODUCT_LENGTH: number;
  PRODUCT_WIDTH: number;
  PRODUCT_HEIGHT: number;
  PRODUCT_TYPE: "HH" | "TH";
  NATIONAL_TYPE: 1 | 0;
};

/** Phần dùng tới trong kết quả báo phí; ViettelPost trả thêm nhiều field khác. */
export type VtpPriceResult = {
  /** Tổng cước (đã gồm phụ phí, VAT). */
  MONEY_TOTAL: number;
  MONEY_TOTAL_FEE?: number;
  MONEY_FEE?: number;
  MONEY_COLLECTION_FEE?: number;
  MONEY_VAT?: number;
  KPI_HT?: number;
};
