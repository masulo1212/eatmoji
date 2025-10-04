import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  ToArguments,
  ToResponse,
  Use,
} from "@asla/hono-decorator";
import { Context } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { CreateUserDto, CreateUserDtoSchema } from "./dtos/create-user.dto";
import { UpdateUserDto, UpdateUserDtoSchema } from "./dtos/update-user.dto";
import { ApiResponse } from "./dtos/user-response.dto";
import { AppUser } from "./types/user.types";
import { IUserService } from "./users.service";

/**
 * User Controller - 使用裝飾器版本
 * 處理使用者相關的 HTTP 請求
 */
@Controller({ basePath: "/users" })
@Use(authMiddleware) // 套用認證中間件到所有路由
export class UserController {
  constructor(private userService: IUserService) {}

  /**
   * 檢查使用者是否存在
   * GET /users/exists/:uid
   */
  @ToArguments(async (ctx: Context) => {
    const uid = ctx.req.param("uid");
    if (!uid) {
      throw new Error("使用者 UID 參數缺失");
    }
    return [uid];
  })
  @ToResponse((data: ApiResponse<boolean>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/exists/:uid")
  async checkUserExists(uid: string): Promise<ApiResponse<boolean>> {
    try {
      const exists = await this.userService.checkUserExists(uid);
      return ApiResponse.success(exists);
    } catch (error) {
      console.error("Controller: 檢查使用者是否存在失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "檢查使用者是否存在時發生未知錯誤"
      );
    }
  }

  /**
   * 取得使用者 Pro 訂閱狀態
   * GET /users/pro-status
   */
  @ToArguments(async (ctx: Context) => {
    // 取得當前認證使用者的 ID
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }
    return [userId];
  })
  @ToResponse((data: ApiResponse<boolean>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/pro-status")
  async getProStatus(userId: string): Promise<ApiResponse<boolean>> {
    try {
      const user = await this.userService.getUser(userId);
      if (!user) {
        return ApiResponse.error("使用者不存在");
      }

      // 檢查 RevenueCat 訂閱狀態
      const hasActiveSubscription =
        user.activeSubscriptions && user.activeSubscriptions.length > 0;

      return ApiResponse.success(!!hasActiveSubscription);
    } catch (error) {
      console.error("Controller: 取得 Pro 狀態失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "取得 Pro 狀態時發生未知錯誤"
      );
    }
  }

  /**
   * 檢查使用者上傳限制
   * GET /users/upload-limit
   */
  @ToArguments(async (ctx: Context) => {
    // 取得當前認證使用者的 ID
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }
    return [userId];
  })
  @ToResponse(
    (
      data: ApiResponse<{ canUpload: boolean; remainingUploads?: number }>,
      ctx: Context
    ) => {
      if (data.success) {
        return ctx.json(data, 200);
      } else {
        return ctx.json(data, 400);
      }
    }
  )
  @Get("/upload-limit")
  async getUploadLimit(
    userId: string
  ): Promise<ApiResponse<{ canUpload: boolean; remainingUploads?: number }>> {
    try {
      const user = await this.userService.getUser(userId);
      if (!user) {
        return ApiResponse.error("使用者不存在");
      }

      // 檢查是否為 Pro 用戶
      const hasActiveSubscription =
        user.activeSubscriptions && user.activeSubscriptions.length > 0;

      if (hasActiveSubscription) {
        // Pro 用戶無限制
        return ApiResponse.success({ canUpload: true });
      } else {
        // 免費用戶需要檢查上傳限制
        // TODO: 實現上傳次數檢查邏輯
        return ApiResponse.success({
          canUpload: true,
          remainingUploads: 10, // 暫時回傳假資料
        });
      }
    } catch (error) {
      console.error("Controller: 檢查上傳限制失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "檢查上傳限制時發生未知錯誤"
      );
    }
  }

  /**
   * 取得使用者資料
   * GET /users/:userId
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.req.param("userId");
    if (!userId) {
      throw new Error("使用者 ID 參數缺失");
    }

    // 驗證使用者只能存取自己的資料
    const authUserId = ctx.get("userId");
    if (authUserId !== userId) {
      throw new Error("無權限存取此使用者資料");
    }

    return [userId];
  })
  @ToResponse((data: ApiResponse<AppUser>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/:userId")
  async getUser(userId: string): Promise<ApiResponse<AppUser>> {
    try {
      const user = await this.userService.getUser(userId);
      console.log(userId);
      console.log("Controller: 取得使用者資料成功:", user);
      if (!user) {
        return ApiResponse.error("使用者不存在");
      }
      console.log(ApiResponse.success(user));
      return ApiResponse.success(user);
    } catch (error) {
      console.error("Controller: 取得使用者資料失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "取得使用者資料時發生未知錯誤"
      );
    }
  }

  /**
   * 建立新使用者
   * POST /users
   */
  @ToArguments(async (ctx: Context) => {
    // 驗證並解析請求體
    const body = await ctx.req.json();
    const validatedData = CreateUserDtoSchema.parse(body);
    const dto = new CreateUserDto(validatedData);

    // 取得認證使用者 ID（如果有）
    const authUserId = ctx.get("userId");

    // 如果 DTO 中沒有提供 uid，使用認證的使用者 ID
    if (!dto.uid && authUserId) {
      dto.uid = authUserId;
    }

    return [dto];
  })
  @ToResponse((data: ApiResponse<void>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 201);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Post("")
  async createUser(userData: CreateUserDto): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!userData.email || userData.email.trim() === "") {
        return ApiResponse.error("電子郵件不能為空");
      }

      // 調用 Service 層
      await this.userService.createUser(userData);

      return ApiResponse.success();
    } catch (error) {
      console.error("Controller: 建立使用者失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "建立使用者時發生未知錯誤"
      );
    }
  }

  /**
   * 更新使用者資料
   * PUT /users/:userId
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.req.param("userId");
    if (!userId) {
      throw new Error("使用者 ID 參數缺失");
    }

    // 驗證使用者只能更新自己的資料
    const authUserId = ctx.get("userId");
    if (authUserId !== userId) {
      throw new Error("無權限修改此使用者資料");
    }

    // 驗證並解析請求體
    const body = await ctx.req.json();
    const validatedData = UpdateUserDtoSchema.parse(body);
    const dto = new UpdateUserDto(validatedData);

    return [userId, dto];
  })
  @ToResponse((data: ApiResponse<void>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Put("/:userId")
  async updateUser(
    userId: string,
    userData: UpdateUserDto
  ): Promise<ApiResponse<void>> {
    try {
      // 調用 Service 層
      await this.userService.updateUser(userId, userData);

      return ApiResponse.success();
    } catch (error) {
      console.error("Controller: 更新使用者資料失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "更新使用者資料時發生未知錯誤"
      );
    }
  }

  /**
   * 刪除使用者
   * DELETE /users/:userId
   */
  @ToArguments(async (ctx: Context) => {
    const userId = ctx.req.param("userId");
    if (!userId) {
      throw new Error("使用者 ID 參數缺失");
    }

    // 驗證使用者只能刪除自己的資料
    const authUserId = ctx.get("userId");
    if (authUserId !== userId) {
      throw new Error("無權限刪除此使用者資料");
    }

    return [userId];
  })
  @ToResponse((data: ApiResponse<void>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Delete("/:userId")
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      // 調用 Service 層
      await this.userService.deleteUser(userId);

      return ApiResponse.success();
    } catch (error) {
      console.error("Controller: 刪除使用者失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "刪除使用者時發生未知錯誤"
      );
    }
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ) {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }
}
