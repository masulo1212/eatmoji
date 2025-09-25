import { fromHono } from "chanfana";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { ExpiredTokensCleanup } from "./ExpiredTokensCleanup";
import { TokenDelete } from "./TokenDelete";
import { TokenRegister } from "./TokenRegister";
import { TokensList } from "./TokensList";

// 建立 FCM tokens 子路由器
export const fcmTokensRouter = fromHono(new Hono());

// 套用認證中間件到需要認證的路由
// FCM Token 相關操作需要使用者身份驗證
fcmTokensRouter.use("/tokens/*", authMiddleware);

// ===========================================
// FCM Token 管理 API（需要認證）
// ===========================================

// POST /fcm-tokens/tokens - 註冊或更新 FCM Token
fcmTokensRouter.post("/tokens", TokenRegister);

// GET /fcm-tokens/tokens - 獲取使用者所有 FCM Token
fcmTokensRouter.get("/tokens", TokensList);

// DELETE /fcm-tokens/tokens/expired - 清理過期的 FCM Token
fcmTokensRouter.delete("/tokens/expired", ExpiredTokensCleanup);

// DELETE /fcm-tokens/tokens/:deviceId - 刪除特定設備的 FCM Token
fcmTokensRouter.delete("/tokens/:deviceId", TokenDelete);
