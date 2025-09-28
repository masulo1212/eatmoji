import { FirestoreClient } from "firebase-rest-firestore";
import { Diary, firestoreTimestampToDate } from "../types/diary";

/**
 * Diary Repository 介面 - 定義資料存取操作
 */
export interface IDiaryRepository {
  /**
   * 根據使用者 ID 查詢 diary 列表
   * @param userId 使用者 ID
   * @param date 可選的日期過濾條件
   * @returns Diary 陣列
   */
  findByUser(userId: string, date?: Date): Promise<Diary[]>;

  /**
   * 根據 ID 查詢單一 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @returns Diary 物件或 null
   */
  findById(userId: string, diaryId: string): Promise<Diary | null>;

  /**
   * 建立新的 diary
   * @param userId 使用者 ID
   * @param diaryData Diary 資料
   * @returns 建立的 Diary 物件
   */
  create(userId: string, diaryData: Partial<Diary>): Promise<Diary>;

  /**
   * 更新現有 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   * @param updates 更新資料
   * @returns 更新後的 Diary 物件
   */
  update(
    userId: string,
    diaryId: string,
    updates: Partial<Diary>
  ): Promise<Diary>;

  /**
   * 軟刪除 diary
   * @param userId 使用者 ID
   * @param diaryId Diary ID
   */
  softDelete(userId: string, diaryId: string): Promise<void>;

  /**
   * 計算連續天數
   * @param userId 使用者 ID
   * @returns 連續天數
   */
  calculateStreak(userId: string): Promise<number>;
}

/**
 * Firestore Diary Repository 實作
 */
