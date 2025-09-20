import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { DiariesList } from "./DiariesList";

// 建立 diaries 子路由器
export const diariesRouter = fromHono(new Hono());

// 套用認證中間件到所有 diaries 路由
// 所有 diary 操作都需要使用者身份驗證
diariesRouter.use("/*", authMiddleware);

// GET /diaries - 獲取使用者的 diary 列表
diariesRouter.get("/", DiariesList);

// 未來的端點規劃：
// diariesRouter.post("/", DiaryCreate);      // 建立新的 diary
// diariesRouter.get("/:id", DiaryRead);      // 獲取單一 diary
// diariesRouter.put("/:id", DiaryUpdate);    // 更新 diary
// diariesRouter.delete("/:id", DiaryDelete); // 刪除 diary (軟刪除)