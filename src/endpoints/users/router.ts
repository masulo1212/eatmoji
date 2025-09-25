import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { UserGet } from "./UserGet";
import { UserExists } from "./UserExists";
import { UserCreate } from "./UserCreate";
import { UserUpdate } from "./UserUpdate";

// 建立 users 子路由器
export const usersRouter = fromHono(new Hono());

// 套用認證中間件到所有 users 路由
// 所有使用者操作都需要使用者身份驗證
usersRouter.use("/*", authMiddleware);

// GET /users/exists/:uid - 檢查使用者是否存在
// 對應 Flutter: checkUserExists(String uid)
usersRouter.get("/exists/:uid", UserExists);

// GET /users/:userId - 獲取使用者資料  
// 對應 Flutter: getUser({String? userId})
usersRouter.get("/:userId", UserGet);

// POST /users - 建立新使用者
// 對應 Flutter: createUser(AppUser user)
usersRouter.post("/", UserCreate);

// PUT /users/:userId - 更新使用者資料
// 對應 Flutter: updateUser(Map<String, dynamic> data)
usersRouter.put("/:userId", UserUpdate);