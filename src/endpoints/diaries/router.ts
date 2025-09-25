import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { DiariesList } from "./DiariesList";
import { DiariesWithImages } from "./DiariesWithImages";
import { DiaryUpdate } from "./DiaryUpdate";
import { DiaryDelete } from "./DiaryDelete";
import { DiaryFromRecipe } from "./DiaryFromRecipe";
import { CalculateStreak } from "./CalculateStreak";

// 建立 diaries 子路由器
export const diariesRouter = fromHono(new Hono());

// 套用認證中間件到所有 diaries 路由
// 所有 diary 操作都需要使用者身份驗證
diariesRouter.use("/*", authMiddleware);

// GET /diaries - 獲取使用者的 diary 列表
diariesRouter.get("/", DiariesList);

// GET /diaries/streak - 計算使用者的連續打卡天數
diariesRouter.get("/streak", CalculateStreak);

// POST /diaries/with-images - 建立包含圖片的新 diary
diariesRouter.post("/with-images", DiariesWithImages);

// POST /diaries/from-recipe - 從食譜/食物條目建立新 diary
diariesRouter.post("/from-recipe", DiaryFromRecipe);

// PUT /diaries/:id - 更新現有的 diary
diariesRouter.put("/:id", DiaryUpdate);

// DELETE /diaries/:id - 刪除 diary (軟刪除)
diariesRouter.delete("/:id", DiaryDelete);

// 未來的端點規劃：
// diariesRouter.post("/", DiaryCreate);      // 建立新的 diary（不含圖片）
// diariesRouter.get("/:id", DiaryRead);      // 獲取單一 diary