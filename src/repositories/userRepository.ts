import { FirestoreClient } from "firebase-rest-firestore";
import { AppUser, firestoreTimestampToDate } from "../types/user";

/**
 * User Repository 介面 - 定義使用者資料存取操作
 * 對應 Flutter UserRepository 的功能
 */
export interface IUserRepository {
  /**
   * 檢查使用者是否存在
   * 對應 Flutter: checkUserExists(String uid)
   * @param uid 使用者 UID
   * @returns 使用者是否存在
   */
  exists(uid: string): Promise<boolean>;

  /**
   * 根據 UID 查詢使用者資料
   * 對應 Flutter: getUser({String? userId})
   * @param uid 使用者 UID，如果未提供則使用當前用戶
   * @returns AppUser 物件或 null
   */
  findById(uid: string): Promise<AppUser | null>;

  /**
   * 建立新使用者
   * 對應 Flutter: createUser(AppUser user)
   * @param user 使用者資料
   */
  create(user: AppUser): Promise<void>;

  /**
   * 更新使用者資料
   * 對應 Flutter: updateUser(Map<String, dynamic> data)
   * @param uid 使用者 UID
   * @param data 要更新的資料
   */
  update(uid: string, data: Partial<AppUser>): Promise<void>;
}

/**
 * Firestore User Repository 實作
 * 對應 Flutter UserRepository 的 Firestore 操作
 */
