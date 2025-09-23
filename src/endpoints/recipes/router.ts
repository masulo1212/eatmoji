import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";

// 導入所有 Recipe 端點
import { RecipeCreate } from "./RecipeCreate";
import { RecipeUpdate } from "./RecipeUpdate";
import { RecipeDetail } from "./RecipeDetail";
import { RecipesList } from "./RecipesList";
import { MyRecipesList } from "./MyRecipesList";
import { RecipeDelete } from "./RecipeDelete";
import { FavoriteRecipeCreate } from "./FavoriteRecipeCreate";
import { FavoriteRecipeDelete } from "./FavoriteRecipeDelete";
import { FavoriteRecipesList } from "./FavoriteRecipesList";

// 建立 recipes 主路由器
export const recipesRouter = fromHono(new Hono());

// 公開端點（無需認證）
// GET /recipes - 獲取所有公開食譜
recipesRouter.get("/", RecipesList);

// GET /recipes/:id - 獲取單一食譜詳情（但需要避免與其他路由衝突）
recipesRouter.get("/detail/:id", RecipeDetail);

// 需要認證的端點 - 先定義這些路由
const authRecipesRouter = fromHono(new Hono());

// 套用認證中間件到所有需要認證的路由
authRecipesRouter.use("/*", authMiddleware);

// 需要認證的食譜操作
// POST /recipes/create - 建立新食譜  
authRecipesRouter.post("/create", RecipeCreate);

// PUT /recipes/update/:id - 更新食譜
authRecipesRouter.put("/update/:id", RecipeUpdate);

// DELETE /recipes/delete/:id - 刪除食譜
authRecipesRouter.delete("/delete/:id", RecipeDelete);

// GET /recipes/my - 獲取我的食譜
authRecipesRouter.get("/my", MyRecipesList);

// 收藏相關操作
// POST /recipes/favorites/:id - 加入收藏
authRecipesRouter.post("/favorites/:id", FavoriteRecipeCreate);

// DELETE /recipes/favorites/:id - 移除收藏
authRecipesRouter.delete("/favorites/:id", FavoriteRecipeDelete);

// GET /recipes/favorites - 獲取我的收藏食譜
authRecipesRouter.get("/favorites", FavoriteRecipesList);

// 將需要認證的路由掛載到主路由器
recipesRouter.route("/", authRecipesRouter);

// 未來可擴展的端點：
// recipesRouter.delete("/:id/favorites", authMiddleware, FavoriteRecipeDelete);  // 移除收藏
// recipesRouter.get("/search", RecipeSearch);                                    // 搜尋食譜
// recipesRouter.get("/tags/:tag", RecipesByTag);                                // 按標籤篩選
// recipesRouter.get("/user/:userId", UserRecipes);                              // 特定使用者的公開食譜