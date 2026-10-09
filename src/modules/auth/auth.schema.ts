import { z } from "zod";

export const ssoCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type SsoCallbackBody = z.infer<typeof ssoCallbackSchema>;
