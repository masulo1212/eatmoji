import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入分層架構
import { UserController } from "../../controllers/userController";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * Pro 狀態回應格式
 */
export interface UserProStatusResult {
  isPro: boolean;
}

export const UserProStatusResultSchema = z.object({
  isPro: z.boolean().describe("是否為 Pro 用戶"),
});

export const UserProStatusResponseSchema = z.object({
  success: z.boolean().default(true),
  result: UserProStatusResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * UserProStatus endpoint - 檢查用戶的 Pro 訂閱狀態
 * 將原本在 AI 報告限制中的 Pro 狀態檢查邏輯移到用戶端點
 *
 * 回傳用戶是否為 Pro 會員的狀態
 */
export class UserProStatus extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "檢查用戶 Pro 訂閱狀態",
    description: "檢查已驗證用戶是否為 RevenueCat Pro 訂閱用戶",
    operationId: "getUserProStatus",
    request: {
      // 這個端點不需要任何請求參數，只需要認證
    },
    responses: {
      "200": {
        description: "成功獲取 Pro 狀態資訊",
        content: {
          "application/json": {
            schema: UserProStatusResponseSchema.openapi({
              description: "用戶 Pro 狀態檢查結果",
              example: {
                success: true,
                result: {
                  isPro: true,
                },
              },
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
        description: "找不到用戶",
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
      const userId = requireUserIdFromMiddleware(c);

      console.log("UserProStatus - userId:", userId);
      // 初始化用戶相關的分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 獲取用戶資訊（包含 RevenueCat 訂閱資料）
      const userResponse = await userController.getUser(userId);
      if (!userResponse.success || !userResponse.result) {
        return c.json(
          {
            success: false,
            errors: [{ code: 404, message: "找不到用戶資料" }],
          },
          404
        );
      }

      const user = userResponse.result;

      // 檢查 Pro 狀態
      const proStatus = this.checkUserProStatus(user);

      // 返回成功響應
      return c.json({
        success: true,
        result: proStatus,
      });
    } catch (error) {
      console.error("Endpoint: UserProStatus 處理錯誤:", error);

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

  /**
   * 檢查用戶的 Pro 訂閱狀態
   * 完全符合 Flutter isPro getter 的邏輯
   * 只檢查 'sub' 或 'pro' entitlement 並驗證過期時間
   */
  private checkUserProStatus(user: any): UserProStatusResult {
    // 檢查 entitlements 是否存在
    if (!user.entitlements) {
      return {
        isPro: false,
      };
    }

    // 獲取 'sub' 或 'pro' entitlement (優先 'sub')
    const proEntitlement = user.entitlements["sub"] ?? user.entitlements["pro"];
    if (!proEntitlement) {
      return {
        isPro: false,
      };
    }

    // 檢查是否有過期日期且仍然有效
    // 支援兩種格式：expiresDate (camelCase) 和 expires_date (snake_case)
    const expiresDateValue =
      proEntitlement.expiresDate || (proEntitlement as any).expires_date;

    if (expiresDateValue) {
      const expiresDate = new Date(expiresDateValue);
      console.log("UserProStatus - expiresDate:", expiresDate);
      console.log("UserProStatus - now:", new Date());

      // 檢查日期是否有效且未過期
      if (!isNaN(expiresDate.getTime())) {
        const isPro = new Date() < expiresDate;
        return {
          isPro,
        };
      }
    }

    // 如果沒有過期日期，認為是有效的（終身訂閱等）
    return {
      isPro: true,
    };
  }
}
