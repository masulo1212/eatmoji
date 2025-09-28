import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import type { RevenueCatWebhookRequest } from "../../types/revenuecat";

// 導入分層架構
import { RevenueCatController } from "../../controllers/revenueCatController";
import EmailService from "../../services/emailService";

// RevenueCat Webhook 事件 Schema
const RevenueCatWebhookEventSchema = z.object({
  // 必要欄位 - 根據舊專案驗證邏輯
  type: z.enum([
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'PRODUCT_CHANGE',
    'CANCELLATION',
    'UNCANCELLATION',
    'EXPIRATION',
    'BILLING_ISSUE',
    'SUBSCRIBER_ALIAS',
    'SUBSCRIPTION_PAUSED',
    'SUBSCRIPTION_EXTENDED',
    'TEST'
  ]),
  event_timestamp_ms: z.number(),
  app_user_id: z.string(),
  original_app_user_id: z.string(),
  product_id: z.string(),
  period_type: z.enum(['NORMAL', 'TRIAL', 'INTRO']),
  purchased_at_ms: z.number(),
  expiration_at_ms: z.number(),
  environment: z.enum(['SANDBOX', 'PRODUCTION']),
  app_id: z.string(),
  store: z.enum(['APP_STORE', 'MAC_APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL', 'AMAZON', 'RC_BILLING']),
  
  // 可選欄位 - 允許 null 和 undefined
  entitlement_id: z.string().nullable().optional(),
  entitlement_ids: z.array(z.string()).nullable().optional(),
  presented_offering_id: z.string().nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  original_transaction_id: z.string().nullable().optional(),
  cancel_reason: z.enum(['UNSUBSCRIBE', 'BILLING_ERROR', 'DEVELOPER_INITIATED', 'PRICE_INCREASE', 'CUSTOMER_SUPPORT', 'UNKNOWN']).nullable().optional(),
  is_family_share: z.boolean().nullable().optional(),
  country_code: z.string().nullable().optional(),
  subscriber_attributes: z.record(z.any()).nullable().optional(),
  price: z.number().nullable().optional(),
  price_string: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  tax_percentage: z.number().nullable().optional(),
  commission_percentage: z.number().nullable().optional(),
  is_sandbox: z.boolean().nullable().optional(),
});

const RevenueCatWebhookRequestSchema = z.object({
  event: RevenueCatWebhookEventSchema,
});

/**
 * RevenueCatWebhook endpoint - 處理 RevenueCat Webhook 事件
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Webhook 數據驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class RevenueCatWebhook extends OpenAPIRoute {
  public schema = {
    tags: ["Email"],
    summary: "處理 RevenueCat Webhook",
    description:
      "處理來自 RevenueCat 的 Webhook 事件，特別是訂閱取消事件，自動發送回饋郵件",
    operationId: "handleRevenueCatWebhook",
    request: {
      body: {
        content: {
          "application/json": {
            schema: RevenueCatWebhookRequestSchema.openapi({
              description: "RevenueCat Webhook 事件數據",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Webhook 處理成功",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.object({
                message: z.string(),
                eventType: z.string().optional(),
                emailSent: z.boolean().optional(),
                emailError: z.string().optional(),
              }).optional(),
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤或 Webhook 驗證失敗",
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
        description: "伺服器內部錯誤",
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

  async handle(c: AppContext) {
    try {
      // 1. 驗證 HTTP 方法
      if (c.req.method !== "POST") {
        return c.json(
          {
            success: false,
            errors: [{ code: 405, message: "Method not allowed" }],
          },
          405 as any
        );
      }

      // 2. 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const webhookData = data.body as RevenueCatWebhookRequest;

      // 3. 初始化依賴鏈（EmailService → RevenueCatController）
      const emailService = new EmailService();
      const revenueCatController = new RevenueCatController(emailService);

      // 4. 調用 Controller 處理業務邏輯
      const result = await revenueCatController.handleWebhook(webhookData, c.env);

      // 5. 返回響應
      if (result.success) {
        return c.json({
          success: true,
          result: result.result
        }, 200);
      } else {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: result.error || "Webhook 處理失敗",
              },
            ],
          },
          400 as any
        );
      }
    } catch (error) {
      console.error("RevenueCatWebhook endpoint - 處理請求時發生錯誤:", error);

      // 處理 Zod 驗證錯誤
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as any;
        const errorMessages = zodError.issues
          .map((issue: any) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");

        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: `資料驗證失敗: ${errorMessages}` }],
          },
          400 as any
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500 as any
      );
    }
  }
}