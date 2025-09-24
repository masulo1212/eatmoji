import { ChatReport, ChatMessage } from "../types/chat";
import { IChatService } from "../services/chatService";

/**
 * API 響應格式（重用現有的格式）
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * API 錯誤響應格式
 */
export interface ApiErrorResponse {
  success: false;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

/**
 * Chat Service 介面引用 (用於依賴注入)
 */
export interface IChatController {
  hasAnyChats(userId: string): Promise<ApiResponse<boolean>>;
  addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ApiResponse<ChatReport>>;
  getLatestChat(userId: string): Promise<ApiResponse<ChatReport | null>>;
  getTotalChatCount(userId: string): Promise<ApiResponse<number>>;
  getChatMessages(userId: string, chatId: string): Promise<ApiResponse<ChatMessage[]>>;
  sendMessage(userId: string, message: ChatMessage): Promise<ApiResponse<void>>;
  initializeChatData(userId: string): Promise<ApiResponse<any>>;
}

/**
 * Chat Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 * 參考 DiaryController 的模式
 */
export class ChatController implements IChatController {
  constructor(private chatService: IChatService) {}

  /**
   * 檢查使用者是否有任何聊天記錄
   * 對應 Dart hasAnyChats() 方法
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async hasAnyChats(userId: string): Promise<ApiResponse<boolean>> {
    try {
      // 調用 Service 層
      const hasChats = await this.chatService.hasAnyChats(userId);

      return {
        success: true,
        result: hasChats,
      };
    } catch (error) {
      console.error("Controller: 檢查聊天記錄失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "檢查聊天記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 添加新的聊天記錄
   * 對應 Dart addChat() 方法
   * @param userId 使用者 ID
   * @param chatReport 聊天報告資料
   * @returns API 響應格式
   */
  async addChat(userId: string, chatReport: Partial<ChatReport>): Promise<ApiResponse<ChatReport>> {
    try {
      // 基本參數驗證
      if (!chatReport.id?.trim()) {
        return {
          success: false,
          error: "聊天記錄 ID 不能為空",
        };
      }

      if (!chatReport.reportSummary?.text?.trim()) {
        return {
          success: false,
          error: "聊天報告摘要不能為空",
        };
      }

      // 調用 Service 層
      const createdChat = await this.chatService.addChat(userId, chatReport);

      return {
        success: true,
        result: createdChat,
      };
    } catch (error) {
      console.error("Controller: 添加聊天記錄失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "添加聊天記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取最新的聊天記錄
   * 對應 Dart getLatestChat() 方法
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getLatestChat(userId: string): Promise<ApiResponse<ChatReport | null>> {
    try {
      // 調用 Service 層
      const latestChat = await this.chatService.getLatestChat(userId);

      return {
        success: true,
        result: latestChat,
      };
    } catch (error) {
      console.error("Controller: 獲取最新聊天記錄失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "獲取最新聊天記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取聊天記錄總數
   * 對應 Dart getTotalChatCount() 方法
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getTotalChatCount(userId: string): Promise<ApiResponse<number>> {
    try {
      // 調用 Service 層
      const totalCount = await this.chatService.getTotalChatCount(userId);

      return {
        success: true,
        result: totalCount,
      };
    } catch (error) {
      console.error("Controller: 獲取聊天記錄總數失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "獲取聊天記錄總數時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取指定聊天的所有訊息
   * 對應 Dart getChatMessages() 方法
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   * @returns API 響應格式
   */
  async getChatMessages(userId: string, chatId: string): Promise<ApiResponse<ChatMessage[]>> {
    try {
      // 基本參數驗證
      if (!chatId.trim()) {
        return {
          success: false,
          error: "聊天 ID 不能為空",
        };
      }

      // 調用 Service 層
      const messages = await this.chatService.getChatMessages(userId, chatId);

      return {
        success: true,
        result: messages,
      };
    } catch (error) {
      console.error("Controller: 獲取聊天訊息失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "獲取聊天訊息時發生未知錯誤",
      };
    }
  }

  /**
   * 發送訊息到指定聊天
   * 對應 Dart sendMessage() 方法
   * @param userId 使用者 ID
   * @param message 聊天訊息
   * @returns API 響應格式
   */
  async sendMessage(userId: string, message: ChatMessage): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!message.chatId?.trim()) {
        return {
          success: false,
          error: "聊天 ID 不能為空",
        };
      }

      if (!message.content?.trim()) {
        return {
          success: false,
          error: "訊息內容不能為空",
        };
      }

      if (!message.role?.trim()) {
        return {
          success: false,
          error: "訊息角色不能為空",
        };
      }

      // 驗證角色欄位
      const validRoles = ["user", "assistant", "system"];
      if (!validRoles.includes(message.role.toLowerCase())) {
        return {
          success: false,
          error: `無效的訊息角色: ${message.role}`,
        };
      }

      // 調用 Service 層
      await this.chatService.sendMessage(userId, message);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 發送訊息失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "發送訊息時發生未知錯誤",
      };
    }
  }

  /**
   * 根據 ID 獲取聊天記錄
   * @param userId 使用者 ID
   * @param chatId 聊天 ID
   * @returns API 響應格式
   */
  async getChatById(userId: string, chatId: string): Promise<ApiResponse<ChatReport | null>> {
    try {
      // 基本參數驗證
      if (!chatId.trim()) {
        return {
          success: false,
          error: "聊天 ID 不能為空",
        };
      }

      // 調用 Service 層
      const chat = await this.chatService.getChatById(userId, chatId);

      return {
        success: true,
        result: chat,
      };
    } catch (error) {
      console.error("Controller: 獲取聊天記錄失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "獲取聊天記錄時發生未知錯誤",
      };
    }
  }

  /**
   * 初始化聊天數據
   * 對應 Dart initializeChatData() 的複合邏輯
   * 這是一個複合方法，整合多個 API 調用
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async initializeChatData(userId: string): Promise<ApiResponse<{
    hasChats: boolean;
    latestChat: ChatReport | null;
    totalCount: number;
    messages?: ChatMessage[];
  }>> {
    try {
      // 調用 Service 層的複合方法
      const initData = await this.chatService.initializeChatData(userId);

      return {
        success: true,
        result: initData,
      };
    } catch (error) {
      console.error("Controller: 初始化聊天數據失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "初始化聊天數據時發生未知錯誤",
      };
    }
  }

  /**
   * 批量操作：獲取聊天摘要信息
   * 提供一個便利的方法來獲取聊天的基本統計信息
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getChatSummary(userId: string): Promise<ApiResponse<{
    hasAnyChats: boolean;
    totalCount: number;
    latestChatId?: string;
    latestChatCreatedAt?: Date;
  }>> {
    try {
      // 並行調用多個 Service 方法以提高效能
      const [hasChats, totalCount, latestChat] = await Promise.all([
        this.chatService.hasAnyChats(userId),
        this.chatService.getTotalChatCount(userId),
        this.chatService.getLatestChat(userId),
      ]);

      const summary = {
        hasAnyChats: hasChats,
        totalCount: totalCount,
        latestChatId: latestChat?.id,
        latestChatCreatedAt: latestChat?.createdAt,
      };

      return {
        success: true,
        result: summary,
      };
    } catch (error) {
      console.error("Controller: 獲取聊天摘要失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "獲取聊天摘要時發生未知錯誤",
      };
    }
  }

  /**
   * 驗證聊天訊息格式
   * 輔助方法用於驗證 ChatMessage 物件
   * @param message 要驗證的訊息
   * @returns 驗證結果
   */
  private validateChatMessage(message: any): string | null {
    if (!message) {
      return "訊息資料不能為空";
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      return "訊息內容必須是非空字符串";
    }

    if (typeof message.role !== "string" || !message.role.trim()) {
      return "訊息角色必須是非空字符串";
    }

    const validRoles = ["user", "assistant", "system"];
    if (!validRoles.includes(message.role.toLowerCase())) {
      return `訊息角色必須是以下之一: ${validRoles.join(", ")}`;
    }

    if (message.chatId && (typeof message.chatId !== "string" || !message.chatId.trim())) {
      return "聊天 ID 必須是非空字符串（如果提供的話）";
    }

    return null; // 驗證通過
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ): ApiErrorResponse {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }

  /**
   * 統一的成功響應格式化方法
   * @param result 響應資料
   * @returns 格式化的成功響應
   */
  static toSuccessResponse<T>(result: T): ApiResponse<T> {
    return {
      success: true,
      result,
    };
  }

  /**
   * 統一的錯誤響應格式化方法
   * @param error 錯誤訊息或錯誤物件
   * @returns 格式化的錯誤響應
   */
  static toFailureResponse(error: string | Error): ApiResponse {
    return {
      success: false,
      error: error instanceof Error ? error.message : error,
    };
  }
}