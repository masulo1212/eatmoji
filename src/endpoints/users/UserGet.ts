import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { UserResponseSchema } from "../../types/user";

// 導入重構後的分層架構
import { UserController } from "../../controllers/userController";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * UserGet endpoint - 獲取使用者資料
 * 對應 Flutter 的 getUser({String? userId}) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class UserGet extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "獲取使用者資料",
    description: "獲取指定使用者的詳細資料",
    operationId: "getUser",
    request: {
      params: z.object({
        userId: z.string().describe("使用者 UID"),
      }),
    },
    responses: {
      "200": {
        description: "成功獲取使用者資料",
        content: {
          "application/json": {
            schema: UserResponseSchema.openapi({
              description: "使用者資料回應",
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
      "404": {
        description: "找不到使用者",
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

      // 獲取路由參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { userId } = data.params;

      // 權限檢查：確保使用者只能獲取自己的資料
      // 食譜查看時 還是要拿到別人的名稱和頭像
      // if (currentUserId !== userId) {
      //   return c.json(
      //     {
      //       success: false,
      //       errors: [{ code: 403, message: "權限不足：只能獲取自己的資料" }],
      //     },
      //     403
      //   );
      // }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 調用 Controller 層處理業務邏輯
      const response = await userController.getUser(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(UserController.toErrorResponse(response, 500), 500);
      }

      // 檢查是否找到使用者
      if (response.result === null) {
        return c.json(
          {
            success: false,
            errors: [{ code: 404, message: "找不到使用者" }],
          },
          404
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: UserGet 處理錯誤:", error);

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
