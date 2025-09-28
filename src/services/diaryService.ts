import { IDiaryService } from "../controllers/diaryController";
import { IDiaryRepository } from "../repositories/diaryRepository";
import { Diary, TaskStatus } from "../types/diary";
import {
  CreateDiaryWithImagesRequest,
  DEFAULT_COMPRESSION_OPTIONS,
} from "../types/image";
import { IImageCompressionService } from "./imageCompressionService";
import { IStorageService } from "./storageService";

/**
 * Diary Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
export class DiaryService implements IDiaryService {
  constructor(
    private diaryRepository: IDiaryRepository,
    private imageCompressionService?: IImageCompressionService,
    private storageService?: IStorageService
  ) {}

  /**
   * 取得 diary 列表，支援可選的日期過濾
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則
   * - 委派給 Repository 執行資料查詢
   *
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns Diary 陣列
   */
  async getDiaries(userId: string, date?: Date): Promise<Diary[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    // 日期驗證（如果提供）
    if (date && isNaN(date.getTime())) {
      throw new Error("提供的日期格式無效");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const diaries = await this.diaryRepository.findByUser(userId, date);

      // 業務邏輯處理（例如：排序、過濾、資料轉換等）
      return this.applyBusinessRules(diaries);
    } catch (error) {
      console.error("Service: 取得 diary 列表時發生業務邏輯錯誤:", error);
      throw new Error("取得 diary 列表失敗");
    }
  }

  /**
   * 取得單一 diary
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能存取自己的 diary
   *
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @returns Diary 物件或 null
   */
  async getDiary(userId: string, diaryId: string): Promise<Diary | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!diaryId || diaryId.trim() === "") {
      throw new Error("Diary ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const diary = await this.diaryRepository.findById(userId, diaryId);

      // 額外的業務邏輯檢查
      if (diary && diary.userId !== userId) {
        // 安全檢查：確保使用者只能存取自己的 diary
        console.warn(`使用者 ${userId} 嘗試存取不屬於他的 diary ${diaryId}`);
        return null;
      }

      return diary;
    } catch (error) {
      console.error("Service: 取得 diary 時發生業務邏輯錯誤:", error);
      throw new Error("取得 diary 失敗");
    }
  }

  /**
   * 建立新的 diary
   * 業務邏輯：
   * - 驗證必要欄位
   * - 套用預設值
   * - 執行業務規則驗證
   *
   * @param userId 使用者 ID
   * @param diaryData Diary 資料
   * @returns 建立的 Diary 物件
   */
  async createDiary(userId: string, diaryData: Partial<Diary>): Promise<Diary> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!diaryData.name || diaryData.name.trim() === "") {
      throw new Error("Diary 名稱不能為空");
    }

    // 套用業務規則和預設值
    const processedDiaryData = this.applyCreateBusinessRules(diaryData);

    try {
      // 委派給 Repository 執行資料建立
      const createdDiary = await this.diaryRepository.create(
        userId,
        processedDiaryData
      );

      return createdDiary;
    } catch (error) {
      console.error("Service: 建立 diary 時發生業務邏輯錯誤:", error);
      throw new Error("建立 diary 失敗");
    }
  }

  /**
   * 更新現有 diary
   * 業務邏輯：
   * - 驗證更新權限
   * - 套用業務規則
   * - 確保資料一致性
   *
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @param updates 更新資料
   * @returns 更新後的 Diary 物件
   */
  async updateDiary(
    userId: string,
    diaryId: string,
    updates: Partial<Diary>
  ): Promise<Diary> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!diaryId || diaryId.trim() === "") {
      throw new Error("Diary ID 不能為空");
    }

    // 檢查 diary 是否存在且屬於該使用者
    const existingDiary = await this.getDiary(userId, diaryId);
    if (!existingDiary) {
      throw new Error("找不到要更新的 Diary 或您沒有權限更新");
    }

    // 套用更新業務規則
    const processedUpdates = this.applyUpdateBusinessRules(
      updates,
      existingDiary
    );

    // 處理圖片更新（如果 stickerImg 是圖片資料）
    if (
      processedUpdates.stickerImg &&
      this.isImageData(processedUpdates.stickerImg)
    ) {
      if (!this.imageCompressionService || !this.storageService) {
        throw new Error("圖片處理服務未初始化，無法處理圖片更新");
      }

      try {
        // 處理貼紙圖片：壓縮並上傳
        processedUpdates.stickerImg = await this.processSingleImage(
          userId,
          processedUpdates.stickerImg,
          "sticker"
        );
      } catch (error) {
        console.error("更新 stickerImg 時發生錯誤:", error);
        throw new Error(`圖片上傳失敗: ${error}`);
      }
    }

    try {
      // 委派給 Repository 執行資料更新
      const updatedDiary = await this.diaryRepository.update(
        userId,
        diaryId,
        processedUpdates
      );

      return updatedDiary;
    } catch (error) {
      console.error("Service: 更新 diary 時發生業務邏輯錯誤:", error);
      throw new Error("更新 diary 失敗");
    }
  }

  /**
   * 刪除 diary（軟刪除）
   * 業務邏輯：
   * - 驗證刪除權限
   * - 確保使用者只能刪除自己的 diary
   *
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   */
  async deleteDiary(userId: string, diaryId: string): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!diaryId || diaryId.trim() === "") {
      throw new Error("Diary ID 不能為空");
    }

    // 檢查 diary 是否存在且屬於該使用者
    const existingDiary = await this.getDiary(userId, diaryId);
    if (!existingDiary) {
      throw new Error("找不到要刪除的 Diary 或您沒有權限刪除");
    }

    try {
      // 委派給 Repository 執行軟刪除
      await this.diaryRepository.softDelete(userId, diaryId);
    } catch (error) {
      console.error("Service: 刪除 diary 時發生業務邏輯錯誤:", error);
      throw new Error("刪除 diary 失敗");
    }
  }

  /**
   * 計算連續天數
   * 業務邏輯：
   * - 套用連續天數計算規則
   * - 處理複雜的業務邏輯
   *
   * @param userId 使用者 ID
   * @returns 連續天數
   */
  async calculateStreak(userId: string): Promise<number> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const streak = await this.diaryRepository.calculateStreak(userId);

      // 套用業務規則（例如：最大連續天數限制等）
      return this.applyStreakBusinessRules(streak);
    } catch (error) {
      console.error("Service: 計算連續天數時發生業務邏輯錯誤:", error);
      throw new Error("計算連續天數失敗");
    }
  }

  /**
   * 套用取得 diary 列表的業務規則
   * @param diaries 原始 diary 列表
   * @returns 處理後的 diary 列表
   */
  private applyBusinessRules(diaries: Diary[]): Diary[] {
    // 例如：過濾、排序、資料轉換等業務邏輯
    return diaries.filter((diary) => {
      // 確保只返回有效的 diary
      return diary.name && diary.name.trim() !== "";
    });
  }

  /**
   * 套用建立 diary 的業務規則
   * @param diaryData 原始 diary 資料
   * @returns 處理後的 diary 資料
   */
  private applyCreateBusinessRules(diaryData: Partial<Diary>): Partial<Diary> {
    return {
      ...diaryData,
      // 套用預設值
      calories: diaryData.calories || 0,
      protein: diaryData.protein || 0,
      carbs: diaryData.carbs || 0,
      fat: diaryData.fat || 0,
      portions: diaryData.portions || 1,
      status: diaryData.status || TaskStatus.DONE,
      progress: diaryData.progress || 0,
      // 確保必要欄位存在
      diaryDate: diaryData.diaryDate || new Date(),
      // 清理名稱
      name: diaryData.name?.trim(),
    };
  }

  /**
   * 套用更新 diary 的業務規則
   * @param updates 更新資料
   * @param existingDiary 現有 diary
   * @returns 處理後的更新資料
   */
  private applyUpdateBusinessRules(
    updates: Partial<Diary>,
    _existingDiary: Diary
  ): Partial<Diary> {
    const processedUpdates = { ...updates };

    // 不允許更新某些欄位
    delete (processedUpdates as any).id;
    delete (processedUpdates as any).userId;
    delete (processedUpdates as any).createdAt;

    // 清理名稱（如果有更新）
    if (processedUpdates.name) {
      processedUpdates.name = processedUpdates.name.trim();
      if (processedUpdates.name === "") {
        throw new Error("Diary 名稱不能為空");
      }
    }

    return processedUpdates;
  }

  /**
   * 套用連續天數的業務規則
   * @param streak 原始連續天數
   * @returns 處理後的連續天數
   */
  private applyStreakBusinessRules(streak: number): number {
    // 例如：最大連續天數限制
    const MAX_STREAK = 9999;
    return Math.min(streak, MAX_STREAK);
  }

  /**
   * 檢測字串是否為圖片資料
   * @param data 要檢測的字串
   * @returns 如果是圖片資料則返回 true
   */
  private isImageData(data: string): boolean {
    // 檢查是否為 DataURL 格式
    if (data.startsWith("data:image/")) {
      return true;
    }

    // 檢查是否為 Base64（長度通常 > 1000 且不是 HTTP URL）
    if (data.length > 1000 && !data.startsWith("http")) {
      return true;
    }

    return false;
  }

  /**
   * 建立包含圖片的新 diary
   * 對應 Flutter addDiaryWithImage 方法的完整邏輯：
   * 1. 壓縮圖片
   * 2. 上傳到 Firebase Storage
   * 3. 取得圖片 URL
   * 4. 建立 Diary 記錄
   *
   * @param userId 使用者 ID
   * @param request 包含圖片的 Diary 建立請求
   * @returns 建立的 Diary 物件
   */
  async createDiaryWithImages(
    userId: string,
    request: CreateDiaryWithImagesRequest
  ): Promise<Diary> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!request.diaryData.name || request.diaryData.name.trim() === "") {
      throw new Error("Diary 名稱不能為空");
    }

    // 檢查圖片處理服務是否可用
    if (
      (request.originalImgs || request.stickerImg) &&
      (!this.imageCompressionService || !this.storageService)
    ) {
      throw new Error("圖片處理服務未初始化，無法處理包含圖片的請求");
    }

    try {
      let originalImgs: string[] = [];
      let stickerImg: string | undefined;

      // 處理原始圖片（如果有）
      if (
        request.originalImgs &&
        request.originalImgs.length > 0 &&
        this.imageCompressionService &&
        this.storageService
      ) {
        originalImgs = await this.processMultipleImages(
          userId,
          request.originalImgs,
          "original"
        );
      }

      // 處理貼紙圖片（如果有）
      if (
        request.stickerImg &&
        this.imageCompressionService &&
        this.storageService
      ) {
        stickerImg = await this.processSingleImage(
          userId,
          request.stickerImg,
          "sticker"
        );
      }

      // 建立包含圖片 URL 的 Diary 資料
      const diaryDataWithImages = {
        ...request.diaryData,
        originalImgs,
        stickerImg,
      };

      // 套用業務規則並建立 Diary
      const processedDiaryData =
        this.applyCreateBusinessRules(diaryDataWithImages);
      // console.log("processedDiaryData", processedDiaryData);
      const createdDiary = await this.diaryRepository.create(
        userId,
        processedDiaryData
      );

      // TODO: 如果 saveToFoodDB 為 true，則需要實作儲存到食物資料庫的邏輯
      if (request.saveToFoodDB) {
        console.log("TODO: 儲存到食物資料庫功能尚未實作");
      }

      return createdDiary;
    } catch (error) {
      console.error("Service: 建立包含圖片的 diary 時發生錯誤:", error);
      throw new Error(`建立包含圖片的 diary 失敗: ${error}`);
    }
  }

  /**
   * 處理單張圖片：壓縮 + 上傳
   * 對應 Flutter uploadImage 方法的邏輯
   */
  private async processSingleImage(
    userId: string,
    imageData: string | Uint8Array,
    imageType: "sticker" | "original"
  ): Promise<string> {
    if (!this.imageCompressionService || !this.storageService) {
      throw new Error("圖片處理服務未初始化");
    }

    try {
      // 取得對應的壓縮選項
      const compressionOptions =
        imageType === "sticker"
          ? DEFAULT_COMPRESSION_OPTIONS.STICKER
          : DEFAULT_COMPRESSION_OPTIONS.ORIGINAL;

      // 壓縮圖片
      let compressedData: Uint8Array;
      if (typeof imageData === "string") {
        compressedData =
          await this.imageCompressionService.compressImageFromDataURL(
            imageData,
            compressionOptions
          );
      } else {
        compressedData = await this.imageCompressionService.compressImageBytes(
          imageData,
          compressionOptions
        );
      }

      // 上傳到 Storage
      const uploadResult = await this.storageService.uploadSingleImage(
        userId,
        compressedData
      );

      console.log(`${imageType} 圖片處理完成: ${uploadResult.url}`);
      return uploadResult.url;
    } catch (error) {
      console.error(`處理 ${imageType} 圖片失敗:`, error);
      throw new Error(`圖片處理失敗: ${error}`);
    }
  }

  /**
   * 處理多張圖片：壓縮 + 上傳
   * 對應 Flutter _uploadImages 方法的邏輯
   */
  private async processMultipleImages(
    userId: string,
    imagesData: (string | Uint8Array)[],
    imageType: "sticker" | "original"
  ): Promise<string[]> {
    if (!this.imageCompressionService || !this.storageService) {
      throw new Error("圖片處理服務未初始化");
    }

    try {
      // 取得對應的壓縮選項
      const compressionOptions =
        imageType === "sticker"
          ? DEFAULT_COMPRESSION_OPTIONS.STICKER
          : DEFAULT_COMPRESSION_OPTIONS.ORIGINAL;

      // 壓縮所有圖片
      const compressedImagesData: Uint8Array[] = [];
      for (const imageData of imagesData) {
        let compressedData: Uint8Array;
        if (typeof imageData === "string") {
          compressedData =
            await this.imageCompressionService.compressImageFromDataURL(
              imageData,
              compressionOptions
            );
        } else {
          compressedData =
            await this.imageCompressionService.compressImageBytes(
              imageData,
              compressionOptions
            );
        }
        compressedImagesData.push(compressedData);
      }

      // 上傳所有圖片
      const uploadResult = await this.storageService.uploadMultipleImages(
        userId,
        compressedImagesData
      );

      // 檢查是否有失敗的上傳
      if (uploadResult.failedCount > 0) {
        console.warn(
          `${uploadResult.failedCount} 張圖片上傳失敗`,
          uploadResult.failedResults
        );
      }

      // 返回成功上傳的圖片 URL
      const urls = uploadResult.successResults.map((result) => result.url);
      console.log(`${imageType} 多張圖片處理完成: ${urls.length} 張成功`);

      return urls;
    } catch (error) {
      console.error(`處理多張 ${imageType} 圖片失敗:`, error);
      throw new Error(`多張圖片處理失敗: ${error}`);
    }
  }
}
