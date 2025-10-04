/**
 * Config 模組入口檔案
 * 導出所有公開的介面和類別
 */

// 模組主入口
export { ConfigModule } from "./config.module";

// Controller
export { ConfigController } from "./config.controller";

// Services
export { ConfigService } from "./config.service";
export type { IConfigService } from "./config.service";

// Repositories
export { ConfigRepository } from "./config.repository";
export type { IConfigRepository } from "./config.repository";
export { EnvRepository } from "./env.repository";
export type { IEnvRepository } from "./env.repository";

// DTOs
export {
  GetRevenueCatKeysDto,
  RevenueCatKeysResponseDto,
  GetRevenueCatKeysDtoSchema,
  RevenueCatKeysResponseSchema,
  type GetRevenueCatKeysDtoType,
  type RevenueCatKeysResponseType,
} from "./dtos/revenuecat-keys.dto";

export {
  ForceUpdateCheckDto,
  ForceUpdateCheckResponseDto,
  ForceUpdateCheckDtoSchema,
  ForceUpdateCheckResponseSchema,
  type ForceUpdateCheckDtoType,
  type ForceUpdateCheckResponseType,
} from "./dtos/force-update.dto";

export {
  GetMaintenanceStatusDto,
  MaintenanceStatusResponseDto,
  GetMaintenanceStatusDtoSchema,
  MaintenanceStatusResponseSchema,
  type GetMaintenanceStatusDtoType,
  type MaintenanceStatusResponseType,
} from "./dtos/maintenance.dto";

// Types
export {
  type RevenueCatKeys,
  type ForceUpdateResult,
  type MaintenanceStatus,
  type FirebaseConfig,
  type AppConfig,
  type EnvConfig,
  type ConfigQueryOptions,
  RevenueCatKeysSchema,
  ForceUpdateResultSchema,
  MaintenanceStatusSchema,
  FirebaseConfigSchema,
  VersionSchema,
} from "./types/config.types";

// Endpoints (for OpenAPI)
export { RevenueCatKeys as RevenueCatKeysEndpoint } from "./endpoints/revenuecat-keys";
export { ForceUpdateCheck as ForceUpdateCheckEndpoint } from "./endpoints/force-update-check";
export { MaintenanceCheck as MaintenanceCheckEndpoint } from "./endpoints/maintenance-check";
export { configRouter } from "./endpoints/router";