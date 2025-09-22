import { z } from "zod";
import { CreateDiarySchema } from "./diary";

/**
 * 圖片壓縮選項介面
 * 對應 Flutter ImageCompressionService 的壓縮參數
 */
export interface CompressionOptions {
  /** 最大寬度，預設值依據使用情境決定 */
  maxWidth?: number;
  /** 最大高度，預設值依據使用情境決定 */
  maxHeight?: number;
  /** 跳過壓縮的檔案大小閾值（bytes），預設 100KB */
  skipThreshold?: number;
  /** 圖片品質 (0-1)，預設 0.8 */
  quality?: number;
  /** 是否保持 EXIF 資訊，預設 false */
  preserveExif?: boolean;
}

/**
 * 圖片壓縮選項的 Zod schema
 */
export const CompressionOptionsSchema = z.object({
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  skipThreshold: z
    .number()
    .positive()
    .default(100 * 1024), // 100KB
  quality: z.number().min(0).max(1).default(0.8),
  preserveExif: z.boolean().default(false),
});

/**
 * 圖片上傳請求介面
 */
export interface ImageUploadRequest {
  /** 圖片資料（Base64 或 Uint8Array） */
  imageData: string | Uint8Array;
  /** 使用者 ID */
  userId: string;
  /** 壓縮選項 */
  compressionOptions?: CompressionOptions;
}

/**
 * 圖片上傳請求的 Zod schema
 */
export const ImageUploadRequestSchema = z.object({
  imageData: z.union([z.string(), z.instanceof(Uint8Array)]),
  userId: z.string().min(1),
  compressionOptions: CompressionOptionsSchema.optional(),
});

/**
 * 多張圖片上傳請求介面
 */
export interface MultipleImageUploadRequest {
  /** 圖片資料陣列 */
  imagesData: (string | Uint8Array)[];
  /** 使用者 ID */
  userId: string;
  /** 壓縮選項 */
  compressionOptions?: CompressionOptions;
}

/**
 * 多張圖片上傳請求的 Zod schema
 */
export const MultipleImageUploadRequestSchema = z.object({
  imagesData: z.array(z.union([z.string(), z.instanceof(Uint8Array)])),
  userId: z.string().min(1),
  compressionOptions: CompressionOptionsSchema.optional(),
});

/**
 * 包含圖片的 Diary 建立請求介面
 * 擴展基本的 Diary 建立請求，加入圖片處理
 */
export interface CreateDiaryWithImagesRequest {
  /** 基本 Diary 資料 */
  diaryData: Omit<
    z.infer<typeof CreateDiarySchema>,
    "originalImgs" | "stickerImg"
  > & {
    /** 自定義 ID */
    id: string;
  };
  /** 原始圖片資料陣列（可選） */
  originalImgs?: (string | Uint8Array)[] | null;
  /** 貼紙圖片資料（可選） */
  stickerImg?: string | Uint8Array | null;
  /** 是否儲存到食物資料庫，預設 false */
  saveToFoodDB?: boolean;
}

/**
 * 包含圖片的 Diary 建立請求的 Zod schema
 */
export const CreateDiaryWithImagesRequestSchema = z.object({
  diaryData: CreateDiarySchema.omit({ originalImgs: true, stickerImg: true }),
  originalImgs: z
    .array(z.union([z.string(), z.instanceof(Uint8Array)]))
    .nullish(),
  stickerImg: z.union([z.string(), z.instanceof(Uint8Array)]).nullish(),
  saveToFoodDB: z.boolean().default(false),
});

/**
 * 圖片上傳結果介面
 */
export interface ImageUploadResult {
  /** 上傳成功的圖片 URL */
  url: string;
  /** 原始檔案大小（bytes） */
  originalSize: number;
  /** 壓縮後檔案大小（bytes） */
  compressedSize: number;
  /** 壓縮比率 (0-1) */
  compressionRatio: number;
}

/**
 * 圖片上傳結果的 Zod schema
 */
export const ImageUploadResultSchema = z.object({
  url: z.string().url(),
  originalSize: z.number().nonnegative(),
  compressedSize: z.number().nonnegative(),
  compressionRatio: z.number().min(0).max(1),
});

/**
 * 多張圖片上傳結果介面
 */
export interface MultipleImageUploadResult {
  /** 成功上傳的圖片結果 */
  successResults: ImageUploadResult[];
  /** 失敗的圖片索引和錯誤訊息 */
  failedResults: { index: number; error: string }[];
  /** 總成功數量 */
  successCount: number;
  /** 總失敗數量 */
  failedCount: number;
}

/**
 * 多張圖片上傳結果的 Zod schema
 */
export const MultipleImageUploadResultSchema = z.object({
  successResults: z.array(ImageUploadResultSchema),
  failedResults: z.array(
    z.object({
      index: z.number(),
      error: z.string(),
    })
  ),
  successCount: z.number().nonnegative(),
  failedCount: z.number().nonnegative(),
});

/**
 * 預設壓縮選項常數
 */
export const DEFAULT_COMPRESSION_OPTIONS = {
  /** 單張貼紙圖片的預設壓縮選項（對應 Flutter uploadImage） */
  STICKER: {
    maxWidth: 1024,
    maxHeight: 1024,
    skipThreshold: 100 * 1024, // 100KB
    quality: 0.8,
    preserveExif: false,
  } as CompressionOptions,

  /** 多張原始圖片的預設壓縮選項（對應 Flutter _uploadImages） */
  ORIGINAL: {
    maxWidth: 512,
    maxHeight: 512,
    skipThreshold: 100 * 1024, // 100KB
    quality: 0.8,
    preserveExif: false,
  } as CompressionOptions,
} as const;

/**
 * 支援的圖片格式列表
 */
export const SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/**
 * 支援的圖片格式類型
 */
export type SupportedImageFormat = (typeof SUPPORTED_IMAGE_FORMATS)[number];

/**
 * 圖片處理錯誤類型
 */
export enum ImageProcessingError {
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  COMPRESSION_FAILED = "COMPRESSION_FAILED",
  UPLOAD_FAILED = "UPLOAD_FAILED",
  INVALID_DATA = "INVALID_DATA",
}

/**
 * 圖片處理錯誤的 Zod schema
 */
export const ImageProcessingErrorSchema = z.nativeEnum(ImageProcessingError);
