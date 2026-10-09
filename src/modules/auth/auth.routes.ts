import { Router } from "express";
import { validateBody } from "../../middlewares/validate.js";
import { authController } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { ssoCallbackSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.get("/sso/login", authController.ssoLogin);
authRouter.post(
  "/sso/callback",
  validateBody(ssoCallbackSchema),
  authController.ssoCallback,
);
authRouter.get("/me", requireAuth, authController.me);
authRouter.post("/logout", authController.logout);
