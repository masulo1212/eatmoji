import { IImageCompressionService } from "../services/imageCompressionService";
import {
  IR2StorageService,
  R2StorageService,
} from "../services/r2StorageService";
import { DEFAULT_COMPRESSION_OPTIONS, ImageUploadResult } from "../types/image";

/**
 * 圖片上傳請求介面
 */
export interface IngredientImageUploadRequest {
  /** 圖片資料（Base64 或 Uint8Array） */
  imageData: string | Uint8Array;
  /** 自定義檔名（可選，不含副檔名） */
  filename?: string;
}

/**
 * 圖片上傳控制器響應介面
 */
export interface ImageUploadControllerResponse {
  success: boolean;
  result?: ImageUploadResult;
  error?: string;
}

/**
 * 圖片上傳控制器
 * 簡化版架構：直接協調壓縮服務和存儲服務
 */
export class ImageUploadController {
  private compressionService: IImageCompressionService;
  private storageService: IR2StorageService;

  constructor(
    compressionService: IImageCompressionService,
    storageService: IR2StorageService
  ) {
    this.compressionService = compressionService;
    this.storageService = storageService;
  }

  /**
   * 上傳食材圖片
   * @param request 上傳請求
   * @returns 上傳結果
   */
  async uploadIngredientImage(
    request: IngredientImageUploadRequest
  ): Promise<ImageUploadControllerResponse> {
    try {
      console.log("🔄 開始處理食材圖片上傳");

      // 1. 驗證請求資料
      const validationError = this.validateRequest(request);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // 2. 轉換圖片資料為 Uint8Array
      let imageBytes: Uint8Array;
      try {
        imageBytes = await this.convertToUint8Array(request.imageData);
        console.log(`📦 原始圖片大小: ${imageBytes.length} bytes`);
      } catch (error) {
        return {
          success: false,
          error: `圖片資料轉換失敗: ${error}`,
        };
      }

      // 3. 壓縮圖片
      let compressedBytes: Uint8Array;
      try {
        console.log("🗜️ 開始壓縮圖片");
        compressedBytes = await this.compressionService.compressImageBytes(
          imageBytes,
          DEFAULT_COMPRESSION_OPTIONS.ORIGINAL // 使用原始圖片的壓縮設定
        );
        console.log(`📦 壓縮後圖片大小: ${compressedBytes.length} bytes`);
      } catch (error) {
        return {
          success: false,
          error: `圖片壓縮失敗: ${error}`,
        };
      }

      // 4. 處理檔名
      let filename = request.filename;
      if (filename) {
        // 使用自定義檔名，先進行格式化
        filename = R2StorageService.formatIngredientName(filename);
        if (!filename) {
          return {
            success: false,
            error: "提供的檔名無效，請使用英文字母和數字",
          };
        }
      }

      // 5. 上傳到 R2
      try {
        console.log("☁️ 開始上傳到 R2");
        const uploadResult = await this.storageService.uploadIngredientImage(
          compressedBytes,
          filename
        );

        // 6. 計算實際的壓縮比率
        const actualResult: ImageUploadResult = {
          ...uploadResult,
          originalSize: imageBytes.length,
          compressedSize: compressedBytes.length,
          compressionRatio: compressedBytes.length / imageBytes.length,
        };

        console.log("✅ 圖片上傳完成");

        return {
          success: true,
          result: actualResult,
        };
      } catch (error) {
        return {
          success: false,
          error: `圖片上傳失敗: ${error}`,
        };
      }
    } catch (error) {
      console.error("❌ 圖片上傳控制器錯誤:", error);
      return {
        success: false,
        error: `處理過程中發生錯誤: ${error}`,
      };
    }
  }

  /**
   * 驗證上傳請求
   */
  private validateRequest(
    request: IngredientImageUploadRequest
  ): string | null {
    if (!request.imageData) {
      return "圖片資料不能為空";
    }

    // 檢查資料類型
    if (
      typeof request.imageData !== "string" &&
      !(request.imageData instanceof Uint8Array)
    ) {
      return "圖片資料格式無效，必須是 Base64 字串或 Uint8Array";
    }

    // 檢查資料長度
    const dataLength =
      typeof request.imageData === "string"
        ? request.imageData.length
        : request.imageData.length;

    if (dataLength < 100) {
      return "圖片資料太小，可能不是有效的圖片";
    }

    // 檢查檔名（如果提供）
    if (request.filename) {
      if (typeof request.filename !== "string") {
        return "檔名必須是字串";
      }
      if (request.filename.length > 50) {
        return "檔名太長，請控制在50個字符以內";
      }
    }

    return null;
  }

  /**
   * 將圖片資料轉換為 Uint8Array
   */
  private async convertToUint8Array(
    imageData: string | Uint8Array
  ): Promise<Uint8Array> {
    if (imageData instanceof Uint8Array) {
      return imageData;
    }

    // 處理 Base64 字串
    if (typeof imageData === "string") {
      // 如果是 DataURL，先提取 Base64 部分
      let base64 = imageData;
      if (imageData.startsWith("data:")) {
        const commaIndex = imageData.indexOf(",");
        if (commaIndex === -1) {
          throw new Error("無效的 DataURL 格式");
        }
        base64 = imageData.substring(commaIndex + 1);
      }

      try {
        // 解碼 Base64
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes;
      } catch (error) {
        throw new Error(`Base64 解碼失敗: ${error}`);
      }
    }

    throw new Error("不支援的圖片資料格式");
  }
}
