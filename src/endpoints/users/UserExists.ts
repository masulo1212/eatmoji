import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { UserExistsResponseSchema } from "../../types/user";

// 導入重構後的分層架構
import { UserController } from "../../controllers/userController";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * UserExists endpoint - 檢查使用者是否存在
 * 對應 Flutter 的 checkUserExists(String uid) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class UserExists extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "檢查使用者是否存在",
    description: "檢查指定 UID 的使用者是否存在於系統中",
    operationId: "checkUserExists",
    request: {
      params: z.object({
        uid: z.string().describe("要檢查的使用者 UID"),
      }),
    },
    responses: {
      "200": {
        description: "成功檢查使用者存在性",
        content: {
          "application/json": {
            schema: UserExistsResponseSchema.openapi({
              description: "使用者存在性檢查回應",
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
      // 從認證中間件獲取使用者 ID（確保使用者已登入）
      requireUserIdFromMiddleware(c);

      // 獲取路由參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { uid } = data.params;

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 調用 Controller 層處理業務邏輯
      const response = await userController.checkUserExists(uid);

      // 檢查業務邏輯結果
      if (!response.success) {
        const statusCode = response.error?.includes("UID 不能為空") ? 400 : 500;
        return c.json(
          UserController.toErrorResponse(response, statusCode),
          statusCode
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: UserExists 處理錯誤:", error);

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