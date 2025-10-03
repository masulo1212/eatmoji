import {
  Controller,
  Get,
  Post,
  ToArguments,
  ToResponse,
  Use,
} from "@asla/hono-decorator";
import { Context } from "hono";
import { authMiddleware } from "../../middleware/auth";
import {
  CreateWeightDto,
  CreateWeightDtoSchema,
} from "./dtos/create-weight.dto";
import { WeightQueryDto, WeightQueryDtoSchema } from "./dtos/weight-query.dto";
import { ApiResponse } from "./dtos/weight-response.dto";
import { WeightEntry } from "./types/weight.types";
import { IWeightService } from "./weight.service";

/**
 * Weight Controller - 使用裝飾器版本
 * 處理體重相關的 HTTP 請求
 */
@Controller({ basePath: "/weight" })
@Use(authMiddleware) // 套用認證中間件到所有路由
export class WeightController {
  constructor(private weightService: IWeightService) {}

  /**
   * 新增體重記錄
   * POST /weight
   */
  @ToArguments(async (ctx: Context) => {
    // 驗證並解析請求體
    const body = await ctx.req.json();
    const validatedData = CreateWeightDtoSchema.parse(body);
    const dto = new CreateWeightDto(validatedData);

    // 取得使用者 ID
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    return [userId, dto];
  })
  @ToResponse((data: ApiResponse<void>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Post("/")
  async addWeight(
    userId: string,
    weightData: CreateWeightDto
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!weightData.weight || weightData.weight <= 0) {
        return ApiResponse.error("體重必須為正數");
      }

      if (!weightData.unit?.trim()) {
        return ApiResponse.error("體重單位不能為空");
      }

      // 調用 Service 層
      await this.weightService.addWeight(userId, weightData);

      return ApiResponse.success();
    } catch (error) {
      console.error("Controller: 新增體重記錄失敗:", error);
      return ApiResponse.error(
        error instanceof Error ? error.message : "新增體重記錄時發生未知錯誤"
      );
    }
  }

  /**
   * 取得體重記錄列表
   * GET /weight?startDate=YYYY-MM-DD
   */
  @ToArguments(async (ctx: Context) => {
    // 驗證查詢參數
    const query = ctx.req.query();
    const validatedQuery = WeightQueryDtoSchema.parse(query);
    const queryDto = new WeightQueryDto(validatedQuery);

    // 取得使用者 ID
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    return [userId, queryDto];
  })
  @ToResponse((data: ApiResponse<WeightEntry[]>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/")
  async getWeights(
    userId: string,
    query: WeightQueryDto
  ): Promise<ApiResponse<WeightEntry[]>> {
    try {
      // 轉換日期參數
      const startDate = query.getStartDateAsDate();

      // 調用 Service 層
      const weights = await this.weightService.getWeight(userId, startDate);

      return ApiResponse.success(weights);
    } catch (error) {
      console.error("Controller: 取得體重記錄列表失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "取得體重記錄列表時發生未知錯誤"
      );
    }
  }

  /**
   * 取得最新體重記錄
   * GET /weight/latest
   */
  @ToArguments(async (ctx: Context) => {
    // 取得使用者 ID
    const userId = ctx.get("userId");
    if (!userId) {
      throw new Error("使用者 ID 未找到");
    }

    return [userId];
  })
  @ToResponse((data: ApiResponse<WeightEntry | null>, ctx: Context) => {
    if (data.success) {
      return ctx.json(data, 200);
    } else {
      return ctx.json(data, 400);
    }
  })
  @Get("/latest")
  async getLatestWeight(
    userId: string
  ): Promise<ApiResponse<WeightEntry | null>> {
    try {
      // 調用 Service 層
      console.log("getLatestWeight", userId);
      const latestWeight = await this.weightService.getLatestWeight(userId);
      console.log("latestWeight", latestWeight);
      console.log(ApiResponse.success(latestWeight));

      return ApiResponse.success(latestWeight);
    } catch (error) {
      console.error("Controller: 取得最新體重記錄失敗:", error);
      return ApiResponse.error(
        error instanceof Error
          ? error.message
          : "取得最新體重記錄時發生未知錯誤"
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
