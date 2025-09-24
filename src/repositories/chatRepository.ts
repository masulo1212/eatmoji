import { FirestoreClient } from "firebase-rest-firestore";
import { ChatReport, ChatMessage, convertFirestoreDocToChatReport, convertFirestoreDocToChatMessage } from "../types/chat";

/**
 * Chat Repository 介面 - 定義聊天資料存取操作
 */
export interface IChatRepository {
  /**
   * 檢查使用者是否有任何聊天記錄
   * 對應 Dart 的 hasAnyChats() 方法
   * @param userId 使用者 ID
   * @returns 是否有聊天記錄
   */
  hasAnyChats(userId: string): Promise<boolean>;

  /**
   * 添加新的聊天記錄
   * 對應 Dart 的 addChat(ChatReport chatReport) 方法
   * @param userId 使用者 ID
   * @param chatReport 聊天報告資料
   * @returns 創建的聊天報告
   */
  addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ChatReport>;

  /**
   * 獲取最新的聊天記錄
   * 對應 Dart 的 getLatestChat() 方法
   * @param userId 使用者 ID
   * @returns 最新的聊天記錄或 null
   */
  getLatestChat(userId: string): Promise<ChatReport | null>;

  /**
   * 獲取聊天記錄總數
   * 對應 Dart 的 getTotalChatCount() 方法
   * @param userId 使用者 ID
   * @returns 聊天記錄總數
   */
  getTotalChatCount(userId: string): Promise<number>;

  /**
   * 獲取指定聊天的所有訊息
   * 對應 Dart 的 getChatMessages(String chatId) 方法
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   * @returns 聊天訊息列表
   */
  getChatMessages(userId: string, chatId: string): Promise<ChatMessage[]>;

  /**
   * 發送訊息到指定聊天
   * 對應 Dart 的 sendMessage(ChatMessage msg) 方法
   * @param userId 使用者 ID
   * @param message 聊天訊息
   */
  sendMessage(userId: string, message: ChatMessage): Promise<void>;
}

/**
 * Firestore Chat Repository 實作
 * 對應 Dart ChatRepository 的 Firebase 集合結構
 */
