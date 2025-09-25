import { IUserRepository } from "../repositories/userRepository";
import { AppUser } from "../types/user";

/**
 * User Service 介面 - 定義使用者業務邏輯操作
 */
export interface IUserService {
  /**
   * 檢查使用者是否存在
   * @param uid 使用者 UID
   * @returns 使用者是否存在
   */
  checkUserExists(uid: string): Promise<boolean>;

  /**
   * 獲取使用者資料
   * @param uid 使用者 UID
   * @returns AppUser 物件或 null
   */
  getUser(uid: string): Promise<AppUser | null>;

  /**
   * 建立新使用者
   * @param user 使用者資料
   */
  createUser(user: AppUser): Promise<void>;

  /**
   * 更新使用者資料
   * @param uid 使用者 UID
   * @param data 要更新的資料
   */
  updateUser(uid: string, data: Partial<AppUser>): Promise<void>;
}

/**
 * User Service - 使用者業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository) {}

  /**
   * 檢查使用者是否存在
   * 業務邏輯：
   * - 驗證 UID 格式
   * - 委派給 Repository 執行資料查詢
   * 
   * 對應 Flutter: checkUserExists(String uid)
   *
   * @param uid 使用者 UID
   * @returns 使用者是否存在
   */
  async checkUserExists(uid: string): Promise<boolean> {
    // 業務邏輯驗證
    if (!uid || uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      return await this.userRepository.exists(uid);
    } catch (error) {
      console.error("Service: 檢查使用者是否存在時發生業務邏輯錯誤:", error);
      throw new Error("檢查使用者是否存在失敗");
    }
  }

  /**
   * 獲取使用者資料
   * 業務邏輯：
   * - 驗證 UID 格式
   * - 委派給 Repository 執行資料查詢
   * 
   * 對應 Flutter: getUser({String? userId})
   *
   * @param uid 使用者 UID
   * @returns AppUser 物件或 null
   */
  async getUser(uid: string): Promise<AppUser | null> {
    // 業務邏輯驗證
    if (!uid || uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    try {
      // 委派給 Repository 執行資料查詢
      return await this.userRepository.findById(uid);
    } catch (error) {
      console.error("Service: 取得使用者資料時發生業務邏輯錯誤:", error);
      throw new Error("取得使用者資料失敗");
    }
  }

  /**
   * 建立新使用者
   * 業務邏輯：
   * - 驗證必要欄位
   * - 檢查使用者是否已存在
   * - 套用預設值和業務規則
   * 
   * 對應 Flutter: createUser(AppUser user)
   *
   * @param user 使用者資料
   */
  async createUser(user: AppUser): Promise<void> {
    // 業務邏輯驗證
    if (!user.uid || user.uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    if (!user.email || user.email.trim() === "") {
      throw new Error("使用者 email 不能為空");
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new Error("無效的 email 格式");
    }

    try {
      // 檢查使用者是否已存在
      const exists = await this.userRepository.exists(user.uid);
      if (exists) {
        throw new Error("使用者已存在");
      }

      // 套用業務規則和預設值
      const processedUser = this.applyCreateUserBusinessRules(user);

      // 委派給 Repository 執行資料建立
      await this.userRepository.create(processedUser);
    } catch (error) {
      console.error("Service: 建立使用者時發生業務邏輯錯誤:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("建立使用者失敗");
    }
  }

  /**
   * 更新使用者資料
   * 業務邏輯：
   * - 驗證更新權限
   * - 檢查使用者是否存在
   * - 套用業務規則
   * - 確保資料一致性
   * 
   * 對應 Flutter: updateUser(Map<String, dynamic> data)
   *
   * @param uid 使用者 UID
   * @param data 要更新的資料
   */
  async updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
    // 業務邏輯驗證
    if (!uid || uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error("更新資料不能為空");
    }

    try {
      // 檢查使用者是否存在
      const existingUser = await this.userRepository.findById(uid);
      if (!existingUser) {
        throw new Error("找不到要更新的使用者");
      }

      // 套用更新業務規則
      const processedUpdates = this.applyUpdateUserBusinessRules(data, existingUser);

      // 委派給 Repository 執行資料更新
      await this.userRepository.update(uid, processedUpdates);
    } catch (error) {
      console.error("Service: 更新使用者資料時發生業務邏輯錯誤:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("更新使用者資料失敗");
    }
  }

  /**
   * 套用建立使用者的業務規則
   * @param user 原始使用者資料
   * @returns 處理後的使用者資料
   */
  private applyCreateUserBusinessRules(user: AppUser): AppUser {
    return {
      ...user,
      // 套用預設值
      isRecipePublic: user.isRecipePublic ?? true,
      
      // 清理字串欄位
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName?.trim(),
      gender: user.gender?.trim(),
      deviceLanguage: user.deviceLanguage?.trim(),
      
      // 確保數值欄位的有效性
      age: user.age && user.age > 0 ? user.age : undefined,
      height: user.height && user.height > 0 ? user.height : undefined,
      initWeight: user.initWeight && user.initWeight > 0 ? user.initWeight : undefined,
      targetWeight: user.targetWeight && user.targetWeight > 0 ? user.targetWeight : undefined,
      weightSpeedPerWeek: user.weightSpeedPerWeek && user.weightSpeedPerWeek > 0 ? user.weightSpeedPerWeek : undefined,
      targetCalories: user.targetCalories && user.targetCalories > 0 ? user.targetCalories : undefined,
      targetProtein: user.targetProtein && user.targetProtein > 0 ? user.targetProtein : undefined,
      targetFat: user.targetFat && user.targetFat > 0 ? user.targetFat : undefined,
      targetCarb: user.targetCarb && user.targetCarb > 0 ? user.targetCarb : undefined,
      bmr: user.bmr && user.bmr > 0 ? user.bmr : undefined,
      tdee: user.tdee && user.tdee > 0 ? user.tdee : undefined,
    };
  }

  /**
   * 套用更新使用者的業務規則
   * @param updates 更新資料
   * @param existingUser 現有使用者資料
   * @returns 處理後的更新資料
   */
  private applyUpdateUserBusinessRules(
    updates: Partial<AppUser>,
    _existingUser: AppUser
  ): Partial<AppUser> {
    const processedUpdates = { ...updates };

    // 不允許更新某些欄位
    delete (processedUpdates as any).uid;
    delete (processedUpdates as any).createdAt;

    // 清理字串欄位（如果有更新）
    if (processedUpdates.email) {
      processedUpdates.email = processedUpdates.email.trim().toLowerCase();
      
      // 驗證 email 格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(processedUpdates.email)) {
        throw new Error("無效的 email 格式");
      }
    }

    if (processedUpdates.displayName !== undefined) {
      processedUpdates.displayName = processedUpdates.displayName?.trim();
    }

    if (processedUpdates.gender !== undefined) {
      processedUpdates.gender = processedUpdates.gender?.trim();
    }

    if (processedUpdates.deviceLanguage !== undefined) {
      processedUpdates.deviceLanguage = processedUpdates.deviceLanguage?.trim();
    }

    // 驗證數值欄位的有效性
    if (processedUpdates.age !== undefined && processedUpdates.age !== null && processedUpdates.age <= 0) {
      throw new Error("年齡必須是正數");
    }

    if (processedUpdates.height !== undefined && processedUpdates.height !== null && processedUpdates.height <= 0) {
      throw new Error("身高必須是正數");
    }

    if (processedUpdates.initWeight !== undefined && processedUpdates.initWeight !== null && processedUpdates.initWeight <= 0) {
      throw new Error("初始體重必須是正數");
    }

    if (processedUpdates.targetWeight !== undefined && processedUpdates.targetWeight !== null && processedUpdates.targetWeight <= 0) {
      throw new Error("目標體重必須是正數");
    }

    if (processedUpdates.weightSpeedPerWeek !== undefined && processedUpdates.weightSpeedPerWeek !== null && processedUpdates.weightSpeedPerWeek <= 0) {
      throw new Error("每週減重速度必須是正數");
    }

    if (processedUpdates.targetCalories !== undefined && processedUpdates.targetCalories !== null && processedUpdates.targetCalories <= 0) {
      throw new Error("目標卡路里必須是正數");
    }

    if (processedUpdates.targetProtein !== undefined && processedUpdates.targetProtein !== null && processedUpdates.targetProtein <= 0) {
      throw new Error("目標蛋白質必須是正數");
    }

    if (processedUpdates.targetFat !== undefined && processedUpdates.targetFat !== null && processedUpdates.targetFat <= 0) {
      throw new Error("目標脂肪必須是正數");
    }

    if (processedUpdates.targetCarb !== undefined && processedUpdates.targetCarb !== null && processedUpdates.targetCarb <= 0) {
      throw new Error("目標碳水化合物必須是正數");
    }

    if (processedUpdates.bmr !== undefined && processedUpdates.bmr !== null && processedUpdates.bmr <= 0) {
      throw new Error("基礎代謝率必須是正數");
    }

    if (processedUpdates.tdee !== undefined && processedUpdates.tdee !== null && processedUpdates.tdee <= 0) {
      throw new Error("總日常能量消耗必須是正數");
    }

    return processedUpdates;
  }
}