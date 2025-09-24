import { IWeightRepository } from "../repositories/weightRepository";
import { WeightEntry } from "../types/weight";

/**
 * Weight Service 介面 - 定義業務邏輯操作
 */
export interface IWeightService {
  /**
   * 新增體重記錄
   * @param userId 使用者 ID
   * @param weightData 體重記錄資料
   */
  addWeight(userId: string, weightData: Partial<WeightEntry>): Promise<void>;

  /**
   * 取得體重記錄列表
   * @param userId 使用者 ID
   * @param startDate 可選的開始日期過濾條件
   * @returns WeightEntry 陣列
   */
  getWeight(userId: string, startDate?: Date): Promise<WeightEntry[]>;

  /**
   * 取得最新的體重記錄
   * @param userId 使用者 ID
   * @returns 最新的 WeightEntry 或 null
   */
  getLatestWeight(userId: string): Promise<WeightEntry | null>;
}

/**
 * Weight Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
export class WeightService implements IWeightService {
  constructor(private weightRepository: IWeightRepository) {}

  /**
   * 新增體重記錄
   * 業務邏輯：
   * - 驗證必要欄位
   * - 生成 dateId（如果未提供）
   * - 設定預設值
   * - 執行業務規則驗證
   *
   * @param userId 使用者 ID
   * @param weightData 體重記錄資料
   */
  async addWeight(userId: string, weightData: Partial<WeightEntry>): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!weightData.weight || weightData.weight <= 0) {
      throw new Error("體重必須為正數");
    }

    if (!weightData.unit || weightData.unit.trim() === "") {
      throw new Error("體重單位不能為空");
    }

    // 設定預設值
    const now = new Date();
    const entry: WeightEntry = {
      dateId: weightData.dateId || this.formatDateToId(now),
      weight: weightData.weight,
      unit: weightData.unit.trim(),
      source: weightData.source || "manual",
      createdAt: weightData.createdAt || now,
    };

    // 驗證 dateId 格式
    if (!this.isValidDateId(entry.dateId)) {
      throw new Error("dateId 格式必須為 YYYY-MM-DD");
    }

    // 驗證日期合理性 - 不能是未來日期
    const entryDate = new Date(entry.dateId);
    if (entryDate > new Date()) {
      throw new Error("體重記錄日期不能是未來日期");
    }

    // 驗證體重值的合理範圍（業務規則）
    if (entry.weight < 1 || entry.weight > 1000) {
      throw new Error("體重值超出合理範圍 (1-1000)");
    }

    try {
      // 委派給 Repository 執行資料操作
      await this.weightRepository.addWeight(userId, entry);
    } catch (error) {
      console.error("Service: 新增體重記錄時發生業務邏輯錯誤:", error);
      throw new Error("新增體重記錄失敗");
    }
  }

  /**
   * 取得體重記錄列表
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則
   * - 委派給 Repository 執行資料查詢
   *
   * @param userId 使用者 ID
   * @param startDate 可選的開始日期過濾條件
   * @returns WeightEntry 陣列
   */
  async getWeight(userId: string, startDate?: Date): Promise<WeightEntry[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    // 日期驗證（如果提供）
    if (startDate && isNaN(startDate.getTime())) {
      throw new Error("提供的開始日期格式無效");
    }

    // 業務規則：開始日期不能是未來日期
    if (startDate && startDate > new Date()) {
      throw new Error("開始日期不能是未來日期");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const weights = await this.weightRepository.getWeight(userId, startDate);

      // 套用業務規則（例如：資料清理、排序等）
      return this.applyBusinessRules(weights);
    } catch (error) {
      console.error("Service: 取得體重記錄列表時發生業務邏輯錯誤:", error);
      throw new Error("取得體重記錄列表失敗");
    }
  }

  /**
   * 取得最新的體重記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能存取自己的記錄
   *
   * @param userId 使用者 ID
   * @returns 最新的 WeightEntry 或 null
   */
  async getLatestWeight(userId: string): Promise<WeightEntry | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      const latestWeight = await this.weightRepository.getLatestWeight(userId);

      return latestWeight;
    } catch (error) {
      console.error("Service: 取得最新體重記錄時發生業務邏輯錯誤:", error);
      throw new Error("取得最新體重記錄失敗");
    }
  }

  /**
   * 套用業務規則到體重記錄列表
   * @param weights 體重記錄陣列
   * @returns 處理後的體重記錄陣列
   */
  private applyBusinessRules(weights: WeightEntry[]): WeightEntry[] {
    // 業務規則：過濾異常資料
    return weights.filter(weight => {
      // 確保體重值在合理範圍內
      if (weight.weight <= 0 || weight.weight > 1000) {
        console.warn(`過濾異常體重記錄: ${weight.dateId}, 體重: ${weight.weight}`);
        return false;
      }
      return true;
    });
  }

  /**
   * 將 Date 物件格式化為 dateId 字串 (YYYY-MM-DD)
   * @param date Date 物件
   * @returns dateId 字串
   */
  private formatDateToId(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 驗證 dateId 格式是否正確
   * @param dateId dateId 字串
   * @returns 是否為有效格式
   */
  private isValidDateId(dateId: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateId)) {
      return false;
    }

    // 進一步驗證日期是否真實存在
    const date = new Date(dateId);
    return date instanceof Date && !isNaN(date.getTime()) && 
           this.formatDateToId(date) === dateId;
  }
}