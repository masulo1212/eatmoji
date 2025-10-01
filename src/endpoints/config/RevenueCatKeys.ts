import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";

/**
 * RevenueCat Keys 回應格式
 */
export interface RevenueCatKeysResult {
  googleApiKey: string;
  appleApiKey: string;
}

export const RevenueCatKeysResultSchema = z.object({
  googleApiKey: z.string().describe("RevenueCat Google API Key"),
  appleApiKey: z.string().describe("RevenueCat Apple API Key"),
});

export const RevenueCatKeysResponseSchema = z.object({
  success: z.boolean().default(true),
  result: RevenueCatKeysResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * RevenueCatKeys endpoint - 獲取 RevenueCat API Keys
 *
 * 邏輯：
 * - 從環境變數讀取 RevenueCat Google 和 Apple API Keys
 * - 返回給前端使用
 * - 不需要任何認證
 */
export class RevenueCatKeys extends OpenAPIRoute {
  public schema = {
    tags: ["Config"],
    summary: "獲取 RevenueCat API Keys",
    description: "獲取前端所需的 RevenueCat Google 和 Apple API Keys",
    operationId: "getRevenueCatKeys",
    request: {
      // 這個端點不需要任何請求參數
    },
    responses: {
      "200": {
        description: "成功獲取 RevenueCat Keys",
        content: {
          "application/json": {
            schema: RevenueCatKeysResponseSchema.openapi({
              description: "RevenueCat API Keys",
              example: {
                success: true,
                result: {
                  googleApiKey: "goog_XXXXXXXXXXXXXXXXXXXXXXXXX",
                  appleApiKey: "appl_XXXXXXXXXXXXXXXXXXXXXXXXX",
                },
              },
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
  };

  public async handle(c: AppContext) {
    try {
      // 從環境變數獲取 RevenueCat API Keys
      const googleApiKey = c.env.REVENUECAT_GOOGLE_API_KEY;
      const appleApiKey = c.env.REVENUECAT_APPLE_API_KEY;

      console.log("RevenueCatKeys - 獲取 API Keys", googleApiKey, appleApiKey);

      // 檢查環境變數是否存在
      if (!googleApiKey || !appleApiKey) {
        console.error("RevenueCatKeys - 環境變數缺失");
        return c.json(
          {
            success: false,
            errors: [
              { code: 500, message: "RevenueCat API Keys not configured" },
            ],
          },
          500
        );
      }

      const result: RevenueCatKeysResult = {
        googleApiKey,
        appleApiKey,
      };

      console.log("RevenueCatKeys - 成功返回 API Keys");

      // 返回成功響應
      return c.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error("Endpoint: RevenueCatKeys 處理錯誤:", error);

      // 處理未預期錯誤
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
