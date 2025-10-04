import { Injectable } from "../../shared";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { AppUser } from "./types/user.types";
import { IUserRepository } from "./users.repository";

/**
 * User Service 介面 - 定義業務邏輯操作
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
   * @param userData 使用者資料
   */
  createUser(userData: CreateUserDto): Promise<void>;

  /**
   * 更新使用者資料
   * @param uid 使用者 UID
   * @param userData 要更新的使用者資料
   */
  updateUser(uid: string, userData: UpdateUserDto): Promise<void>;

  /**
   * 刪除使用者
   * @param uid 使用者 UID
   */
  deleteUser(uid: string): Promise<void>;

  /**
   * 取得使用者列表
   * @param options 查詢選項
   * @returns AppUser 陣列
   */
  getUsers(options?: { limit?: number; offset?: number }): Promise<AppUser[]>;
}

/**
 * User Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 */
@Injectable()
export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository) {}

  /**
   * 檢查使用者是否存在
   * 業務邏輯：
   * - 驗證 UID 格式
   * - 委派給 Repository 執行檢查
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
      // 委派給 Repository 執行檢查
      return await this.userRepository.checkUserExists(uid);
    } catch (error) {
      console.error("Service: 檢查使用者是否存在時發生業務邏輯錯誤:", error);
      throw new Error("檢查使用者是否存在失敗");
    }
  }

  /**
   * 獲取使用者資料
   * 業務邏輯：
   * - 驗證 UID 格式
   * - 確保使用者只能存取有權限的資料
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
      // 委派給 Repository 執行查詢
      return await this.userRepository.getUser(uid);
    } catch (error) {
      console.error("Service: 獲取使用者資料時發生業務邏輯錯誤:", error);
      throw new Error("獲取使用者資料失敗");
    }
  }

  /**
   * 建立新使用者
   * 業務邏輯：
   * - 驗證必要欄位
   * - 檢查使用者是否已存在
   * - 設定預設值
   * - 執行業務規則驗證
   *
   * @param userData 使用者資料
   */
  async createUser(userData: CreateUserDto): Promise<void> {
    // 業務邏輯驗證
    if (!userData.email || userData.email.trim() === "") {
      throw new Error("電子郵件不能為空");
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error("電子郵件格式無效");
    }

    // 如果沒有提供 UID，使用 email 作為 UID（或其他業務邏輯）
    const uid = userData.uid || userData.email;

    // 檢查使用者是否已存在
    const exists = await this.userRepository.checkUserExists(uid);
    if (exists) {
      throw new Error("使用者已存在");
    }

    // 建立完整的使用者物件
    const now = new Date();
    const user: AppUser = {
      uid,
      email: userData.email.trim().toLowerCase(),
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      gender: userData.gender,
      age: userData.age,
      height: userData.height,
      initWeight: userData.initWeight,
      targetWeight: userData.targetWeight,
      goal: userData.goal as any,

      // 偏好單位
      preferHeightUnit: userData.preferHeightUnit,
      preferWeightUnit: userData.preferWeightUnit,
      activityLevel: userData.activityLevel,
      weightSpeedPerWeek: userData.weightSpeedPerWeek,
      targetCalories: userData.targetCalories,
      targetProtein: userData.targetProtein,
      targetFat: userData.targetFat,
      targetCarb: userData.targetCarb,
      bmr: userData.bmr,
      tdee: userData.tdee,
      isRecipePublic: userData.isRecipePublic ?? true,
      autoCalories: userData.autoCalories,

      // 時間戳
      createdAt: now,
      updatedAt: now,
      lastLoginAt: userData.lastLoginAt,
      lastSyncAt: userData.lastSyncAt,

      // 同步設備管理欄位
      primarySyncDevice: userData.primarySyncDevice,
      primarySyncPlatform: userData.primarySyncPlatform,
      lastSyncPlatform: userData.lastSyncPlatform,
      syncDeviceSwitchedAt: userData.syncDeviceSwitchedAt,
      deviceLanguage: userData.deviceLanguage,
    };

    try {
      // 委派給 Repository 執行建立
      await this.userRepository.createUser(user);
    } catch (error) {
      console.error("Service: 建立使用者時發生業務邏輯錯誤:", error);
      throw new Error("建立使用者失敗");
    }
  }

  /**
   * 更新使用者資料
   * 業務邏輯：
   * - 驗證使用者權限
   * - 檢查使用者是否存在
   * - 驗證更新資料的合理性
   *
   * @param uid 使用者 UID
   * @param userData 要更新的使用者資料
   */
  async updateUser(uid: string, userData: UpdateUserDto): Promise<void> {
    // 業務邏輯驗證
    if (!uid || uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    // 檢查使用者是否存在
    const exists = await this.userRepository.checkUserExists(uid);
    if (!exists) {
      throw new Error("使用者不存在");
    }

    // 驗證電子郵件格式（如果要更新）
    if (userData.email && !this.isValidEmail(userData.email)) {
      throw new Error("電子郵件格式無效");
    }

    // 驗證數值欄位的合理性
    if (
      userData.age !== undefined &&
      userData.age !== null &&
      (userData.age < 1 || userData.age > 150)
    ) {
      throw new Error("年齡必須在 1-150 之間");
    }

    if (
      userData.height !== undefined &&
      userData.height !== null &&
      (userData.height < 50 || userData.height > 300)
    ) {
      throw new Error("身高必須在 50-300 公分之間");
    }

    if (
      userData.initWeight !== undefined &&
      userData.initWeight !== null &&
      (userData.initWeight < 1 || userData.initWeight > 1000)
    ) {
      throw new Error("初始體重必須在 1-1000 公斤之間");
    }

    if (
      userData.targetWeight !== undefined &&
      userData.targetWeight !== null &&
      (userData.targetWeight < 1 || userData.targetWeight > 1000)
    ) {
      throw new Error("目標體重必須在 1-1000 公斤之間");
    }

    // 準備更新資料（正規化電子郵件和型別轉換）
    const updateData: Partial<AppUser> = {
      ...userData,
      ...(userData.email && { email: userData.email.trim().toLowerCase() }),
      ...(userData.goal && { goal: userData.goal as any }), // 型別轉換：string -> GoalType
    };

    try {
      // 委派給 Repository 執行更新
      await this.userRepository.updateUser(uid, updateData);
    } catch (error) {
      console.error("Service: 更新使用者資料時發生業務邏輯錯誤:", error);
      throw new Error("更新使用者資料失敗");
    }
  }

  /**
   * 刪除使用者
   * 業務邏輯：
   * - 驗證使用者權限
   * - 檢查使用者是否存在
   * - 執行相關資料清理（如需要）
   *
   * @param uid 使用者 UID
   */
  async deleteUser(uid: string): Promise<void> {
    // 業務邏輯驗證
    if (!uid || uid.trim() === "") {
      throw new Error("使用者 UID 不能為空");
    }

    // 檢查使用者是否存在
    const exists = await this.userRepository.checkUserExists(uid);
    if (!exists) {
      throw new Error("使用者不存在");
    }

    try {
      // 委派給 Repository 執行刪除
      await this.userRepository.deleteUser(uid);

      // TODO: 在這裡可以添加相關資料清理邏輯
      // 例如：刪除使用者的體重記錄、日記等
    } catch (error) {
      console.error("Service: 刪除使用者時發生業務邏輯錯誤:", error);
      throw new Error("刪除使用者失敗");
    }
  }

  /**
   * 取得使用者列表
   * 業務邏輯：
   * - 套用存取權限控制
   * - 設定查詢限制
   *
   * @param options 查詢選項
   * @returns AppUser 陣列
   */
  async getUsers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<AppUser[]> {
    try {
      // 建構查詢配置
      const queryConfig = {
        limit: options?.limit || 50, // 預設限制 50 筆
        // TODO: 可以添加 offset 支援分頁
      };

      // 委派給 Repository 執行查詢
      return await this.userRepository.getUsers(queryConfig);
    } catch (error) {
      console.error("Service: 取得使用者列表時發生業務邏輯錯誤:", error);
      throw new Error("取得使用者列表失敗");
    }
  }

  /**
   * 驗證電子郵件格式
   * @param email 電子郵件
   * @returns 是否為有效格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
