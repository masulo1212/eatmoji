import { FirestoreClient } from "firebase-rest-firestore";
import { FcmTokenData, fcmTokenDataFromFirestore } from "../types/fcmToken";

/**
 * FCM Token Repository 介面 - 定義資料存取操作
 */
export interface IFcmTokenRepository {
  /**
   * 註冊或更新 FCM Token 到 Firestore
   * 對應 Flutter _registerTokenToFirestore 方法
   * @param userId 使用者 ID
   * @param tokenData FCM Token 資料
   * @returns 註冊的 FcmTokenData 物件
   */
  registerToken(userId: string, tokenData: FcmTokenData): Promise<void>;

  /**
   * 根據設備 ID 刪除特定設備的 Token
   * 對應 Flutter removeCurrentDeviceToken 方法
   * @param userId 使用者 ID
   * @param deviceId 設備 ID
   */
  removeDeviceToken(userId: string, deviceId: string): Promise<void>;

  /**
   * 獲取使用者所有 FCM Token
   * 對應 Flutter getUserTokens 方法
   * @param userId 使用者 ID
   * @returns FcmTokenData 陣列
   */
  getUserTokens(userId: string): Promise<FcmTokenData[]>;

  /**
   * 清理過期的 FCM Token（超過指定天數未使用）
   * 對應 Flutter _cleanupExpiredTokens 方法
   * @param userId 使用者 ID
   * @param expiredPeriodDays 過期期間（天數），預設 30 天
   * @returns 刪除的 Token 數量
   */
  cleanupExpiredTokens(
    userId: string,
    expiredPeriodDays?: number
  ): Promise<number>;

  /**
   * 根據設備 ID 獲取特定 Token
   * @param userId 使用者 ID
   * @param deviceId 設備 ID
   * @returns FcmTokenData 物件或 null
   */
  getTokenByDeviceId(
    userId: string,
    deviceId: string
  ): Promise<FcmTokenData | null>;
}

/**
 * Firestore FCM Token Repository 實作
 */
export class FirestoreFcmTokenRepository implements IFcmTokenRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的 FCM Token collection 參考
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserFcmTokenCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/fcm_tokens`);
  }

  /**
   * 將 Firestore 文件轉換為 FcmTokenData 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 FcmTokenData 物件
   */
  private convertFirestoreDocToFcmToken(doc: any): FcmTokenData {
    return fcmTokenDataFromFirestore(doc.data());
  }

  /**
   * 註冊或更新 FCM Token 到 Firestore
   * 使用設備 ID 作為 document ID 以避免重複
   * 對應 Flutter _registerTokenToFirestore 邏輯
   */
  async registerToken(userId: string, tokenData: FcmTokenData): Promise<void> {
    try {
      const collection = this.getUserFcmTokenCollection(userId);
      const now = new Date();

      // 使用設備 ID 作為文件 ID
      const docRef = collection.doc(tokenData.deviceId);

      // 檢查文件是否已存在，避免覆蓋 createdAt
      const existingDoc = await docRef.get();

      // 建立包含時間戳記的文件資料
      console.log("FCM Token 註冊:", tokenData);
      const docData: any = {
        ...tokenData,
        lastActive: now,
      };

      // 只有新文件才設置 createdAt，避免覆蓋現有的創建時間
      if (!existingDoc.exists) {
        docData.createdAt = now;
        console.log(`新建 FCM Token: ${tokenData.deviceId}`);
      } else {
        docData.createdAt = existingDoc.data()?.createdAt;
        console.log(`更新現有 FCM Token: ${tokenData.deviceId}`);
      }

      await docRef.set(docData, { merge: true });

      console.log(
        `FCM Token 註冊成功: ${tokenData.language} - ${tokenData.deviceId}`
      );

      // 在成功註冊後自動清理過期 Token
      await this.cleanupExpiredTokens(userId);
    } catch (error) {
      console.error("Repository: 註冊 FCM Token 時發生錯誤:", error);
      throw new Error("無法註冊 FCM Token 到資料庫");
    }
  }

  /**
   * 根據設備 ID 刪除特定設備的 Token
   * 對應 Flutter removeCurrentDeviceToken 邏輯
   */
  async removeDeviceToken(userId: string, deviceId: string): Promise<void> {
    try {
      const collection = this.getUserFcmTokenCollection(userId);
      const docRef = collection.doc(deviceId);

      await docRef.delete();

      console.log(`FCM Token 刪除成功: ${deviceId}`);
    } catch (error) {
      console.error("Repository: 刪除 FCM Token 時發生錯誤:", error);
      throw new Error("無法刪除 FCM Token");
    }
  }

  /**
   * 獲取使用者所有 FCM Token
   * 對應 Flutter getUserTokens 靜態方法
   */
  async getUserTokens(userId: string): Promise<FcmTokenData[]> {
    try {
      const collection = this.getUserFcmTokenCollection(userId);
      const snapshot = await collection.get();

      const tokens = snapshot.docs.map((doc) =>
        this.convertFirestoreDocToFcmToken(doc)
      );

      console.log(`取得使用者 ${userId} 的 ${tokens.length} 個 FCM Token`);

      return tokens;
    } catch (error) {
      console.error("Repository: 取得使用者 FCM Token 時發生錯誤:", error);
      throw new Error("無法從資料庫取得 FCM Token 列表");
    }
  }


  /**
   * 清理過期的 FCM Token
   * 對應 Flutter _cleanupExpiredTokens 邏輯
   */
  async cleanupExpiredTokens(
    userId: string,
    expiredPeriodDays: number = 30
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expiredPeriodDays);

      const collection = this.getUserFcmTokenCollection(userId);
      const expiredTokensQuery = collection.where(
        "lastActive",
        "<",
        cutoffDate
      );
      const snapshot = await expiredTokensQuery.get();

      if (snapshot.docs.length === 0) {
        return 0;
      }

      // 使用 Promise.all 並行刪除所有過期的 Token
      const deletePromises = snapshot.docs.map((doc) => {
        const docRef = collection.doc(doc.id);
        return docRef.delete();
      });

      await Promise.all(deletePromises);
      const deletedCount = snapshot.docs.length;

      console.log(
        `清理了 ${deletedCount} 個過期的 FCM Token（${expiredPeriodDays} 天未活躍）`
      );

      return deletedCount;
    } catch (error) {
      console.error("Repository: 清理過期 FCM Token 時發生錯誤:", error);
      throw new Error("無法清理過期 FCM Token");
    }
  }


  /**
   * 根據設備 ID 獲取特定 Token
   */
  async getTokenByDeviceId(
    userId: string,
    deviceId: string
  ): Promise<FcmTokenData | null> {
    try {
      const collection = this.getUserFcmTokenCollection(userId);
      const doc = await collection.doc(deviceId).get();

      if (!doc.exists) {
        return null;
      }

      return this.convertFirestoreDocToFcmToken(doc);
    } catch (error) {
      console.error("Repository: 取得 FCM Token 時發生錯誤:", error);
      throw new Error("無法從資料庫取得 FCM Token");
    }
  }
}
