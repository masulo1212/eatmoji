import { Hono } from "hono";
import { fromHono } from "chanfana";
import { RevenueCatKeys } from "./revenuecat-keys";
import { ForceUpdateCheck } from "./force-update-check";
import { MaintenanceCheck } from "./maintenance-check";

// 建立 config 子路由器
export const configRouter = fromHono(new Hono());

// GET /config/revenuecat-keys - 獲取 RevenueCat API Keys
// 提供前端所需的 RevenueCat Google 和 Apple API Keys
configRouter.get("/revenuecat-keys", RevenueCatKeys);

// GET /config/force-update-check - 檢查是否需要強制更新
// 檢查用戶當前版本是否需要強制更新到最新版本
configRouter.get("/force-update-check", ForceUpdateCheck);

// GET /config/maintenance-check - 檢查系統維修狀態
// 檢查系統是否正在維修，以及預計的維修結束時間
configRouter.get("/maintenance-check", MaintenanceCheck);