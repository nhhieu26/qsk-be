/** Ngân hàng nhận VietQR (mã BIN theo NAPAS); khớp `BANKS` ở frontend sales/constants. */
export const BANKS = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970448", name: "OCB" },
  { bin: "970426", name: "MSB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970431", name: "Eximbank" },
] as const;

export const BANK_BINS = BANKS.map((b) => b.bin) as unknown as readonly [string, ...string[]];

export function bankNameOf(bin: string): string | undefined {
  return BANKS.find((b) => b.bin === bin)?.name;
}

export const SETTINGS_LIMITS = {
  nameMin: 2,
  textMax: 200,
  /** Mã điểm, cũng là đầu mã hội viên. */
  codeMax: 6,
} as const;