export class FirestoreUserRepository implements IUserRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者 collection 參考
   * 對應 Flutter: usersRef.doc(uid)
   * @param uid 使用者 UID
   * @returns Document 參考
   */
  private getUserDocument(uid: string) {
    return this.firestore.collection("users").doc(uid);
  }

  /**
   * 將 Firestore 文件轉換為 AppUser 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 AppUser 物件
   */
  private convertFirestoreDocToAppUser(doc: any): AppUser {
    const data = doc.data();

    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      gender: data.gender,
      age: data.age,
      height: data.height,
      initWeight: data.initWeight,
      targetWeight: data.targetWeight,
      goal: data.goal,

      // 偏好單位
      preferHeightUnit: data.preferHeightUnit,
      preferWeightUnit: data.preferWeightUnit,
      activityLevel: data.activityLevel,
      weightSpeedPerWeek: data.weightSpeedPerWeek,
      targetCalories: data.targetCalories,
      targetProtein: data.targetProtein,
      targetFat: data.targetFat,
      targetCarb: data.targetCarb,
      bmr: data.bmr,
      tdee: data.tdee,
      isRecipePublic: data.isRecipePublic ?? true,

      createdAt: data.createdAt
        ? firestoreTimestampToDate(data.createdAt)
        : undefined,
      updatedAt: data.updatedAt
        ? firestoreTimestampToDate(data.updatedAt)
        : undefined,
      lastLoginAt: data.lastLoginAt
        ? firestoreTimestampToDate(data.lastLoginAt)
        : undefined,
      lastSyncAt: data.lastSyncAt
        ? firestoreTimestampToDate(data.lastSyncAt)
        : undefined,

      // 同步設備管理欄位
      primarySyncDevice: data.primarySyncDevice,
      primarySyncPlatform: data.primarySyncPlatform,
      lastSyncPlatform: data.lastSyncPlatform,
      syncDeviceSwitchedAt: data.syncDeviceSwitchedAt
        ? firestoreTimestampToDate(data.syncDeviceSwitchedAt)
        : undefined,
      deviceLanguage: data.deviceLanguage,

      // RevenueCat 整合屬性
      entitlements: data.entitlements,
      subscriptions: data.subscriptions,
      activeSubscriptions:
        data.active_subscriptions || data.activeSubscriptions,
      allPurchasedProductIds:
        data.all_purchased_product_ids || data.allPurchasedProductIds,
      managementUrl: data.management_url || data.managementUrl,
      originalAppUserId: data.original_app_user_id || data.originalAppUserId,
      revenueCatFirstSeen: data.rc_first_seen
        ? firestoreTimestampToDate(data.rc_first_seen)
        : undefined,
      revenueCatLastSeen: data.rc_last_seen
        ? firestoreTimestampToDate(data.rc_last_seen)
        : undefined,
      revenueCatOriginalPurchaseDate: data.rc_original_purchase_date
        ? firestoreTimestampToDate(data.rc_original_purchase_date)
        : undefined,
      revenueCatRequestDate: data.rc_request_date
        ? firestoreTimestampToDate(data.rc_request_date)
        : undefined,
    };
  }

  /**
   * 檢查使用者是否存在
   * 對應 Flutter: checkUserExists(String uid)
   */
  async exists(uid: string): Promise<boolean> {
    try {
      const doc = await this.getUserDocument(uid).get();
      return doc.exists;
    } catch (error) {
      console.error("Repository: 檢查使用者是否存在時發生錯誤:", error);
      throw new Error("無法檢查使用者是否存在");
    }
  }

  /**
   * 根據 UID 查詢使用者資料
   * 對應 Flutter: getUser({String? userId})
   */
  async findById(uid: string): Promise<AppUser | null> {
    try {
      const doc = await this.getUserDocument(uid).get();

      if (!doc.exists) {
        return null;
      }

      const user = this.convertFirestoreDocToAppUser(doc);
      return user;
    } catch (error) {
      console.error("Repository: 取得使用者資料時發生錯誤:", error);
      throw new Error("無法從資料庫取得使用者資料");
    }
  }

  /**
   * 過濾有效欄位，只保留實際提供且不為 null/undefined 的值
   * @param data 原始資料
   * @returns 過濾後的資料
   */
  private filterValidFields(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // 只保留不是 null/undefined 且不是空字串的值
      if (value !== null && value !== undefined && value !== "") {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 建立新使用者
   * 對應 Flutter: createUser(AppUser user)
   *
   * 完全遵循 Flutter 的邏輯：
   * ```dart
   * final userData = {
   *   'uid': user.uid,
   *   'email': user.email,
   *   'displayName': user.displayName,     // 可能是 null
   *   'photoURL': user.photoURL,           // 可能是 null
   *   'createdAt': FieldValue.serverTimestamp(),
   *   'lastLoginAt': FieldValue.serverTimestamp(),
   *   "deviceLanguage": user.deviceLanguage // 可能是 null
   * };
   * await userDoc(user.uid).set(userData);
   * ```
   *
   * 重要：只設定實際提供的欄位，不設定 null 值
   */
  async create(user: AppUser): Promise<void> {
    try {
      const now = new Date();

      // 基礎資料，對應 Flutter 的 userData 結構
      const baseUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: now, // 對應 FieldValue.serverTimestamp()
        lastLoginAt: now, // 對應 FieldValue.serverTimestamp()
        updatedAt: now, // 對應 FieldValue.serverTimestamp()
        deviceLanguage: user.deviceLanguage,
      };

      // 其他可能的欄位（如果前端提供的話）
      const additionalFields: Record<string, any> = {};

      // 只有在實際提供時才添加這些欄位
      if (user.gender !== null && user.gender !== undefined)
        additionalFields.gender = user.gender;
      if (user.age !== null && user.age !== undefined)
        additionalFields.age = user.age;
      if (user.height !== null && user.height !== undefined)
        additionalFields.height = user.height;
      if (user.initWeight !== null && user.initWeight !== undefined)
        additionalFields.initWeight = user.initWeight;
      if (user.targetWeight !== null && user.targetWeight !== undefined)
        additionalFields.targetWeight = user.targetWeight;
      if (user.goal !== null && user.goal !== undefined)
        additionalFields.goal = user.goal;
      if (user.preferHeightUnit !== null && user.preferHeightUnit !== undefined)
        additionalFields.preferHeightUnit = user.preferHeightUnit;
      if (user.preferWeightUnit !== null && user.preferWeightUnit !== undefined)
        additionalFields.preferWeightUnit = user.preferWeightUnit;
      if (user.activityLevel !== null && user.activityLevel !== undefined)
        additionalFields.activityLevel = user.activityLevel;
      if (
        user.weightSpeedPerWeek !== null &&
        user.weightSpeedPerWeek !== undefined
      )
        additionalFields.weightSpeedPerWeek = user.weightSpeedPerWeek;
      if (user.targetCalories !== null && user.targetCalories !== undefined)
        additionalFields.targetCalories = user.targetCalories;
      if (user.targetProtein !== null && user.targetProtein !== undefined)
        additionalFields.targetProtein = user.targetProtein;
      if (user.targetFat !== null && user.targetFat !== undefined)
        additionalFields.targetFat = user.targetFat;
      if (user.targetCarb !== null && user.targetCarb !== undefined)
        additionalFields.targetCarb = user.targetCarb;
      if (user.bmr !== null && user.bmr !== undefined)
        additionalFields.bmr = user.bmr;
      if (user.tdee !== null && user.tdee !== undefined)
        additionalFields.tdee = user.tdee;
      if (user.isRecipePublic !== null && user.isRecipePublic !== undefined)
        additionalFields.isRecipePublic = user.isRecipePublic;
      if (
        user.primarySyncDevice !== null &&
        user.primarySyncDevice !== undefined
      )
        additionalFields.primarySyncDevice = user.primarySyncDevice;
      if (
        user.primarySyncPlatform !== null &&
        user.primarySyncPlatform !== undefined
      )
        additionalFields.primarySyncPlatform = user.primarySyncPlatform;
      if (user.lastSyncPlatform !== null && user.lastSyncPlatform !== undefined)
        additionalFields.lastSyncPlatform = user.lastSyncPlatform;

      // 合併基礎資料和額外欄位，然後過濾掉 null/undefined 值
      const userData = this.filterValidFields({
        ...baseUserData,
        ...additionalFields,
      });

      await this.getUserDocument(user.uid).set(userData);
    } catch (error) {
      console.error("Repository: 建立使用者時發生錯誤:", error);

      // 如果是因為文件已存在而失敗，提供更明確的錯誤訊息
      if (error instanceof Error) {
        if (
          (error as any).code === "already-exists" ||
          error.message?.includes("already exists")
        ) {
          throw new Error(`文件 ID 已存在：${user.uid}`);
        }
      }

      throw new Error("無法建立使用者");
    }
  }

  /**
   * 更新使用者資料
   * 對應 Flutter: updateUser(Map<String, dynamic> data)
   *
   * 對應的 Flutter 邏輯：
   * ```dart
   * await userDoc(uid).update(data);
   * ```
   *
   * 重要：不處理 RevenueCat 相關欄位的更新，因為這些由 RevenueCat 自動管理
   */
  async update(uid: string, data: Partial<AppUser>): Promise<void> {
    try {
      // 移除 RevenueCat 相關欄位，因為這些不應該由應用程式更新
      const updateData: any = { ...data };

      // 移除 RevenueCat 欄位（這些由 RevenueCat 自動管理）
      delete updateData.entitlements;
      delete updateData.subscriptions;
      delete updateData.activeSubscriptions;
      delete updateData.allPurchasedProductIds;
      delete updateData.managementUrl;
      delete updateData.originalAppUserId;
      delete updateData.revenueCatFirstSeen;
      delete updateData.revenueCatLastSeen;
      delete updateData.revenueCatOriginalPurchaseDate;
      delete updateData.revenueCatRequestDate;

      // 設定更新時間
      updateData.updatedAt = new Date();

      // 移除不應該更新的欄位
      delete updateData.uid; // UID 不能更新
      delete updateData.createdAt; // 建立時間不能更新

      // 過濾掉 null/undefined 值，只更新實際提供的欄位
      const filteredUpdateData = this.filterValidFields(updateData);
      // console.log("update user data", uid, data);
      // console.log("update user data2", updateData);
      await this.getUserDocument(uid).update(filteredUpdateData);
    } catch (error) {
      console.error("Repository: 更新使用者資料時發生錯誤:", error);
      throw new Error("無法更新使用者資料");
    }
  }
}
