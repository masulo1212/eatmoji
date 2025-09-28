import { fromHono } from "chanfana";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { SendEmail } from "./SendEmail";
import { SendCancellationEmail } from "./SendCancellationEmail";
import { RevenueCatWebhook } from "./RevenueCatWebhook";
import type { Env } from "../../bindings";

// 創建 Email 相關的子路由
const app = new Hono<{ Bindings: Env }>();

// 為需要認證的路由應用認證中間件
app.use("/send-email", authMiddleware);

// 設定 OpenAPI 路由
const emailRouter = fromHono(app, {
  schema: {
    info: {
      title: "Email API",
      version: "1.0.0",
      description: "郵件發送和 RevenueCat Webhook 處理功能",
    },
  },
});

// 註冊 SendEmail endpoint（需要認證）
emailRouter.post("/send-email", SendEmail);

// 註冊 SendCancellationEmail endpoint（不需要認證，可以從外部調用）
emailRouter.post("/send-cancellation-email", SendCancellationEmail);

// 註冊 RevenueCatWebhook endpoint（不需要認證，RevenueCat 回調）
emailRouter.post("/revenuecat-webhook", RevenueCatWebhook);

// 匯出 router 供主應用使用
export { emailRouter };