import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * 強制更新檢查回應格式
 */
export interface ForceUpdateCheckResult {
  forceUpdate: boolean;
  requiredVersion: string;
  currentVersion: string;
}

export const ForceUpdateCheckResultSchema = z.object({
  forceUpdate: z.boolean().describe("是否需要強制更新"),
  requiredVersion: z.string().describe("最低要求版本"),
  currentVersion: z.string().describe("用戶當前版本"),
});

export const ForceUpdateCheckResponseSchema = z.object({
  success: z.boolean().default(true),
  result: ForceUpdateCheckResultSchema.optional(),
  error: z.string().optional(),
});

/**
 * ForceUpdateCheck endpoint - 檢查是否需要強制更新
 *
 * 邏輯：
 * - 接收用戶當前版本號
 * - 從 Firebase config/config 文檔讀取強制更新版本
 * - 當前版本 < 強制更新版本時，返回 forceUpdate: true
 */
export class ForceUpdateCheck extends OpenAPIRoute {
  public schema = {
    tags: ["Config"],
    summary: "檢查是否需要強制更新",
    description: "檢查用戶當前應用版本是否需要強制更新到最新版本",
    operationId: "getForceUpdateCheck",
    request: {
      query: z.object({
        version: z
          .string()
          .describe("用戶當前應用版本，格式：x.y.z（如：1.2.3）")
          .regex(/^\d+\.\d+\.\d+/, "版本格式必須為 x.y.z"),
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
      // 獲取查詢參數
      const data = await this.getValidatedData<typeof this.schema>();
      const { version: currentVersion } = data.query;

      // console.log("ForceUpdateCheck - currentVersion:", currentVersion);

      // 從 Firebase 獲取強制更新版本
      const requiredVersion = await this.getForceUpdateVersionFromFirebase(c);
      // console.log("ForceUpdateCheck - requiredVersion:", requiredVersion);

      // 檢查是否需要強制更新
      const forceUpdateResult = this.checkForceUpdate(
        currentVersion,
        requiredVersion
      );

      // 返回成功響應
      return c.json({
        success: true,
        result: forceUpdateResult,
      });
    } catch (error) {
      console.error("Endpoint: ForceUpdateCheck 處理錯誤:", error);

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
   * 檢查是否需要強制更新
   * 對應 Flutter checkForceUpdate() 方法的邏輯
   */
  private checkForceUpdate(
    currentVersion: string,
    requiredVersion: string
  ): ForceUpdateCheckResult {
    try {
      const versionComparison = this.compareVersions(
        currentVersion,
        requiredVersion
      );

      // 如果當前版本 < 強制更新版本，需要更新
      const forceUpdate = versionComparison < 0;

      // console.log("ForceUpdateCheck - versionComparison:", versionComparison);
      // console.log("ForceUpdateCheck - forceUpdate:", forceUpdate);

      return {
        forceUpdate,
        requiredVersion,
        currentVersion,
      };
    } catch (error) {
      console.error("ForceUpdateCheck - 檢查強制更新失敗:", error);
      // 出錯時不強制更新，避免阻擋用戶操作
      return {
        forceUpdate: false,
        requiredVersion,
        currentVersion,
      };
    }
  }

  /**
   * 從 Firebase 獲取強制更新版本
   */
  private async getForceUpdateVersionFromFirebase(
    c: AppContext
  ): Promise<string> {
    try {
      const firestore = getFirestoreFromContext(c);
      const configDoc = await firestore.doc("config/config").get();

      if (!configDoc.exists) {
        console.warn(
          "ForceUpdateCheck - Firebase config 文檔不存在，使用預設版本"
        );
        return "1.0.0";
      }

      const configData = configDoc.data();
      const forceUpdateVersion = configData?.forceUpdateVersion;

      if (!forceUpdateVersion || typeof forceUpdateVersion !== "string") {
        console.warn(
          "ForceUpdateCheck - Firebase config 中沒有 forceUpdateVersion，使用預設版本"
        );
        return "1.0.0";
      }

      return forceUpdateVersion;
    } catch (error) {
      console.error("ForceUpdateCheck - 從 Firebase 讀取配置失敗:", error);
      // 出錯時返回預設版本，避免阻擋用戶
      return "1.0.0";
    }
  }

  /**
   * 比較版本字串（語義化版本比較）
   * 對應 Flutter _compareVersions() 方法
   *
   * @param current 當前版本
   * @param remote 遠端版本
   * @returns -1 表示 current < remote，0 表示相等，1 表示 current > remote
   */
  private compareVersions(current: string, remote: string): number {
    try {
      // 移除版本號中的後綴（如 -dev, -beta 等）
      const cleanVersion = (version: string): string => {
        return version.replace(/-.*$/, "");
      };

      const currentParts = cleanVersion(current)
        .split(".")
        .map((part) => parseInt(part, 10) || 0);

      const remoteParts = cleanVersion(remote)
        .split(".")
        .map((part) => parseInt(part, 10) || 0);

      // 補齊版本號至相同長度
      const maxLength = Math.max(currentParts.length, remoteParts.length);

      while (currentParts.length < maxLength) {
        currentParts.push(0);
      }
      while (remoteParts.length < maxLength) {
        remoteParts.push(0);
      }

      // 逐一比較各個版本號段
      for (let i = 0; i < maxLength; i++) {
        if (currentParts[i] < remoteParts[i]) return -1;
        if (currentParts[i] > remoteParts[i]) return 1;
      }

      return 0;
    } catch (error) {
      console.error("ForceUpdateCheck - 版本比較失敗:", error);
      // 出錯時假設版本相等，不強制更新
      return 0;
    }
  }
}
