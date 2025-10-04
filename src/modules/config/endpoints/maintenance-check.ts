import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../../types";
import { getFirestoreServiceFromContext } from "../../../utils/firebase";
import { ConfigController } from "../config.controller";
import { ConfigService } from "../config.service";
import { ConfigRepository } from "../config.repository";
import { EnvRepository } from "../env.repository";
import { MaintenanceStatusResponseSchema } from "../dtos/maintenance.dto";

/**
 * MaintenanceCheck endpoint - 檢查系統是否正在維修
 * 重構為使用 NestJS 風格的分層架構，但保持 OpenAPI 3.1 schema
 */
export class MaintenanceCheck extends OpenAPIRoute {
  public schema = {
    tags: ["Config"],
    summary: "檢查系統維修狀態",
    description: "檢查系統是否正在維修，以及預計的維修結束時間",
    operationId: "getMaintenanceStatus",
    request: {
      // 這個端點不需要任何請求參數
    },
    responses: {
      "200": {
        description: "成功檢查維修狀態",
        content: {
          "application/json": {
            schema: MaintenanceStatusResponseSchema.openapi({
              description: "系統維修狀態檢查結果",
              example: {
                success: true,
                result: {
                  maintenanceEnabled: false,
                  maintenanceEndTime: "2024-01-01 10:00",
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
      // 依賴注入：初始化完整的分層架構
      const firestoreService = getFirestoreServiceFromContext(c);
      const configRepository = new ConfigRepository(firestoreService);
      const envRepository = new EnvRepository(c.env);
      const configService = new ConfigService(configRepository, envRepository);
      const configController = new ConfigController(configService);

      // 調用 Controller 處理業務邏輯
      const result = await configController.getMaintenanceStatus();

      // 根據 Controller 結果返回適當的 HTTP 響應
      if (result.success) {
        return c.json(result, 200);
      } else {
        // 轉換為標準錯誤響應格式
        return c.json(
          ConfigController.toErrorResponse(result, 500),
          500
        );
      }
    } catch (error) {
      console.error("Endpoint: MaintenanceCheck 處理錯誤:", error);

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