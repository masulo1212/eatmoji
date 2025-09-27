import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { DiaryResponseSchema } from "../../types/diary";
import { CreateDiaryWithImagesRequestSchema } from "../../types/image";

// 導入重構後的分層架構
import { DiaryController } from "../../controllers/diaryController";
import { FirestoreDiaryRepository } from "../../repositories/diaryRepository";
import { DiaryService } from "../../services/diaryService";
import { ImageCompressionService } from "../../services/imageCompressionService";
import {
  getFirestoreFromContext,
  getStorageFromContext,
} from "../../utils/firebase";

/**
 * DiariesWithImages endpoint - 建立包含圖片的 diary
 * 對應 Flutter 的 addDiaryWithImage 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 圖片資料驗證
 * - 調用完整的依賴注入鏈
 * - 錯誤響應格式化
 */
export class DiariesWithImages extends OpenAPIRoute {
  public schema = {
    tags: ["Diaries"],
    summary: "建立包含圖片的新 diary",
    description: "建立新的 diary 項目，支援原始圖片和貼紙圖片的上傳處理",
    operationId: "createDiaryWithImages",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateDiaryWithImagesRequestSchema.openapi({
              description: "包含圖片的 Diary 建立請求",
            }),
          },
        },
      },
    },
    responses: {
      "201": {
        description: "成功建立包含圖片的 diary",
        content: {
          "application/json": {
            schema: DiaryResponseSchema.openapi({
              description: "建立的 Diary 回應",
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤或圖片處理失敗",
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
        description: "伺服器錯誤或圖片上傳失敗",
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
    security: [
      {
        Bearer: [],
      },
    ],
  };

  public async handle(c: AppContext) {
    try {
      // 從認證中間件獲取使用者 ID
      const userId = requireUserIdFromMiddleware(c);

      // 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const request = data.body;
      // console.log("request", request); // 不可以隨意用這一行，會導致Log size limit exceeded: More than 256KB of data

      // 驗證圖片資料格式
      this.validateImageData(request);

      // 初始化完整的依賴注入鏈
      const firestore = getFirestoreFromContext(c);
      const storageService = getStorageFromContext(c);
      const imageCompressionService = new ImageCompressionService();

      const diaryRepository = new FirestoreDiaryRepository(firestore);
      const diaryService = new DiaryService(
        diaryRepository,
        imageCompressionService,
        storageService
      );
      const diaryController = new DiaryController(diaryService);

      // 調用 Controller 層處理包含圖片的 diary 建立
      const response = await diaryController.createDiaryWithImages(
        userId,
        request
      );

      // 檢查業務邏輯結果
      if (!response.success) {
        // 根據錯誤類型決定狀態碼
        let statusCode = 500;
        if (
          response.error?.includes("驗證") ||
          response.error?.includes("格式") ||
          response.error?.includes("不能為空")
        ) {
          statusCode = 400;
        } else if (
          response.error?.includes("圖片處理") ||
          response.error?.includes("上傳")
        ) {
          statusCode = 500;
        }

        return c.json(
          DiaryController.toErrorResponse(response, statusCode),
          statusCode as any
        );
      }

      // 返回成功響應
      return c.json(
        {
          success: true,
          result: response.result,
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: DiariesWithImages 處理錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message ===
          "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json(
          {
            success: false,
            errors: [{ code: 401, message: "Authentication required" }],
          },
          401 as any
        );
      }

      // 處理圖片處理相關錯誤
      if (
        error instanceof Error &&
        (error.message.includes("圖片") ||
          error.message.includes("壓縮") ||
          error.message.includes("上傳"))
      ) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: `圖片處理錯誤: ${error.message}` }],
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

  /**
   * 驗證圖片資料格式
   */
  private validateImageData(request: any): void {
    // 檢查是否有圖片資料
    const hasOriginalImages =
      request.originalImgs && request.originalImgs.length > 0;
    const hasStickerImage = request.stickerImg;

    if (!hasOriginalImages && !hasStickerImage) {
      // 沒有圖片資料，這是正常的（可能只是建立沒有圖片的 diary）
      return;
    }

    // 驗證原始圖片格式
    if (hasOriginalImages) {
      for (let i = 0; i < request.originalImgs.length; i++) {
        const imageData = request.originalImgs[i];
        if (!this.isValidImageData(imageData)) {
          throw new Error(
            `原始圖片 ${i + 1} 格式無效：必須是 Base64 字串或 Uint8Array`
          );
        }
      }
    }

    // 驗證貼紙圖片格式
    if (hasStickerImage) {
      if (!this.isValidImageData(request.stickerImg)) {
        throw new Error("貼紙圖片格式無效：必須是 Base64 字串或 Uint8Array");
      }
    }
  }

  /**
   * 檢查圖片資料是否為有效格式
   */
  private isValidImageData(imageData: any): boolean {
    // 檢查是否為字串（Base64 或 DataURL）
    if (typeof imageData === "string") {
      // 基本長度檢查（Base64 編碼的圖片通常會很長）
      return imageData.length > 100;
    }

    // 檢查是否為 Uint8Array
    if (imageData instanceof Uint8Array) {
      return imageData.length > 100;
    }

    return false;
  }
}
