import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { IngredientImageUpload } from "./IngredientImageUpload";
import { IngredientImageCheck } from "./IngredientImageCheck";

// 建立 images 子路由器
export const imagesRouter = fromHono(new Hono());

// 套用認證中間件到所有 images 路由
// 所有圖片上傳操作都需要使用者身份驗證
imagesRouter.use("/*", authMiddleware);

// POST /images/ingredients - 上傳食材圖片到 R2
imagesRouter.post("/ingredients", IngredientImageUpload);

// GET /images/ingredients/check - 檢查食材圖片是否存在
imagesRouter.get("/ingredients/check", IngredientImageCheck as any);

// 未來的端點規劃：
// imagesRouter.post("/recipes", RecipeImageUpload);      // 上傳食譜圖片
// imagesRouter.post("/avatars", AvatarImageUpload);      // 上傳用戶頭像
// imagesRouter.delete("/ingredients/:filename", DeleteIngredientImage); // 刪除食材圖片