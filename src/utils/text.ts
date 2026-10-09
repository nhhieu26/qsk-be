/** Chữ thường, bỏ dấu tiếng Việt (đ → d), gọn khoảng trắng: để tìm kiếm/so sánh. */
export function normalizeSearch(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Thoát ký tự đặc biệt để đưa chuỗi người dùng vào RegExp an toàn. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Số di động VN: bỏ khoảng trắng/chấm/gạch, đổi +84 thành 0. */
export function normalizePhone(value: string): string {
  const compact = value.replace(/[\s.-]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
}

const VN_MOBILE = /^0(?:3|5|7|8|9)\d{8}$/;

export function isValidPhone(value: string): boolean {
  return VN_MOBILE.test(normalizePhone(value));
}

const PROVINCE_PREFIX = /^(thanh pho|tinh|tp\.?)\s+/;

/** So sánh tên tỉnh bỏ qua dấu và tiền tố "Thành phố"/"Tỉnh"/"TP." ("Hà Nội" = "Thành phố Hà Nội"). */
export function isSameProvince(a: string, b: string): boolean {
  const key = (v: string) => normalizeSearch(v).replace(PROVINCE_PREFIX, "");
  return key(a) !== "" && key(a) === key(b);
}
