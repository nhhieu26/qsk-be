/**
 * Chuỗi VietQR (EMVCo + NAPAS 247) để mọi app ngân hàng quét được.
 * Giữ đồng bộ với frontend/src/features/sales/lib/vietqr.ts.
 */

const NAPAS_GUID = "A000000727";
const SERVICE_TRANSFER_TO_ACCOUNT = "QRIBFTTA";
const CURRENCY_VND = "704";
const COUNTRY_VN = "VN";

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE theo yêu cầu của EMVCo. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type VietQrParams = {
  bankBin: string;
  accountNumber: string;
  amount: number;
  /** Nội dung chuyển khoản: chỉ chữ không dấu và số để không bị ngân hàng cắt. */
  content: string;
};

export function buildVietQrPayload({ bankBin, accountNumber, amount, content }: VietQrParams): string {
  const beneficiary = tlv("00", bankBin) + tlv("01", accountNumber);
  const merchant =
    tlv("00", NAPAS_GUID) + tlv("01", beneficiary) + tlv("02", SERVICE_TRANSFER_TO_ACCOUNT);
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("38", merchant) +
    tlv("53", CURRENCY_VND) +
    (amount > 0 ? tlv("54", String(Math.round(amount))) : "") +
    tlv("58", COUNTRY_VN) +
    tlv("62", tlv("08", content)) +
    "6304";
  return body + crc16(body);
}
