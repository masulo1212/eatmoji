import { Hono } from "hono";
import { getFirestoreServiceFromContext } from "../../utils/firebase";
import { ConfigController } from "./config.controller";
import { ConfigService } from "./config.service";
import { ConfigRepository } from "./config.repository";
import { EnvRepository } from "./env.repository";

/**
 * Config Module 依賴注入配置
 */
export interface ConfigModuleDependencies {
  firestore: any; // IFirestoreService
}

/**
 * Config Module - NestJS 風格的模組管理
 * 
 * 功能：
 * - 管理 Config 相關的所有依賴注入
 * - 註冊 Controller 到主應用程式
 * - 處理模組初始化和配置
 */
export class ConfigModule {
  private static instance: ConfigModule | null = null;
  private static isRegistered = false;

  private constructor() {}

  /**
   * 獲取模組單例
   */
  static getInstance(): ConfigModule {
    if (!this.instance) {
      this.instance = new ConfigModule();
    }
    return this.instance;
  }

  /**
   * 註冊 Config 模組到主應用程式
   * @param app Hono 應用程式實例
   * @param dependencies 依賴注入配置
   */
  static register(
    app: Hono<any>,
    dependencies: ConfigModuleDependencies
  ): void {
    if (this.isRegistered) {
      console.log("ConfigModule 已經註冊，跳過重複註冊");
      return;
    }

    try {
      console.log("🔧 正在註冊 ConfigModule...");

      // 使用依賴注入中間件
      app.use("/config/*", async (c, next) => {
        try {
          // 動態建立依賴注入容器
          const firestoreService = getFirestoreServiceFromContext(c);
          const configRepository = new ConfigRepository(firestoreService);
          const envRepository = new EnvRepository(c.env);
          const configService = new ConfigService(configRepository, envRepository);
          const configController = new ConfigController(configService);

          // 將 controller 附加到 context，供路由使用
          c.set("configController", configController);

          await next();
        } catch (error) {
          console.error("ConfigModule 依賴注入失敗:", error);
          return c.json(
            {
              success: false,
              errors: [
                { code: 500, message: "Configuration service unavailable" },
              ],
            },
            500
          );
        }
      });

      // 註冊具體的路由端點
      this.registerRoutes(app);

      this.isRegistered = true;
      console.log("✅ ConfigModule 註冊完成");
    } catch (error) {
      console.error("❌ ConfigModule 註冊失敗:", error);
      throw error;
    }
  }

  /**
   * 註冊 Config 路由到應用程式
   */
  private static registerRoutes(app: Hono<any>): void {
    // GET /config/revenuecat-keys
    app.get("/config/revenuecat-keys", async (c) => {
      try {
        const configController = c.get("configController") as ConfigController;
        const result = await configController.getRevenueCatKeys();

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            ConfigController.toErrorResponse(result, 500),
            500
          );
        }
      } catch (error) {
        console.error("Route /config/revenuecat-keys 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /config/force-update-check
    app.get("/config/force-update-check", async (c) => {
      try {
        const version = c.req.query("version");
        if (!version) {
          return c.json(
            {
              success: false,
              errors: [{ code: 400, message: "版本參數缺失" }],
            },
            400
          );
        }

        const configController = c.get("configController") as ConfigController;
        const result = await configController.checkForceUpdate({ version });

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            ConfigController.toErrorResponse(result, 400),
            400
          );
        }
      } catch (error) {
        console.error("Route /config/force-update-check 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /config/maintenance-check
    app.get("/config/maintenance-check", async (c) => {
      try {
        const configController = c.get("configController") as ConfigController;
        const result = await configController.getMaintenanceStatus();

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            ConfigController.toErrorResponse(result, 500),
            500
          );
        }
      } catch (error) {
        console.error("Route /config/maintenance-check 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /config/app-config (附加端點)
    app.get("/config/app-config", async (c) => {
      try {
        const configController = c.get("configController") as ConfigController;
        const result = await configController.getAppConfig();

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            ConfigController.toErrorResponse(result, 500),
            500
          );
        }
      } catch (error) {
        console.error("Route /config/app-config 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });

    // GET /config/status (除錯端點)
    app.get("/config/status", async (c) => {
      try {
        const configController = c.get("configController") as ConfigController;
        const result = await configController.getConfigStatus();

        if (result.success) {
          return c.json(result, 200);
        } else {
          return c.json(
            ConfigController.toErrorResponse(result, 500),
            500
          );
        }
      } catch (error) {
        console.error("Route /config/status 錯誤:", error);
        return c.json(
          {
            success: false,
            errors: [{ code: 500, message: "Internal server error" }],
          },
          500
        );
      }
    });
  }

  /**
   * 檢查模組是否已註冊
   */
  static isModuleRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * 重設模組狀態（測試用）
   */
  static reset(): void {
    this.instance = null;
    this.isRegistered = false;
  }
}