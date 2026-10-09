import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES } from '../rbac/rbac.constants.js';

const userSchema = new Schema(
  {
    accountId: { type: String, required: true, unique: true },
    shopId: { type: String },
    phoneNumber: { type: String, required: true },
    fullName: { type: String },
    email: { type: String },
    role: { type: String, enum: ROLES, default: 'customer', required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
