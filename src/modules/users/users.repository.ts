import { BaseRepository, IFirestoreService, Injectable } from "../../shared";
import { QueryConfig } from "../../shared/types/firestore.types";
import { AppUser, firestoreTimestampToDate } from "./types/user.types";

/**
 * User Repository 介面 - 定義使用者資料存取操作
 */
export interface IUserRepository {
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
   * @param userData 要更新的使用者資料
   */
  updateUser(uid: string, userData: Partial<AppUser>): Promise<void>;

  /**
   * 刪除使用者
   * @param uid 使用者 UID
   */
  deleteUser(uid: string): Promise<void>;

  /**
   * 取得多個使用者
   * @param queryConfig 查詢配置
   * @returns AppUser 陣列
   */
  getUsers(queryConfig?: QueryConfig): Promise<AppUser[]>;
}

/**
 * Firestore User Repository 實作
 * 繼承 BaseRepository 減少重複程式碼
 */
@Injectable()
export class UserRepository
  extends BaseRepository<AppUser>
  implements IUserRepository
{
  constructor(firestoreService: IFirestoreService) {
    super(firestoreService, "users");
  }

  /**
   * 實作 BaseRepository 抽象方法：從 Firestore 資料轉換為 AppUser
   */
  fromFirestore(data: any, id?: string): AppUser {
    return {
      uid: id || data.uid,
      email: data.email || "",
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      gender: data.gender || null,
      age: data.age || null,
      height: data.height || null,
      initWeight: data.initWeight || null,
      targetWeight: data.targetWeight || null,
      goal: data.goal || null,

      // 偏好單位
      preferHeightUnit: data.preferHeightUnit || null,
      preferWeightUnit: data.preferWeightUnit || null,
      activityLevel: data.activityLevel || null,
      weightSpeedPerWeek: data.weightSpeedPerWeek || null,
      targetCalories: data.targetCalories || null,
      targetProtein: data.targetProtein || null,
      targetFat: data.targetFat || null,
      targetCarb: data.targetCarb || null,
      bmr: data.bmr || null,
      tdee: data.tdee || null,
      isRecipePublic: data.isRecipePublic ?? true,
      autoCalories: data.autoCalories || null,

      // 時間戳
      createdAt: firestoreTimestampToDate(data.createdAt),
      updatedAt: firestoreTimestampToDate(data.updatedAt),
      lastLoginAt: data.lastLoginAt
        ? firestoreTimestampToDate(data.lastLoginAt)
        : undefined,
      lastSyncAt: data.lastSyncAt
        ? firestoreTimestampToDate(data.lastSyncAt)
        : undefined,

      // 同步設備管理欄位
      primarySyncDevice: data.primarySyncDevice || null,
      primarySyncPlatform: data.primarySyncPlatform || null,
      lastSyncPlatform: data.lastSyncPlatform || null,
      syncDeviceSwitchedAt: data.syncDeviceSwitchedAt
        ? firestoreTimestampToDate(data.syncDeviceSwitchedAt)
        : undefined,
      deviceLanguage: data.deviceLanguage || null,

      // RevenueCat 整合屬性
      entitlements: data.entitlements || null,
      subscriptions: data.subscriptions || null,
      activeSubscriptions: data.activeSubscriptions || null,
      allPurchasedProductIds: data.allPurchasedProductIds || null,
      managementUrl: data.managementUrl || null,
      originalAppUserId: data.originalAppUserId || null,
      revenueCatFirstSeen: data.revenueCatFirstSeen
        ? firestoreTimestampToDate(data.revenueCatFirstSeen)
        : undefined,
      revenueCatLastSeen: data.revenueCatLastSeen
        ? firestoreTimestampToDate(data.revenueCatLastSeen)
        : undefined,
      revenueCatOriginalPurchaseDate: data.revenueCatOriginalPurchaseDate
        ? firestoreTimestampToDate(data.revenueCatOriginalPurchaseDate)
        : undefined,
      revenueCatRequestDate: data.revenueCatRequestDate
        ? firestoreTimestampToDate(data.revenueCatRequestDate)
        : undefined,
    };
  }

  /**
   * 實作 BaseRepository 抽象方法：將 AppUser 轉換為 Firestore 資料
   */
  toFirestore(user: AppUser): any {
    const now = new Date();

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      gender: user.gender,
      age: user.age,
      height: user.height,
      initWeight: user.initWeight,
      targetWeight: user.targetWeight,
      goal: user.goal,

      // 偏好單位
      preferHeightUnit: user.preferHeightUnit,
      preferWeightUnit: user.preferWeightUnit,
      activityLevel: user.activityLevel,
      weightSpeedPerWeek: user.weightSpeedPerWeek,
      targetCalories: user.targetCalories,
      targetProtein: user.targetProtein,
      targetFat: user.targetFat,
      targetCarb: user.targetCarb,
      bmr: user.bmr,
      tdee: user.tdee,
      isRecipePublic: user.isRecipePublic,
      autoCalories: user.autoCalories,

      // 時間戳
      createdAt: user.createdAt || now,
      updatedAt: now,
      lastLoginAt: user.lastLoginAt,
      lastSyncAt: user.lastSyncAt,

      // 同步設備管理欄位
      primarySyncDevice: user.primarySyncDevice,
      primarySyncPlatform: user.primarySyncPlatform,
      lastSyncPlatform: user.lastSyncPlatform,
      syncDeviceSwitchedAt: user.syncDeviceSwitchedAt,
      deviceLanguage: user.deviceLanguage,

      // RevenueCat 整合屬性
      entitlements: user.entitlements,
      subscriptions: user.subscriptions,
      activeSubscriptions: user.activeSubscriptions,
      allPurchasedProductIds: user.allPurchasedProductIds,
      managementUrl: user.managementUrl,
      originalAppUserId: user.originalAppUserId,
      revenueCatFirstSeen: user.revenueCatFirstSeen,
      revenueCatLastSeen: user.revenueCatLastSeen,
      revenueCatOriginalPurchaseDate: user.revenueCatOriginalPurchaseDate,
      revenueCatRequestDate: user.revenueCatRequestDate,
    };
  }

  /**
   * 檢查使用者是否存在
   */
  async checkUserExists(uid: string): Promise<boolean> {
    try {
      return await this.exists(uid);
    } catch (error) {
      console.error("Repository: 檢查使用者是否存在時發生錯誤:", error);
      throw new Error("無法檢查使用者是否存在");
    }
  }

  /**
   * 獲取使用者資料
   */
  async getUser(uid: string): Promise<AppUser | null> {
    try {
      return await this.get(uid);
    } catch (error) {
      console.error("Repository: 獲取使用者資料時發生錯誤:", error);
      throw new Error("無法獲取使用者資料");
    }
  }

  /**
   * 建立新使用者
   */
  async createUser(user: AppUser): Promise<void> {
    try {
      await this.create(user.uid, user);
    } catch (error) {
      console.error("Repository: 建立使用者時發生錯誤:", error);
      throw new Error("無法建立使用者");
    }
  }

  /**
   * 更新使用者資料
   */
  async updateUser(uid: string, userData: Partial<AppUser>): Promise<void> {
    try {
      // 設定更新時間
      const updateData = {
        ...userData,
        updatedAt: new Date(),
      };
      console.log("Repository: 更新使用者資料", updateData);
      await this.update(uid, updateData);
    } catch (error) {
      console.error("Repository: 更新使用者資料時發生錯誤:", error);
      throw new Error("無法更新使用者資料");
    }
  }

  /**
   * 刪除使用者
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await this.delete(uid);
    } catch (error) {
      console.error("Repository: 刪除使用者時發生錯誤:", error);
      throw new Error("無法刪除使用者");
    }
  }

  /**
   * 取得多個使用者
   */
  async getUsers(queryConfig?: QueryConfig): Promise<AppUser[]> {
    try {
      if (queryConfig) {
        return await this.query(queryConfig);
      } else {
        return await this.getAll();
      }
    } catch (error) {
      console.error("Repository: 取得使用者列表時發生錯誤:", error);
      throw new Error("無法取得使用者列表");
    }
  }
}
