import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../../types";
import { getFirestoreServiceFromContext } from "../../../utils/firebase";
import { ConfigController } from "../config.controller";
import { ConfigService } from "../config.service";
import { ConfigRepository } from "../config.repository";
import { EnvRepository } from "../env.repository";
import { 
  ForceUpdateCheckDtoSchema,
  ForceUpdateCheckResponseSchema 
} from "../dtos/force-update.dto";
import { VersionSchema } from "../types/config.types";

/**
 * ForceUpdateCheck endpoint - 檢查是否需要強制更新
 * 重構為使用 NestJS 風格的分層架構，但保持 OpenAPI 3.1 schema
 */
export class ForceUpdateCheck extends OpenAPIRoute {
  public schema = {
    tags: ["Config"],
    summary: "檢查是否需要強制更新",
    description: "檢查用戶當前應用版本是否需要強制更新到最新版本",
    operationId: "getForceUpdateCheck",
    request: {
      query: z.object({
        version: VersionSchema,
      }),
    },
    responses: {
      "200": {
        description: "成功檢查強制更新狀態",
        content: {
          "application/json": {
            schema: ForceUpdateCheckResponseSchema.openapi({
              description: "強制更新檢查結果",
              example: {
                success: true,
                result: {
                  forceUpdate: false,
                  requiredVersion: "1.0.0",
                  currentVersion: "1.2.3",
                },
              },
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
  };

  public async handle(c: AppContext) {
    try {
      // 獲取並驗證查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { version: currentVersion } = data.query;

      // 依賴注入：初始化完整的分層架構
      const firestoreService = getFirestoreServiceFromContext(c);
      const configRepository = new ConfigRepository(firestoreService);
      const envRepository = new EnvRepository(c.env);
      const configService = new ConfigService(configRepository, envRepository);
      const configController = new ConfigController(configService);

      // 調用 Controller 處理業務邏輯
      const result = await configController.checkForceUpdate({ version: currentVersion });

      // 根據 Controller 結果返回適當的 HTTP 響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        // 轉換為標準錯誤響應格式
        return c.json(
          ConfigController.toErrorResponse(result, 400),
          400
        );
      }
    } catch (error) {
      console.error("Endpoint: ForceUpdateCheck 處理錯誤:", error);

      // 處理驗證錯誤
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            errors: [
              {
                code: 400,
                message: `參數驗證失敗: ${error.errors.map(e => e.message).join(", ")}`,
              },
            ],
          },
          400
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