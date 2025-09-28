import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { EmailSendRequestSchema } from "../../utils/emailSchemas";

// 導入分層架構
import { EmailController } from "../../controllers/emailController";
import EmailService from "../../services/emailService";

/**
 * SendEmail endpoint - 通用郵件發送
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - Firebase 認證驗證
 * - 調用 Controller 層
 * - 錯誤響應格式化
 * 
 * 注意：此端點需要 Firebase 認證
 */
export class SendEmail extends OpenAPIRoute {
  public schema = {
    tags: ["Email"],
    summary: "發送郵件",
    description:
      "通用郵件發送服務，支援多種郵件類型和模板",
    operationId: "sendEmail",
    request: {
      body: {
        content: {
          "application/json": {
            schema: EmailSendRequestSchema.openapi({
              description: "郵件發送請求",
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
      // 注意：由於此端點在 email router 中使用了 authMiddleware，
      // 所以不需要在這裡再次驗證身份

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
      const requestData = data.body as import("../../types/email").EmailSendRequest;

      // 3. 初始化依賴鏈（EmailService → EmailController）
      const emailService = new EmailService();
      const emailController = new EmailController(emailService);

      // 4. 調用 Controller 處理業務邏輯
      const result = await emailController.sendEmail(requestData, c.env);

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
                code: 500,
                message: result.error || "郵件發送失敗",
              },
            ],
          },
          500 as any
        );
      }
    } catch (error) {
      console.error("SendEmail endpoint - 處理請求時發生錯誤:", error);

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