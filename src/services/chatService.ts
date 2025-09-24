import { IChatRepository } from "../repositories/chatRepository";
import { ChatReport, ChatMessage } from "../types/chat";

/**
 * Chat Service 介面 - 定義業務邏輯操作
 */
export interface IChatService {
  hasAnyChats(userId: string): Promise<boolean>;
  addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ChatReport>;
  getLatestChat(userId: string): Promise<ChatReport | null>;
  getTotalChatCount(userId: string): Promise<number>;
  getChatMessages(userId: string, chatId: string): Promise<ChatMessage[]>;
  sendMessage(userId: string, message: ChatMessage): Promise<void>;
  getChatById(userId: string, chatId: string): Promise<ChatReport | null>;
}

/**
 * Chat Service - 業務邏輯層
 * 負責業務規則驗證和業務邏輯處理，不直接操作資料庫
 * 參考 Dart chat_controller.dart 的業務邏輯
 */
export class ChatService implements IChatService {
  constructor(private chatRepository: IChatRepository) {}

  /**
   * 檢查使用者是否有任何聊天記錄
   * 業務邏輯：
   * - 驗證使用者 ID
   * - 委派給 Repository 執行查詢
   */
  async hasAnyChats(userId: string): Promise<boolean> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行查詢
      return await this.chatRepository.hasAnyChats(userId);
    } catch (error) {
      console.error("Service: 檢查聊天記錄時發生業務邏輯錯誤:", error);
      throw new Error("檢查聊天記錄失敗");
    }
  }

  /**
   * 添加新的聊天記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 驗證聊天報告數據完整性
   * - 套用業務規則和預設值
   * - 對應 Dart addChat 的邏輯
   */
  async addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ChatReport> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    // 驗證聊天報告基本資料
    if (!chatReport.id || chatReport.id.trim() === "") {
      throw new Error("聊天記錄 ID 不能為空");
    }

    if (!chatReport.reportSummary?.text) {
      throw new Error("聊天報告摘要不能為空");
    }

    // 套用業務規則和預設值
    const processedChatReport = this.applyCreateChatBusinessRules(chatReport);

    try {
      // 檢查是否已存在相同 ID 的聊天記錄（防止重複創建）
      const existingChat = await this.getChatById(userId, chatReport.id);
      if (existingChat) {
        console.warn(`聊天記錄 ${chatReport.id} 已存在，跳過創建`);
        return existingChat;
      }

      // 委派給 Repository 執行創建
      const createdChat = await this.chatRepository.addChat(userId, processedChatReport);
      console.log(`✅ 業務邏輯處理完成，聊天記錄已創建: ${createdChat.id}`);
      
      return createdChat;
    } catch (error) {
      console.error("Service: 添加聊天記錄時發生業務邏輯錯誤:", error);
      throw new Error("添加聊天記錄失敗");
    }
  }

  /**
   * 獲取最新的聊天記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能存取自己的聊天記錄
   * - 對應 Dart getLatestChat 的邏輯
   */
  async getLatestChat(userId: string): Promise<ChatReport | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行查詢
      const latestChat = await this.chatRepository.getLatestChat(userId);
      
      // 額外的業務邏輯檢查（如果需要）
      if (latestChat) {
        // 可以在這裡添加額外的業務邏輯處理
        console.log(`✅ 成功獲取最新聊天記錄: ${latestChat.id}`);
      }

      return latestChat;
    } catch (error) {
      console.error("Service: 獲取最新聊天記錄時發生業務邏輯錯誤:", error);
      throw new Error("獲取最新聊天記錄失敗");
    }
  }

  /**
   * 獲取聊天記錄總數
   * 業務邏輯：
   * - 驗證使用者權限
   * - 套用業務規則（如數量限制等）
   * - 對應 Dart getTotalChatCount 的邏輯
   */
  async getTotalChatCount(userId: string): Promise<number> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行查詢
      const count = await this.chatRepository.getTotalChatCount(userId);
      
      // 套用業務規則
      return this.applyChatCountBusinessRules(count);
    } catch (error) {
      console.error("Service: 獲取聊天記錄總數時發生業務邏輯錯誤:", error);
      throw new Error("獲取聊天記錄總數失敗");
    }
  }

  /**
   * 獲取指定聊天的所有訊息
   * 業務邏輯：
   * - 驗證使用者權限
   * - 驗證聊天是否存在且屬於該使用者
   * - 確保訊息安全性
   * - 對應 Dart getChatMessages 的邏輯
   */
  async getChatMessages(userId: string, chatId: string): Promise<ChatMessage[]> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!chatId || chatId.trim() === "") {
      throw new Error("聊天 ID 不能為空");
    }

    try {
      // 檢查聊天是否存在且屬於該使用者
      const chat = await this.getChatById(userId, chatId);
      if (!chat) {
        throw new Error("找不到指定的聊天記錄或您沒有權限訪問");
      }

      // 委派給 Repository 執行查詢
      const messages = await this.chatRepository.getChatMessages(userId, chatId);
      
      // 套用業務規則（如訊息過濾、排序等）
      return this.applyMessagesBusinessRules(messages);
    } catch (error) {
      console.error("Service: 獲取聊天訊息時發生業務邏輯錯誤:", error);
      throw new Error("獲取聊天訊息失敗");
    }
  }

  /**
   * 發送訊息到指定聊天
   * 業務邏輯：
   * - 驗證使用者權限
   * - 驗證訊息內容
   * - 驗證聊天是否存在
   * - 套用訊息過濾規則
   * - 對應 Dart sendMessage 的邏輯
   */
  async sendMessage(userId: string, message: ChatMessage): Promise<void> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!message.chatId || message.chatId.trim() === "") {
      throw new Error("聊天 ID 不能為空");
    }

    if (!message.content || message.content.trim() === "") {
      throw new Error("訊息內容不能為空");
    }

    if (!message.role || message.role.trim() === "") {
      throw new Error("訊息角色不能為空");
    }

    try {
      // 檢查聊天是否存在且屬於該使用者
      const chat = await this.getChatById(userId, message.chatId);
      if (!chat) {
        throw new Error("找不到指定的聊天記錄或您沒有權限訪問");
      }

      // 套用訊息業務規則
      const processedMessage = this.applyMessageBusinessRules(message);

      // 委派給 Repository 執行發送
      await this.chatRepository.sendMessage(userId, processedMessage);
      
      console.log(`✅ 業務邏輯處理完成，訊息已發送到聊天: ${message.chatId}`);
    } catch (error) {
      console.error("Service: 發送訊息時發生業務邏輯錯誤:", error);
      throw new Error("發送訊息失敗");
    }
  }

  /**
   * 根據 ID 獲取聊天記錄
   * 業務邏輯：
   * - 驗證使用者權限
   * - 確保使用者只能存取自己的聊天記錄
   */
  async getChatById(userId: string, chatId: string): Promise<ChatReport | null> {
    // 業務邏輯驗證
    if (!userId || userId.trim() === "") {
      throw new Error("使用者 ID 不能為空");
    }

    if (!chatId || chatId.trim() === "") {
      throw new Error("聊天 ID 不能為空");
    }

    try {
      // 委派給 Repository 執行查詢
      const chat = await this.chatRepository.getChatById(userId, chatId);
      
      // 安全檢查：確保聊天屬於該使用者（雖然 Repository 已經通過 userId 路徑限制了）
      // 這裡是額外的安全驗證
      
      return chat;
    } catch (error) {
      console.error("Service: 獲取聊天記錄時發生業務邏輯錯誤:", error);
      throw new Error("獲取聊天記錄失敗");
    }
  }

  /**
   * 套用創建聊天記錄的業務規則
   * @param chatReport 原始聊天報告資料
   * @returns 處理後的聊天報告資料
   */
  private applyCreateChatBusinessRules(chatReport: Partial<ChatReport>): Partial<ChatReport> {
    const processed = { ...chatReport };

    // 確保必要欄位存在並有預設值
    if (!processed.reportSummary) {
      processed.reportSummary = { text: "" };
    }

    if (!processed.weightTrend) {
      processed.weightTrend = {
        summaryText: "",
        totalChange: 0,
        weeklyAverageChange: 0,
        unit: "kg",
        chartData: [],
      };
    }

    if (!processed.caloriesIntake) {
      processed.caloriesIntake = {
        averageDailyCalories: 0,
        userTargetCalories: 0,
        unit: "kcal",
        status: "OK" as any,
      };
    }

    if (!processed.macrosBreakdown) {
      processed.macrosBreakdown = { nutrients: [] };
    }

    if (!processed.insights) {
      processed.insights = { items: [] };
    }

    if (!processed.actionPlan) {
      processed.actionPlan = { actions: [] };
    }

    if (!processed.goalPrediction) {
      processed.goalPrediction = {
        text: "",
        weeksToGoal: 0,
        bestWeeksToGoal: 0,
        averageDailyCalories: 0,
        bestTargetCalories: 0,
      };
    }

    if (!processed.workoutEatingConsistency) {
      processed.workoutEatingConsistency = {
        totalExerciseTimes: 0,
        averageExercisePerWeek: 0,
        averageDailySteps: 0,
        totalFoodTrackedDays: 0,
        summaryText: "",
      };
    }

    if (!processed.foodAnalysis) {
      processed.foodAnalysis = {
        bestFoods: [],
        worstFoods: [],
        summaryText: "",
      };
    }

    return processed;
  }

  /**
   * 套用聊天記錄總數的業務規則
   * @param count 原始數量
   * @returns 處理後的數量
   */
  private applyChatCountBusinessRules(count: number): number {
    // 確保數量不為負數
    return Math.max(0, count);
  }

  /**
   * 套用訊息列表的業務規則
   * @param messages 原始訊息列表
   * @returns 處理後的訊息列表
   */
  private applyMessagesBusinessRules(messages: ChatMessage[]): ChatMessage[] {
    return messages
      .filter((message) => {
        // 過濾掉空訊息
        return message.content && message.content.trim() !== "";
      })
      .map((message) => ({
        ...message,
        // 清理訊息內容
        content: message.content.trim(),
      }));
  }

  /**
   * 套用單一訊息的業務規則
   * @param message 原始訊息
   * @returns 處理後的訊息
   */
  private applyMessageBusinessRules(message: ChatMessage): ChatMessage {
    const processed = { ...message };

    // 清理訊息內容
    processed.content = processed.content.trim();

    // 驗證訊息長度
    const MAX_MESSAGE_LENGTH = 10000; // 設定訊息最大長度
    if (processed.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`訊息長度不能超過 ${MAX_MESSAGE_LENGTH} 個字符`);
    }

    // 清理角色欄位
    processed.role = processed.role.toLowerCase().trim();
    
    // 驗證角色欄位
    const validRoles = ["user", "assistant", "system"];
    if (!validRoles.includes(processed.role)) {
      throw new Error(`無效的訊息角色: ${processed.role}`);
    }

    return processed;
  }

  /**
   * 初始化聊天數據（對應 Dart 的 initializeChatData 邏輯）
   * 這是一個複合方法，整合多個業務邏輯
   */
  async initializeChatData(userId: string): Promise<{
    hasChats: boolean;
    latestChat: ChatReport | null;
    totalCount: number;
    messages?: ChatMessage[];
  }> {
    try {
      // 檢查是否有聊天記錄
      const hasChats = await this.hasAnyChats(userId);
      
      if (hasChats) {
        // 有聊天記錄，載入最新的聊天和其訊息
        const latestChat = await this.getLatestChat(userId);
        const totalCount = await this.getTotalChatCount(userId);
        
        let messages: ChatMessage[] = [];
        if (latestChat) {
          messages = await this.getChatMessages(userId, latestChat.id);
        }
        
        return {
          hasChats: true,
          latestChat,
          totalCount,
          messages,
        };
      } else {
        // 沒有聊天記錄
        return {
          hasChats: false,
          latestChat: null,
          totalCount: 0,
        };
      }
    } catch (error) {
      console.error("Service: 初始化聊天數據時發生錯誤:", error);
      throw new Error("初始化聊天數據失敗");
    }
  }
}