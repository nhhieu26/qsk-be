export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Ngày hiện tại dạng `YYYY-MM-DD` theo giờ Việt Nam. */
export function todayInAppTimeZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** VN không đổi giờ theo mùa nên lệch cố định +07:00. */
const APP_UTC_OFFSET = "+07:00";
const MS_PER_DAY = 86_400_000;

/** Khoảng thời gian [bắt đầu, kết thúc) của các ngày `from`..`to` (`YYYY-MM-DD`, giờ VN). */
export function dayRangeInAppTimeZone(from?: string, to?: string): { $gte?: Date; $lt?: Date } {
  return {
    ...(from && { $gte: new Date(`${from}T00:00:00${APP_UTC_OFFSET}`) }),
    ...(to && { $lt: new Date(new Date(`${to}T00:00:00${APP_UTC_OFFSET}`).getTime() + MS_PER_DAY) }),
  };
}
