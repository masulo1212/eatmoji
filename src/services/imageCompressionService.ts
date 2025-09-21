import { PhotonImage, SamplingFilter, resize } from '@cf-wasm/photon';
import {
  CompressionOptions,
  DEFAULT_COMPRESSION_OPTIONS,
  ImageProcessingError,
} from '../types/image';

/**
 * 圖片壓縮服務介面
 * 對應 Flutter ImageCompressionService 的功能
 */
export interface IImageCompressionService {
  /**
   * 壓縮 Uint8Array 格式的圖片資料
   * @param imageBytes 原始圖片資料
   * @param options 壓縮選項
   * @returns 壓縮後的圖片資料
   */
  compressImageBytes(imageBytes: Uint8Array, options?: CompressionOptions): Promise<Uint8Array>;

  /**
   * 壓縮 Base64/DataURL 格式的圖片
   * @param dataURL 圖片的 Base64 或 DataURL 格式
   * @param options 壓縮選項
   * @returns 壓縮後的圖片資料
   */
  compressImageFromDataURL(dataURL: string, options?: CompressionOptions): Promise<Uint8Array>;

  /**
   * 取得圖片的基本資訊
   * @param imageData 圖片資料
   * @returns 圖片資訊
   */
  getImageInfo(imageData: Uint8Array | string): Promise<{
    width: number;
    height: number;
    size: number;
    format: string;
  }>;
}

/**
 * 圖片壓縮服務實作
 * 使用 @cf-wasm/photon (WebAssembly) 在 Cloudflare Workers 環境中處理圖片壓縮
 */
export class ImageCompressionService implements IImageCompressionService {
  
  /**
   * 壓縮 Uint8Array 格式的圖片資料
   * 對應 Flutter ImageCompressionService.compressImageBytes
   */
  async compressImageBytes(
    imageBytes: Uint8Array,
    options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS.ORIGINAL
  ): Promise<Uint8Array> {
    let inputImage: PhotonImage | null = null;
    let outputImage: PhotonImage | null = null;

    try {
      // 檢查檔案大小是否需要壓縮
      if (imageBytes.length <= (options.skipThreshold || 100 * 1024)) {
        console.log('圖片已經小於跳過閾值，跳過壓縮');
        return imageBytes;
      }

      // 從字節數組創建 PhotonImage
      inputImage = PhotonImage.new_from_byteslice(imageBytes);
      
      // 計算新尺寸
      const currentWidth = inputImage.get_width();
      const currentHeight = inputImage.get_height();
      const maxWidth = options.maxWidth || 1024;
      const maxHeight = options.maxHeight || 1024;
      
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      
      // 計算調整比例（保持寬高比）
      if (currentWidth > maxWidth || currentHeight > maxHeight) {
        const widthRatio = maxWidth / currentWidth;
        const heightRatio = maxHeight / currentHeight;
        const scale = Math.min(widthRatio, heightRatio);
        
        newWidth = Math.round(currentWidth * scale);
        newHeight = Math.round(currentHeight * scale);
      }
      
      // 調整圖片大小
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        outputImage = resize(inputImage, newWidth, newHeight, SamplingFilter.Lanczos3);
        console.log(`圖片調整大小: ${currentWidth}x${currentHeight} -> ${newWidth}x${newHeight}`);
      } else {
        outputImage = inputImage;
        inputImage = null; // 避免重複釋放
      }
      
      // 統一使用 PNG 格式以保持透明度
      let compressedBytes: Uint8Array;
      compressedBytes = outputImage.get_bytes();

      console.log(`圖片壓縮完成: ${imageBytes.length} bytes -> ${compressedBytes.length} bytes (PNG格式)`);
      return compressedBytes;
      
    } catch (error) {
      console.error('Photon 圖片壓縮失敗:', error);
      
      // 如果壓縮失敗，返回原始資料而不拋出錯誤
      console.warn('壓縮失敗，返回原始圖片資料');
      return imageBytes;
    } finally {
      // 重要：釋放 WebAssembly 記憶體
      if (inputImage) {
        inputImage.free();
      }
      if (outputImage && outputImage !== inputImage) {
        outputImage.free();
      }
    }
  }

  /**
   * 壓縮 Base64/DataURL 格式的圖片
   */
  async compressImageFromDataURL(
    dataURL: string,
    options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS.ORIGINAL
  ): Promise<Uint8Array> {
    try {
      // 解析 DataURL 或 Base64
      const imageBytes = this.dataURLToUint8Array(dataURL);
      
      // 使用現有的 compressImageBytes 方法
      return await this.compressImageBytes(imageBytes, options);

    } catch (error) {
      console.error('DataURL 圖片壓縮失敗:', error);
      throw new Error(`${ImageProcessingError.COMPRESSION_FAILED}: ${error}`);
    }
  }

  /**
   * 取得圖片的基本資訊
   * 注意：在 Cloudflare Workers 環境中功能有限
   */
  async getImageInfo(imageData: Uint8Array | string): Promise<{
    width: number;
    height: number;
    size: number;
    format: string;
  }> {
    try {
      let fileSize: number;

      if (typeof imageData === 'string') {
        // 處理 DataURL 或 Base64
        const bytes = this.dataURLToUint8Array(imageData);
        fileSize = bytes.length;
      } else {
        // 處理 Uint8Array
        fileSize = imageData.length;
      }

      // 在 Workers 環境中，我們無法取得真實的圖片尺寸
      // 返回預設值和檔案大小
      return {
        width: 0, // 無法在 Workers 中取得
        height: 0, // 無法在 Workers 中取得
        size: fileSize,
        format: 'image/png', // 假設為 PNG
      };

    } catch (error) {
      console.error('取得圖片資訊失敗:', error);
      throw new Error(`${ImageProcessingError.INVALID_DATA}: ${error}`);
    }
  }



  /**
   * 將 DataURL 或 Base64 轉換為 Uint8Array
   */
  private dataURLToUint8Array(dataURL: string): Uint8Array {
    try {
      let base64: string;

      if (dataURL.startsWith('data:')) {
        // 處理 DataURL 格式 (data:image/png;base64,...)
        const base64Index = dataURL.indexOf(',');
        if (base64Index === -1) {
          throw new Error('無效的 DataURL 格式');
        }
        base64 = dataURL.substring(base64Index + 1);
      } else {
        // 處理純 Base64 字串
        base64 = dataURL;
      }

      // 解碼 Base64
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes;

    } catch (error) {
      console.error('DataURL 轉換失敗:', error);
      throw new Error(`${ImageProcessingError.INVALID_DATA}: ${error}`);
    }
  }


  /**
   * 計算壓縮比率
   */
  public calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return compressedSize / originalSize;
  }

  /**
   * 取得適合的預設壓縮選項
   * @param imageType 圖片類型 ('sticker' | 'original')
   * @returns 對應的壓縮選項
   */
  public getDefaultOptions(imageType: 'sticker' | 'original' = 'original'): CompressionOptions {
    return imageType === 'sticker' 
      ? DEFAULT_COMPRESSION_OPTIONS.STICKER 
      : DEFAULT_COMPRESSION_OPTIONS.ORIGINAL;
  }
}