import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { WeightAdd } from "./WeightAdd";
import { WeightList } from "./WeightList";
import { WeightLatest } from "./WeightLatest";

// 建立 weight 子路由器
export const weightRouter = fromHono(new Hono());

// 套用認證中間件到所有 weight 路由
// 所有 weight 操作都需要使用者身份驗證
weightRouter.use("/*", authMiddleware);

// POST /weight - 新增體重記錄
weightRouter.post("/", WeightAdd);

// GET /weight - 取得體重記錄列表（支援日期過濾）
weightRouter.get("/", WeightList);

// GET /weight/latest - 取得最新體重記錄
weightRouter.get("/latest", WeightLatest);