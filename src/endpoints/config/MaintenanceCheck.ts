import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * 維修檢查回應格式
 */
export interface MaintenanceCheckResult {
  maintenanceEnabled: boolean;
  maintenanceEndTime?: string;
}

export const MaintenanceCheckResultSchema = z.object({
  maintenanceEnabled: z.boolean().describe("是否正在維修"),
  maintenanceEndTime: z.string().optional().describe("維修結束時間（可選）"),
});

export const MaintenanceCheckResponseSchema = z.object({
  success: z.boolean().default(true),
  result: MaintenanceCheckResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * MaintenanceCheck endpoint - 檢查系統是否正在維修
 *
 * 邏輯：
 * - 從 Firebase config/config 文檔讀取維修狀態
 * - 返回是否正在維修和可選的結束時間
 * - 對應 Flutter 的 _checkMaintenance() 方法
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
            schema: MaintenanceCheckResponseSchema.openapi({
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
      // 檢查維修狀態
      const maintenanceResult = await this.checkMaintenanceStatus(c);

      // console.log("MaintenanceCheck - maintenanceResult:", maintenanceResult);

      // 返回成功響應
      return c.json({
        success: true,
        result: maintenanceResult,
      });
    } catch (error) {
      console.error("Endpoint: MaintenanceCheck 處理錯誤:", error);

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
   * 檢查系統維修狀態
   * 對應 Flutter _checkMaintenance() 方法的邏輯
   */
  private async checkMaintenanceStatus(
    c: AppContext
  ): Promise<MaintenanceCheckResult> {
    try {
      const firestore = getFirestoreFromContext(c);
      const configDoc = await firestore.doc("config/config").get();

      if (!configDoc.exists) {
        console.warn(
          "MaintenanceCheck - Firebase config 文檔不存在，使用預設狀態"
        );
        return { maintenanceEnabled: false };
      }

      const configData = configDoc.data();
      const maintenanceEnabled = configData?.maintenanceEnabled || false;
      const maintenanceEndTime = configData?.maintenanceEndTime || "";

      // console.log("MaintenanceCheck - maintenanceEnabled:", maintenanceEnabled);
      // console.log("MaintenanceCheck - maintenanceEndTime:", maintenanceEndTime);

      // 構建回應結果
      const result: MaintenanceCheckResult = {
        maintenanceEnabled,
      };

      // 只有在有結束時間且不為空時才添加到回應中
      if (
        maintenanceEndTime &&
        typeof maintenanceEndTime === "string" &&
        maintenanceEndTime.trim() !== ""
      ) {
        result.maintenanceEndTime = maintenanceEndTime.trim();
      }

      return result;
    } catch (error) {
      console.error("MaintenanceCheck - 檢查維修狀態失敗:", error);
      // 出錯時返回非維修狀態，避免意外阻擋用戶
      return {
        maintenanceEnabled: false,
      };
    }
  }
}
