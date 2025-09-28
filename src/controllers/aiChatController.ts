import { AIChatService } from "../services/aiChatService";
import type { 
  ChatData, 
  HealthReportResult, 
  ChatResult, 
  UserData,
  ChatHistory 
} from "../types/chat";
import type { Env } from "../bindings";

/**
 * AI Chat Service 介面 - 定義業務邏輯操作
 */
export interface IAIChatService {
  processChat(
    chatData: ChatData,
    env: Env
  ): Promise<HealthReportResult | ReadableStream<Uint8Array>>;
}

/**
 * API 響應格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * AI Chat Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 AI Chat Service 層並格式化響應
 */
export class AIChatController {
  constructor(private aiChatService: IAIChatService) {}

  /**
   * 處理聊天請求
   * @param chatData 聊天數據
   * @param env 環境變數
   * @returns API 響應格式的聊天結果或串流
   */
  async processChat(
    chatData: ChatData,
    env: Env
  ): Promise<ApiResponse<HealthReportResult> | ReadableStream<Uint8Array>> {
    try {
      // 調用服務層處理業務邏輯
      console.log("AIChatController - 開始處理聊天:", {
        用戶輸入長度: chatData.userInput.length,
        語言: chatData.userLanguage,
        生成報告: chatData.generateReport,
        歷史記錄數量: chatData.history.length,
      });

      const result = await this.aiChatService.processChat(chatData, env);

      // 如果結果是 ReadableStream（串流模式），直接返回
      if (result instanceof ReadableStream) {
        console.log("AIChatController - 返回串流響應");
        return result;
      }

      console.log("AIChatController - 聊天處理完成:", {
        響應類型: "健康報告",
        包含欄位: Object.keys(result),
      });

      // 非串流模式（報告模式）
      return {
        success: true,
        result: result as HealthReportResult,
      };
    } catch (error) {
      console.error("AIChatController - 聊天處理失敗:", error);
      
      // 格式化錯誤響應
      const errorMessage = error instanceof Error ? error.message : "處理聊天時發生未知錯誤";
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 驗證聊天請求參數
   * @param chatData 聊天數據
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateChatRequest(chatData: ChatData): string | null {
    const { userInput, userData, userLanguage, history, generateReport } = chatData;

    // 驗證用戶輸入類型（允許空字符串）
    if (typeof userInput !== "string") {
      return "userInput 必須是字符串類型";
    }

    if (userInput.length > 1000) {
      return "用戶輸入過長，請限制在 1000 字符以內";
    }

    // 驗證用戶數據
    if (!userData || typeof userData !== "object") {
      return "用戶數據格式錯誤";
    }

    // 驗證語言代碼
    const supportedLanguages = [
      "zh_TW", "zh_CN", "en", "ja", "ko", "vi", 
      "th", "ms", "id", "fr", "de", "es", "pt_BR"
    ];

    if (!supportedLanguages.includes(userLanguage)) {
      return `不支援的語言代碼: ${userLanguage}`;
    }

    // 驗證歷史記錄
    if (!Array.isArray(history)) {
      return "對話歷史格式錯誤";
    }

    // 驗證生成報告標誌
    if (typeof generateReport !== "boolean") {
      return "generateReport 參數必須是布爾值";
    }

    return null; // 驗證通過
  }

  /**
   * 從表單數據中提取聊天相關數據
   * @param formData 表單數據
   * @returns 聊天數據物件
   */
  extractChatDataFromFormData(formData: FormData): ChatData {
    return {
      userInput: formData.get("input")?.toString() || "",
      userData: this._parseJsonSafely(formData.get("userData")?.toString() || "{}") as UserData,
      userLanguage: formData.get("user_language")?.toString() || "zh_TW",
      history: this._parseJsonSafely(formData.get("historyJson")?.toString() || "[]") as ChatHistory[],
      generateReport: formData.get("generateReport")?.toString() === "true"
    };
  }

  /**
   * 安全解析 JSON
   * @param jsonString JSON 字符串
   * @returns 解析後的物件或陣列
   */
  private _parseJsonSafely(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn("JSON 解析失敗:", error instanceof Error ? error.message : String(error));
      return jsonString.startsWith('[') ? [] : {};
    }
  }

  /**
   * 建立 CORS 相容的串流響應
   * @param stream 串流數據
   * @returns HTTP 響應
   */
  createStreamResponse(stream: ReadableStream<Uint8Array>): Response {
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  /**
   * 建立標準 JSON 響應
   * @param response API 響應數據
   * @returns HTTP 響應
   */
  createJsonResponse(response: ApiResponse<HealthReportResult>): Response {
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      status: response.success ? 200 : 400,
    });
  }

  /**
   * 建立錯誤響應
   * @param error 錯誤訊息
   * @param status HTTP 狀態碼
   * @returns HTTP 響應
   */
  createErrorResponse(error: string, status: number = 400): Response {
    const response: ApiResponse = {
      success: false,
      error: error,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      status: status,
    });
  }
}