/**
 * User Module - 使用者管理模組
 *
 * 這個模組採用類似 NestJS 的架構設計，使用 @asla/hono-decorator
 * 提供裝飾器支援，實現模組化的使用者管理功能。
 *
 * 模組結構：
 * - Controller: 處理 HTTP 請求和響應
 * - Service: 實作業務邏輯
 * - Repository: 處理資料存取
 * - DTOs: 資料傳輸物件
 * - Types: 型別定義
 *
 * 使用方式：
 * ```typescript
 * import { UserModule } from './modules/users';
 *
 * // 註冊模組到 Hono 應用程式
 * UserModule.register(app, { firestore });
 * ```
 */

// 主要模組匯出
export { UserModule } from "./users.module";

// 控制器匯出
export { UserController } from "./users.controller";

// 服務層匯出
export { UserService } from "./users.service";
export type { IUserService } from "./users.service";

// 存儲庫層匯出
export { UserRepository } from "./users.repository";
export type { IUserRepository } from "./users.repository";

// DTO 匯出
export { CreateUserDto, CreateUserDtoSchema } from "./dtos/create-user.dto";
export type { CreateUserDtoType } from "./dtos/create-user.dto";
export { UpdateUserDto, UpdateUserDtoSchema } from "./dtos/update-user.dto";
export type { UpdateUserDtoType } from "./dtos/update-user.dto";
export {
  ApiErrorResponseSchema,
  ApiResponse,
  ApiResponseSchema,
  UserExistsResponseSchema,
  UserResponseSchema,
} from "./dtos/user-response.dto";
export type {
  ApiErrorResponse,
  UserExistsResponseDto,
  UserResponseDto,
} from "./dtos/user-response.dto";

// 型別匯出
export {
  AppUserSchema,
  CreateUserSchema,
  dateToFirestoreTimestamp,
  EntitlementInfoSchema,
  FirestoreDateSchema,
  firestoreTimestampToDate,
  GoalType,
  GoalTypeSchema,
  OptionalFirestoreDateSchema,
  RevenueCatSubscriptionSchema,
  UpdateUserSchema,
  WriteUserSchema,
} from "./types/user.types";
export type {
  AppUser,
  EntitlementInfo,
  RevenueCatSubscription,
} from "./types/user.types";

// 模組中繼資料匯出（用於其他模組參考）
export const UserModuleMetadata = {
  moduleName: "UserModule",
  version: "1.0.0",
  description:
    "使用者管理模組 - 使用 @asla/hono-decorator 實現類似 NestJS 的架構",
  routes: [
    "GET /users/exists/:uid - 檢查使用者是否存在",
    "GET /users/pro-status - 取得 Pro 訂閱狀態",
    "GET /users/upload-limit - 檢查上傳限制",
    "GET /users/:userId - 取得使用者資料",
    "POST /users - 建立新使用者",
    "PUT /users/:userId - 更新使用者資料",
    "DELETE /users/:userId - 刪除使用者",
  ],
  controllers: ["UserController"],
  services: ["UserService"],
  repositories: ["UserRepository"],
  dependencies: ["FirestoreClient"],
  features: [
    "裝飾器驅動的路由定義",
    "依賴注入支援",
    "型別安全的 DTO",
    "業務邏輯驗證",
    "Firebase Firestore 整合",
    "錯誤處理機制",
    "RevenueCat 訂閱管理",
    "同步設備管理",
    "存取權限控制",
  ],
} as const;
