import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { CancellationFeedbackEmailSchema } from "../../utils/emailSchemas";

// 導入分層架構
import { EmailController } from "../../controllers/emailController";
import EmailService from "../../services/emailService";

/**
 * SendCancellationEmail endpoint - 發送取消訂閱回饋郵件
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 請求數據驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 * 
 * 注意：此端點可以選擇是否需要認證，根據業務需求決定
 */
export class SendCancellationEmail extends OpenAPIRoute {
  public schema = {
    tags: ["Email"],
    summary: "發送取消訂閱回饋郵件",
    description:
      "發送取消訂閱回饋郵件給用戶，請求用戶提供回饋並提供重新訂閱的連結",
    operationId: "sendCancellationEmail",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CancellationFeedbackEmailSchema.openapi({
              description: "取消訂閱回饋郵件請求",
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "郵件發送成功",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.object({
                message: z.string(),
                messageId: z.string().optional(),
                timestamp: z.string(),
                recipient: z.object({
                  email: z.string(),
                  name: z.string().optional(),
                }),
              }),
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
            errors: [{ code: 405, message: "請使用 POST 方法" }],
          },
          405 as any
        );
      }

      // 2. 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const requestData = data.body;

      // 3. 準備取消訂閱數據
      const cancellationData = {
        userName: requestData.templateData?.userName || requestData.recipientName,
        cancellationDate: requestData.templateData?.cancellationDate || new Date().toLocaleDateString('zh-TW'),
        feedbackUrl: requestData.templateData?.feedbackUrl,
        resubscribeUrl: requestData.templateData?.resubscribeUrl,
        cancellationReason: requestData.templateData?.cancellationReason,
        customContent: requestData.templateData?.customContent,
      };

      // 4. 初始化依賴鏈（EmailService → EmailController）
      const emailService = new EmailService();
      const emailController = new EmailController(emailService);

      // 5. 調用 Controller 處理業務邏輯
      const result = await emailController.sendCancellationFeedbackEmail(
        requestData.recipientEmail,
        requestData.recipientName,
        cancellationData,
        c.env,
        requestData.userLanguage
      );

      // 6. 返回響應
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
                code: 500,
                message: result.error || "郵件發送失敗",
              },
            ],
          },
          500 as any
        );
      }
    } catch (error) {
      console.error("SendCancellationEmail endpoint - 處理請求時發生錯誤:", error);

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