export class FirestoreChatRepository implements IChatRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得使用者的聊天 collection 參考
   * 對應 Firebase 集合結構: users/{userId}/chats
   * @param userId 使用者 ID
   * @returns Collection 參考
   */
  private getUserChatsCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/chats`);
  }

  /**
   * 取得指定聊天的訊息 collection 參考
   * 對應 Firebase 集合結構: users/{userId}/chats/{chatId}/messages
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   * @returns Collection 參考
   */
  private getChatMessagesCollection(userId: string, chatId: string) {
    return this.firestore.collection(`users/${userId}/chats/${chatId}/messages`);
  }

  /**
   * 檢查使用者是否有任何聊天記錄
   * 實作 Dart hasAnyChats() 的邏輯
   */
  async hasAnyChats(userId: string): Promise<boolean> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const snapshot = await collection.limit(1).get();
      
      return snapshot.docs.length > 0;
    } catch (error) {
      console.error("Repository: 檢查聊天記錄時發生錯誤:", error);
      throw new Error("無法檢查聊天記錄");
    }
  }

  /**
   * 添加新的聊天記錄
   * 實作 Dart addChat() 的邏輯，包含 serverTimestamp 處理
   */
  async addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ChatReport> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const now = new Date();

      // 準備文件資料，包含創建時間
      const docData = {
        ...chatReport,
        createdAt: now,
      };

      let createdDoc;
      
      if (chatReport.id) {
        // 使用指定的 ID 創建文件
        const docRef = collection.doc(chatReport.id);
        await docRef.set(docData);
        createdDoc = await docRef.get();
        console.log(`✅ 聊天記錄已保存: ${chatReport.id}`);
      } else {
        // 讓 Firestore 自動產生 ID
        const docRef = await collection.add(docData);
        createdDoc = await docRef.get();
        console.log(`✅ 聊天記錄已保存: ${docRef.id}`);
      }

      return convertFirestoreDocToChatReport(createdDoc);
    } catch (error) {
      console.error("Repository: 添加聊天記錄時發生錯誤:", error);
      
      if (error instanceof Error) {
        if ((error as any).code === "already-exists" || error.message?.includes("already exists")) {
          throw new Error(`聊天記錄 ID 已存在：${chatReport.id}`);
        }
      }
      
      throw new Error("無法添加聊天記錄");
    }
  }

  /**
   * 獲取最新的聊天記錄
   * 實作 Dart getLatestChat() 的邏輯，按 createdAt 降序排列並取第一個
   */
  async getLatestChat(userId: string): Promise<ChatReport | null> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const snapshot = await collection
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (snapshot.docs.length === 0) {
        console.log("📝 沒有找到聊天記錄");
        return null;
      }

      const chatDoc = snapshot.docs[0];
      const chat = convertFirestoreDocToChatReport(chatDoc);
      console.log(`✅ 獲取到最新聊天記錄: ${chat.id}`);
      
      return chat;
    } catch (error) {
      console.error("Repository: 獲取最新聊天記錄時發生錯誤:", error);
      throw new Error("無法獲取最新聊天記錄");
    }
  }

  /**
   * 獲取聊天記錄總數
   * 實作 Dart getTotalChatCount() 的邏輯
   */
  async getTotalChatCount(userId: string): Promise<number> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const snapshot = await collection.get();
      
      return snapshot.docs.length;
    } catch (error) {
      console.error("❌ 獲取聊天記錄總數失敗:", error);
      return 0;
    }
  }

  /**
   * 獲取指定聊天的所有訊息
   * 實作 Dart getChatMessages() 的邏輯，按時間順序排列
   */
  async getChatMessages(userId: string, chatId: string): Promise<ChatMessage[]> {
    try {
      const messagesCollection = this.getChatMessagesCollection(userId, chatId);
      const messagesSnapshot = await messagesCollection
        .orderBy("createdAt", "asc") // 按時間順序排列
        .get();

      const messages = messagesSnapshot.docs.map((doc) => {
        const message = convertFirestoreDocToChatMessage(doc);
        // 確保 chatId 正確設置
        return {
          ...message,
          chatId,
        };
      });

      console.log(`✅ 獲取到 ${messages.length} 則訊息`);
      return messages;
    } catch (error) {
      console.error("❌ 獲取訊息失敗:", error);
      return [];
    }
  }

  /**
   * 發送訊息到指定聊天
   * 實作 Dart sendMessage() 的邏輯，包含 serverTimestamp 處理
   */
  async sendMessage(userId: string, message: ChatMessage): Promise<void> {
    try {
      if (!message.chatId) {
        throw new Error("聊天 ID 是必需的");
      }

      const messagesCollection = this.getChatMessagesCollection(userId, message.chatId);
      const now = new Date();

      const messageData = {
        content: message.content,
        role: message.role,
        createdAt: now,
        chatId: message.chatId,
        messageId: message.messageId,
      };

      if (message.messageId) {
        // 使用指定的訊息 ID
        await messagesCollection.doc(message.messageId).set(messageData);
      } else {
        // 讓 Firestore 自動產生 ID
        await messagesCollection.add(messageData);
      }

      const truncatedContent = message.content.length > 50 
        ? message.content.substring(0, 50) + "..."
        : message.content;
      
      console.log(`✅ 訊息已發送: ${message.role} - ${truncatedContent}`);
    } catch (error) {
      console.error("❌ 發送訊息失敗:", error);
      throw new Error("發送訊息失敗");
    }
  }

  /**
   * 根據 ID 獲取單一聊天記錄（輔助方法）
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   * @returns 聊天記錄或 null
   */
  async getChatById(userId: string, chatId: string): Promise<ChatReport | null> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const doc = await collection.doc(chatId).get();

      if (!doc.exists) {
        return null;
      }

      return convertFirestoreDocToChatReport(doc);
    } catch (error) {
      console.error("Repository: 獲取聊天記錄時發生錯誤:", error);
      throw new Error("無法獲取聊天記錄");
    }
  }

  /**
   * 軟刪除聊天記錄（預留方法）
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   */
  async deleteChatSoft(userId: string, chatId: string): Promise<void> {
    try {
      const collection = this.getUserChatsCollection(userId);
      const docRef = collection.doc(chatId);

      await docRef.update({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ 聊天記錄已軟刪除: ${chatId}`);
    } catch (error) {
      console.error("Repository: 軟刪除聊天記錄時發生錯誤:", error);
      throw new Error("無法刪除聊天記錄");
    }
  }
}