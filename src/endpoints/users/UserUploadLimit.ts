import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入分層架構
import { DiaryController } from "../../controllers/diaryController";
import { UserController } from "../../controllers/userController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { FirestoreUserRepository } from "../../repositories/userRepository";
import { DiaryService } from "../../services/diaryService";
import { UserService } from "../../services/userService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * 上傳限制檢查回應格式
 */
export interface UserUploadLimitResult {
  hasReachedLimit: boolean;
}

export const UserUploadLimitResultSchema = z.object({
  hasReachedLimit: z.boolean().describe("是否已達到上傳限制"),
});

export const UserUploadLimitResponseSchema = z.object({
  success: z.boolean().default(true),
  result: UserUploadLimitResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * UserUploadLimit endpoint - 檢查免費用戶的 diary 上傳限制
 *
 * 邏輯：
 * - Pro 用戶：無限制，回傳 hasReachedLimit: false
 * - 免費用戶：檢查 diary 總數是否達到限制（預設 15 個）
 * - 只計算 source 為空的記錄（用戶主動創建的記錄）
 */
export class UserUploadLimit extends OpenAPIRoute {
  public schema = {
    tags: ["Users"],
    summary: "檢查用戶 diary 上傳限制",
    description:
      "檢查免費用戶是否已達到 diary 上傳限制。Pro 用戶無限制，免費用戶限制 15 個記錄。",
    operationId: "getUserUploadLimit",
    request: {
      // 這個端點不需要任何請求參數，只需要認證
    },
    responses: {
      "200": {
        description: "成功檢查上傳限制狀態",
        content: {
          "application/json": {
            schema: UserUploadLimitResponseSchema.openapi({
              description: "用戶上傳限制檢查結果",
              example: {
                success: true,
                result: {
                  hasReachedLimit: false,
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

      console.log("UserUploadLimit - userId:", userId);

      // 初始化用戶相關的分層架構
      const firestore = getFirestoreFromContext(c);
      const userRepository = new FirestoreUserRepository(firestore);
      const userService = new UserService(userRepository);
      const userController = new UserController(userService);

      // 獲取用戶資訊（包含 Pro 狀態）
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

      // 檢查上傳限制
      const uploadLimitResult = await this.checkUploadLimit(user, userId, c);

      // 返回成功響應
      return c.json({
        success: true,
        result: uploadLimitResult,
      });
    } catch (error) {
      console.error("Endpoint: UserUploadLimit 處理錯誤:", error);

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
   * 檢查用戶的上傳限制狀態
   * 對應 Flutter hasReachedUploadLimit() 方法的邏輯
   */
  private async checkUploadLimit(
    user: any,
    userId: string,
    c: AppContext
  ): Promise<UserUploadLimitResult> {
    try {
      // 1. 檢查是否為 Pro 用戶
      const isPro = this.checkUserIsPro(user);
      console.log("UserUploadLimit - isPro:", isPro);

      // Pro 用戶無限制
      if (isPro) {
        return { hasReachedLimit: false };
      }

      // 2. 獲取環境變數中的限制值
      const totalLimit = c.env.TOTAL_UPLOAD_LIMIT_FREE || 15;
      console.log("UserUploadLimit - totalLimit:", totalLimit);

      // 3. 檢查總額度限制
      if (totalLimit > 0) {
        const hasExceeded = await this.hasExceededTotalLimit(
          userId,
          totalLimit,
          c
        );
        return { hasReachedLimit: hasExceeded };
      }

      // 沒有設定總額度，等同於沒有免費額度
      return { hasReachedLimit: true };
    } catch (error) {
      console.error("UserUploadLimit - 檢查上傳限制失敗:", error);
      // 出錯時返回 false，避免阻擋用戶操作
      return { hasReachedLimit: false };
    }
  }

  /**
   * 檢查是否超過總額度限制
   * 對應 Flutter _hasExceededTotalLimit() 方法
   */
  private async hasExceededTotalLimit(
    userId: string,
    totalLimit: number,
    c: AppContext
  ): Promise<boolean> {
    try {
      const totalCount = await this.getTotalDiaryCount(userId, c);
      console.log("UserUploadLimit - 用戶總記錄數量:", totalCount);
      console.log("UserUploadLimit - 總額度限制:", totalLimit);

      return totalCount >= totalLimit;
    } catch (error) {
      console.error("UserUploadLimit - 檢查總額度限制失敗:", error);
      return false; // 出錯時不限制
    }
  }

  /**
   * 計算用戶所有有效的 diary 記錄數量（包括軟刪除的記錄）
   * 只計算 source 為空的記錄（用戶主動創建的記錄）
   */
  private async getTotalDiaryCount(
    userId: string,
    c: AppContext
  ): Promise<number> {
    try {
      // 初始化 Diary 相關的分層架構
      const firestore = getFirestoreFromContext(c);
      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(diaryRepository);
      const diaryController = new DiaryController(diaryService);

      // 直接獲取總記錄數量（包括軟刪除的記錄）
      const totalCountResponse = await diaryController.getTotalDiaryCount(
        userId
      );
      console.log("UserUploadLimit - totalCountResponse:", totalCountResponse);
      if (
        !totalCountResponse.success ||
        totalCountResponse.result === undefined
      ) {
        console.log("UserUploadLimit - 獲取總記錄數量失敗");
        return 0;
      }

      const totalCount = totalCountResponse.result;
      console.log("UserUploadLimit - 用戶總記錄數量:", totalCount);
      return totalCount;
    } catch (error) {
      console.error("UserUploadLimit - 獲取總記錄數量失敗:", error);
      return 0; // 出錯時返回 0，避免阻擋用戶操作
    }
  }

  /**
   * 檢查用戶是否為 Pro 會員
   * 重用 UserProStatus 的檢查邏輯
   */
  private checkUserIsPro(user: any): boolean {
    // 檢查 entitlements 是否存在
    if (!user.entitlements) {
      return false;
    }

    // 獲取 'sub' 或 'pro' entitlement (優先 'sub')
    const proEntitlement = user.entitlements["sub"] ?? user.entitlements["pro"];
    if (!proEntitlement) {
      return false;
    }

    // 檢查是否有過期日期且仍然有效
    // 支援兩種格式：expiresDate (camelCase) 和 expires_date (snake_case)
    const expiresDateValue =
      proEntitlement.expiresDate || (proEntitlement as any).expires_date;

    if (expiresDateValue) {
      const expiresDate = new Date(expiresDateValue);
      // 檢查日期是否有效且未過期
      if (!isNaN(expiresDate.getTime())) {
        return new Date() < expiresDate;
      }
    }

    // 如果沒有過期日期，認為是有效的（終身訂閱等）
    return true;
  }
}
