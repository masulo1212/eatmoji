import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { UserGet } from "./UserGet";
import { UserExists } from "./UserExists";
import { UserCreate } from "./UserCreate";
import { UserUpdate } from "./UserUpdate";
import { UserProStatus } from "./UserProStatus";
import { UserUploadLimit } from "./UserUploadLimit";

// 建立 users 子路由器
export const usersRouter = fromHono(new Hono());

// 套用認證中間件到所有 users 路由
// 所有使用者操作都需要使用者身份驗證
usersRouter.use("/*", authMiddleware);

// GET /users/exists/:uid - 檢查使用者是否存在
// 對應 Flutter: checkUserExists(String uid)
usersRouter.get("/exists/:uid", UserExists);

// GET /users/pro-status - 檢查用戶 Pro 訂閱狀態
// 檢查 RevenueCat 訂閱狀態，必須在 /:userId 路由之前以避免衝突
usersRouter.get("/pro-status", UserProStatus);

// GET /users/upload-limit - 檢查用戶上傳限制
// 檢查免費用戶是否已達到 diary 上傳限制，必須在 /:userId 路由之前以避免衝突
usersRouter.get("/upload-limit", UserUploadLimit);

// GET /users/:userId - 獲取使用者資料  
// 對應 Flutter: getUser({String? userId})
usersRouter.get("/:userId", UserGet);

// POST /users - 建立新使用者
// 對應 Flutter: createUser(AppUser user)
usersRouter.post("/", UserCreate);

// PUT /users/:userId - 更新使用者資料
// 對應 Flutter: updateUser(Map<String, dynamic> data)
usersRouter.put("/:userId", UserUpdate);