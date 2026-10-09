import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { productRouter } from '../modules/product/product.routes.js';
import { stockRouter } from '../modules/stock/stock.routes.js';
import { customerRouter } from '../modules/customer/customer.routes.js';
import { orderRouter } from '../modules/order/order.routes.js';
import { shippingRouter } from '../modules/shipping/shipping.routes.js';
import { settingsRouter } from '../modules/settings/settings.routes.js';
import { userRouter } from '../modules/user/user.routes.js';

const routes: { prefix: string; router: Router }[] = [
  { prefix: '/health', router: healthRouter },
  { prefix: '/auth', router: authRouter },
  { prefix: '/products', router: productRouter },
  { prefix: '/stock', router: stockRouter },
  { prefix: '/customers', router: customerRouter },
  { prefix: '/orders', router: orderRouter },
  { prefix: '/shipping', router: shippingRouter },
  { prefix: '/settings', router: settingsRouter },
  { prefix: '/users', router: userRouter },
];

export const router = Router();

for (const { prefix, router: childRouter } of routes) {
  router.use(prefix, childRouter);
}
