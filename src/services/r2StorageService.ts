import { ImageProcessingError, ImageUploadResult } from "../types/image";

/**
 * R2 存儲服務介面
 */
export interface IR2StorageService {
  /**
   * 上傳圖片到 R2 的 ingredients 資料夾
   * @param imageData 圖片資料 (Uint8Array)
   * @param filename 自訂檔名（可選）
   * @returns 上傳結果包含 URL
   */
  uploadIngredientImage(
    imageData: Uint8Array,
    filename?: string
  ): Promise<ImageUploadResult>;

  /**
   * 檢查食材圖片是否存在
   * @param filename 檔名（不含副檔名）
   * @returns 檢查結果包含是否存在和 URL
   */
  checkIngredientImageExists(filename: string): Promise<{
    exists: boolean;
    url?: string;
  }>;
}

/**
 * R2 存儲服務實作
 * 專門處理食材圖片上傳到 Cloudflare R2
 */
export class R2StorageService implements IR2StorageService {
  private bucket: R2Bucket;
  private publicDomain?: string;
  private bucketHash: string;

  constructor(bucket: R2Bucket, bucketHash: string, publicDomain?: string) {
    this.bucket = bucket;
    this.bucketHash = bucketHash;
    this.publicDomain = publicDomain;
  }

  /**
   * 上傳食材圖片到 R2
   */
  async uploadIngredientImage(
    imageData: Uint8Array,
    filename?: string
  ): Promise<ImageUploadResult> {
    try {
      const fileName = filename || this.generateFileName();
      const key = `ingredients/${fileName}.png`; // 統一使用 PNG 格式

      const originalSize = imageData.length;

      console.log(`🔄 開始上傳圖片到 R2: ${key}`);
      console.log(`📦 檔案大小: ${originalSize} bytes`);

      // 上傳檔案到 R2
      await this.bucket.put(key, imageData, {
        httpMetadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=31536000", // 維持1年快取31536000，依靠主動清除
        },
      });

      // 生成公開 URL
      const url = this.generatePublicUrl(key);

      return {
        url,
        originalSize,
        compressedSize: originalSize, // R2 不壓縮，大小相同
        compressionRatio: 1,
      };
    } catch (error) {
      console.error("❌ R2 上傳失敗:", error);
      throw new Error(
        `${ImageProcessingError.UPLOAD_FAILED}: R2 上傳失敗 - ${error}`
      );
    }
  }

  /**
   * 生成檔案名稱
   * 格式: ingredient_{timestamp}
   */
  private generateFileName(): string {
    const timestamp = Date.now();
    return `ingredient_${timestamp}`;
  }

  /**
   * 生成公開 URL
   * 如果有自定義域名則使用，否則使用 R2 預設域名
   */
  private generatePublicUrl(key: string): string {
    if (this.publicDomain) {
      // 使用自定義域名
      return `https://${this.publicDomain}/${key}`;
    } else {
      // 使用 R2 的預設公開域名格式
      return `https://pub-${this.bucketHash}.r2.dev/${key}`;
    }
  }

  /**
   * 檢查食材圖片是否存在
   */
  async checkIngredientImageExists(filename: string): Promise<{
    exists: boolean;
    url?: string;
  }> {
    try {
      const key = `ingredients/${filename}.png`;

      console.log(`🔍 檢查圖片是否存在: ${key}`);

      // 使用 R2 的 head 方法檢查檔案是否存在
      const object = await this.bucket.head(key);

      if (object) {
        const url = this.generatePublicUrl(key);
        console.log(`✅ 圖片存在: ${url}`);

        return {
          exists: true,
          url: url,
        };
      }

      console.log(`❌ 圖片不存在: ${key}`);
      return { exists: false };
    } catch (error) {
      // 如果檔案不存在，R2 會拋出錯誤
      console.log(`❌ 圖片不存在或檢查失敗: ${filename}.png`, error);
      return { exists: false };
    }
  }

  /**
   * 檔名格式化：將食材名稱轉換為適合的檔名
   * @param ingredientName 食材名稱
   * @returns 格式化的檔名（不含副檔名）
   */
  static formatIngredientName(ingredientName: string): string {
    if (ingredientName.trim().length === 0) return "";

    return ingredientName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // 只保留字母、數字、空格
      .replace(/\s+/g, "_") // 空格轉下底線
      .replace(/_+/g, "_") // 多個下底線合併
      .replace(/^_+|_+$/g, "") // 去除開頭和結尾的下底線
      .substring(0, 30); // 限制長度
  }
}
