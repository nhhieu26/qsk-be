import { Schema, model } from "mongoose";

/** Bộ đếm tăng dần dùng sinh mã (vd mã đơn theo ngày). */
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
});

export const CounterModel = model("Counter", counterSchema);

/** Lấy số kế tiếp của `key`, nguyên tử kể cả khi gọi đồng thời. */
export async function nextSequence(key: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return counter.value;
}
