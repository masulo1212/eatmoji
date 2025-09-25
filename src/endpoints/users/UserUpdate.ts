import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { UpdateUserSchema } from "../../types/user";

// 導入重構後的分層架構
import { UserController } from "../../controllers/userController";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * UserUpdate endpoint - 更新使用者資料
 * 對應 Flutter 的 updateUser(Map<String, dynamic> data) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class UserUpdate extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "更新使用者資料",
    description: "更新指定使用者的資料，支援部分更新",
    operationId: "updateUser",
    request: {
      params: z.object({
        userId: z.string().describe("要更新的使用者 UID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateUserSchema.openapi({
              description: "要更新的使用者資料（部分更新）",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "成功更新使用者資料",
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
      "403": {
        description: "權限不足",
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

      // 獲取路由參數和請求 body
      const data = await this.getValidatedData<typeof this.schema>();
      const { userId } = data.params;
      const updateData = data.body;

      // 權限檢查：確保使用者只能更新自己的資料
      if (currentUserId !== userId) {
        return c.json(
          {
            success: false,
            errors: [{ code: 403, message: "權限不足：只能更新自己的資料" }],
          },
          403
        );
      }

      // 檢查是否有更新資料
      if (!updateData || Object.keys(updateData).length === 0) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "更新資料不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 調用 Controller 層處理業務邏輯
      // console.log("user update body ", updateData);
      const response = await userController.updateUser(userId, updateData);

      // 檢查業務邏輯結果
      if (!response.success) {
        let statusCode = 500;

        // 根據錯誤類型設定適當的 HTTP 狀態碼
        if (response.error?.includes("找不到")) {
          statusCode = 404; // Not Found
        } else if (
          response.error?.includes("不能為空") ||
          response.error?.includes("無效的") ||
          response.error?.includes("格式") ||
          response.error?.includes("必須是")
        ) {
          statusCode = 400; // Bad Request
        }

        return c.json(
          UserController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json({
        success: true,
        result: {
          message: "使用者資料更新成功",
        },
      });
    } catch (error) {
      console.error("Endpoint: UserUpdate 處理錯誤:", error);

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