export class FirestoreDiaryRepository implements IDiaryRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的 diary collection 參考
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserDiaryCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/foods`);
  }

  /**
   * 將 Firestore 文件轉換為 Diary 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 Diary 物件
   */
  private convertFirestoreDocToDiary(doc: any): Diary {
    const data = doc.data();

    return {
      id: doc.id,
      userId: data.userId,
      name: data.name,
      brand: data.brand,
      originalImgs: data.originalImgs || [],
      stickerImg: data.stickerImg,
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      healthAssessment: data.healthAssessment,
      ingredients: data.ingredients || [],
      portions: data.portions || 1,
      sourceId: data.sourceId,
      source: data.source,
      status: data.status || "done",
      progress: data.progress || 0,
      error: data.error,
      diaryDate: firestoreTimestampToDate(data.diaryDate),
      createdAt: firestoreTimestampToDate(data.createdAt),
      updatedAt: firestoreTimestampToDate(data.updatedAt),
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt
        ? firestoreTimestampToDate(data.deletedAt)
        : undefined,
    };
  }

  /**
   * 取得 diary 列表，支援可選的日期過濾
   * 對應 Flutter getDiaries 邏輯：
   * - 過濾已刪除的 diary (isDeleted = false)
   * - 可選的日期過濾（大於等於指定日期）
   * - 按 diaryDate 降序排列
   */
  async findByUser(userId: string, date?: Date): Promise<Diary[]> {
    const collection = this.getUserDiaryCollection(userId);

    let query = collection.where("isDeleted", "==", false);

    if (date) {
      query = query.where("diaryDate", ">=", date);
    }

    query = query.orderBy("diaryDate", "desc");

    try {
      const snapshot = await query.get();
      const test = snapshot.docs.map((doc) =>
        this.convertFirestoreDocToDiary(doc)
      );
      return test;
    } catch (error) {
      console.error("Repository: 取得 diary 列表時發生錯誤:", error);
      throw new Error("無法從資料庫取得 diary 列表");
    }
  }

  /**
   * 按 ID 取得單一 diary
   * 對應 Flutter getDiary 邏輯：
   * - 如果文件不存在則返回 null
   * - 如果 diary 被軟刪除則返回 null
   */
  async findById(userId: string, diaryId: string): Promise<Diary | null> {
    try {
      const collection = this.getUserDiaryCollection(userId);
      const doc = await collection.doc(diaryId).get();

      if (!doc.exists) {
        return null;
      }

      const diary = this.convertFirestoreDocToDiary(doc);

      // 如果 diary 被軟刪除，返回 null
      if (diary.isDeleted) {
        return null;
      }

      return diary;
    } catch (error) {
      console.error("Repository: 取得 diary 時發生錯誤:", error);
      throw new Error("無法從資料庫取得 diary");
    }
  }

  /**
   * 建立新的 diary 項目
   * 支援自訂文件 ID：如果 diaryData 包含 id 欄位，使用該 ID 作為文件 ID
   */
  async create(userId: string, diaryData: Partial<Diary>): Promise<Diary> {
    try {
      const collection = this.getUserDiaryCollection(userId);
      const now = new Date();

      // 提取 ID（如果有的話）
      const customId = diaryData.id;

      // 建立文件資料，移除 id 欄位以避免重複儲存
      const docData = {
        ...diaryData,
        userId,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      };

      let createdDoc;

      if (customId) {
        // 使用自訂 ID 建立文件
        const docRef = collection.doc(customId);
        await docRef.set(docData);
        createdDoc = await docRef.get();
      } else {
        // 讓 Firestore 自動產生 ID
        const docRef = await collection.add(docData);
        createdDoc = await docRef.get();
      }

      return this.convertFirestoreDocToDiary(createdDoc);
    } catch (error) {
      console.error("Repository: 建立 diary 時發生錯誤:", error);

      // 如果是因為文件已存在而失敗，提供更明確的錯誤訊息
      if (error instanceof Error) {
        if (
          (error as any).code === "already-exists" ||
          error.message?.includes("already exists")
        ) {
          throw new Error(`文件 ID 已存在：${diaryData.id}`);
        }
      }

      throw new Error("無法建立 diary");
    }
  }

  /**
   * 更新現有的 diary 項目
   */
  async update(
    userId: string,
    diaryId: string,
    updates: Partial<Diary>
  ): Promise<Diary> {
    try {
      const collection = this.getUserDiaryCollection(userId);
      const docRef = collection.doc(diaryId);

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await docRef.update(updateData);
      const updatedDoc = await docRef.get();

      if (!updatedDoc.exists) {
        throw new Error("找不到要更新的 Diary");
      }

      return this.convertFirestoreDocToDiary(updatedDoc);
    } catch (error) {
      console.error("Repository: 更新 diary 時發生錯誤:", error);
      throw new Error("無法更新 diary");
    }
  }

  /**
   * 軟刪除 diary 項目
   * 對應 Flutter deleteDiary 邏輯 - 設定 isDeleted 為 true 而非物理刪除
   */
  async softDelete(userId: string, diaryId: string): Promise<void> {
    try {
      const collection = this.getUserDiaryCollection(userId);
      const docRef = collection.doc(diaryId);

      await docRef.update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Repository: 刪除 diary 時發生錯誤:", error);
      throw new Error("無法刪除 diary");
    }
  }

  /**
   * 計算連續天數
   * 實現 Flutter calculateStreak 的完整邏輯：
   * 1. 分頁查詢使用者的 diary 記錄
   * 2. 收集所有日期到 Set 中
   * 3. 判斷今天是否有打卡記錄
   * 4. 從今天或昨天開始往前推算連續天數
   */
  async calculateStreak(userId: string): Promise<number> {
    const diaryDateSet = new Set<string>();
    let streak = 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = this.dateToKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = this.dateToKey(yesterday);

    let lastDocument: any = null;
    let hasMore = true;

    // 判斷今天是否有打卡
    let todaySigned = false;

    try {
      while (hasMore) {
        const collection = this.getUserDiaryCollection(userId);
        let query = collection
          .where("isDeleted", "==", false)
          .orderBy("diaryDate", "desc")
          .limit(30);

        if (lastDocument) {
          query = (query as any).startAfter(lastDocument);
        }

        const snapshot = await query.get();

        if (snapshot.docs.length === 0) break;

        lastDocument = snapshot.docs[snapshot.docs.length - 1];

        // 收集所有日期
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (!data) continue;

          const timestamp = data.diaryDate;
          if (timestamp) {
            let date: Date;
            // 處理 Firestore timestamp 或 Date 物件
            if (timestamp.toDate) {
              date = timestamp.toDate();
            } else if (timestamp instanceof Date) {
              date = timestamp;
            } else {
              // 如果是字串或其他格式，嘗試轉換
              date = new Date(timestamp);
            }

            if (!isNaN(date.getTime())) {
              const dateKey = this.dateToKey(date);
              diaryDateSet.add(dateKey);
            }
          }
        }

        // 檢查今天是否打卡
        if (!todaySigned && diaryDateSet.has(todayKey)) {
          todaySigned = true;
        }

        // 如果今天打卡，從今天開始算；如果沒打卡，就從昨天開始算
        let cursorDate = todaySigned ? today : yesterday;

        // 計算連續天數
        while (true) {
          const dateKey = this.dateToKey(cursorDate);
          if (diaryDateSet.has(dateKey)) {
            streak += 1;
            cursorDate = new Date(cursorDate);
            cursorDate.setDate(cursorDate.getDate() - 1);
          } else {
            hasMore = false;
            break;
          }
        }

        if (snapshot.docs.length < 30) break;
      }

      return streak;
    } catch (error) {
      console.error("Repository: 計算連續天數時發生錯誤:", error);
      throw new Error("無法計算連續天數");
    }
  }

  /**
   * 工具函式：統一格式為 yyyy-MM-dd
   * 對應 Flutter 的 _dateToKey 方法
   */
  private dateToKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
