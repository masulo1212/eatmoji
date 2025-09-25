import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { CreateUserSchema, AppUser } from "../../types/user";

// 導入重構後的分層架構
import { UserController } from "../../controllers/userController";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * UserCreate endpoint - 建立新使用者
 * 對應 Flutter 的 createUser(AppUser user) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class UserCreate extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "建立新使用者",
    description: "建立新的使用者帳戶，包含基本資料和偏好設定",
    operationId: "createUser",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateUserSchema.openapi({
              description: "建立使用者的資料",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "成功建立使用者",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.object({
                message: z.string(),
              }),
            }),
          },
        },
      },
      "401": {
        description: "未授權 - 需要有效的 Firebase ID token",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "409": {
        description: "使用者已存在",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "500": {
        description: "伺服器錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
    },
    security: [
      {
        Bearer: [],
      },
    ],
  };

  public async handle(c: AppContext) {
    try {
      // 從認證中間件獲取使用者 ID
      const currentUserId = requireUserIdFromMiddleware(c);

      // 獲取請求 body
      const data = await this.getValidatedData<typeof this.schema>();
      const userData = data.body;

      // 權限檢查：確保使用者只能建立自己的帳戶
      if (userData.uid && currentUserId !== userData.uid) {
        return c.json(
          {
            success: false,
            errors: [{ code: 403, message: "權限不足：只能建立自己的帳戶" }],
          },
          403
        );
      }

      // 確保 uid 已設定（如果 body 沒有 uid，使用認證的 uid）
      if (!userData.uid) {
        userData.uid = currentUserId;
      }

      // 型別安全檢查：確保 uid 是 string 類型
      if (!userData.uid || typeof userData.uid !== 'string') {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "使用者 UID 無效" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 創建符合 AppUser 類型的對象
      const appUser: AppUser = {
        ...userData,
        uid: userData.uid!, // 使用非空斷言，因為我們已經檢查過了
        isRecipePublic: userData.isRecipePublic ?? true, // 設置默認值
      };

      // 調用 Controller 層處理業務邏輯
      const response = await userController.createUser(appUser);

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500;

        // 根據錯誤類型設定適當的 HTTP 狀態碼
        if (response.error?.includes("已存在")) {
          statusCode = 409; // Conflict
        } else if (
          response.error?.includes("不能為空") ||
          response.error?.includes("無效的") ||
          response.error?.includes("格式")
        ) {
          statusCode = 400; // Bad Request
        }

        return c.json(
          UserController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json(
        {
          success: true,
          result: {
            message: "使用者建立成功",
          },
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: UserCreate 處理錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message ===
          "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json(
          {
            success: false,
            errors: [{ code: 401, message: "Authentication required" }],
          },
          401
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500
      );
    }
  }
}
