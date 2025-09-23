import { fromHono } from "chanfana";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { FavFoodCreate } from "./FavFoodCreate";
import { FavFoodDelete } from "./FavFoodDelete";
import { FavFoodDetail } from "./FavFoodDetail";
import { FavFoodsList } from "./FavFoodsList";
import { FavFoodUpdate } from "./FavFoodUpdate";

// 建立 favFoods 子路由器
export const favFoodsRouter = fromHono(new Hono());

// 套用認證中間件到所有 favFoods 路由
// 所有收藏食物操作都需要使用者身份驗證
favFoodsRouter.use("/*", authMiddleware);

// GET /fav-foods - 獲取使用者的收藏食物列表
// 對應 Flutter getFoodEntries() 方法
favFoodsRouter.get("/", FavFoodsList);

// GET /fav-foods/:id - 獲取單一收藏食物詳情
// 對應 Flutter getFoodEntry(String id) 方法
// 暫時沒用到
favFoodsRouter.get("/:id", FavFoodDetail);

// POST /fav-foods - 從 Diary 創建收藏食物
// 對應 Flutter addFoodEntry({required Diary diary}) 方法
favFoodsRouter.post("/", FavFoodCreate);

// PUT /fav-foods/:id - 更新現有的收藏食物
// 對應 Flutter updateFoodEntry(FoodEntry foodEntry) 方法
// 暫時沒用到
favFoodsRouter.put("/:id", FavFoodUpdate);

// DELETE /fav-foods/:id - 刪除收藏食物（物理刪除）
// 對應 Flutter deleteFoodEntry(String id) 方法
favFoodsRouter.delete("/:id", FavFoodDelete);

// 完整的 API 端點對應表：
// ┌─────────────────────────────────┬──────────────────────────────────────────┐
// │ HTTP 方法 + 路徑                │ Flutter 方法                             │
// ├─────────────────────────────────┼──────────────────────────────────────────┤
// │ GET    /fav-foods               │ getFoodEntries()                         │
// │ GET    /fav-foods/:id           │ getFoodEntry(String id)                  │
// │ POST   /fav-foods               │ addFoodEntry({required Diary diary})     │
// │ PUT    /fav-foods/:id           │ updateFoodEntry(FoodEntry foodEntry)     │
// │ DELETE /fav-foods/:id           │ deleteFoodEntry(String id)               │
// └─────────────────────────────────┴──────────────────────────────────────────┘

// Firebase 集合路徑：users/{userId}/fav_foods
// 完全對應 Flutter FoodDBRepositoryImpl 的實現
