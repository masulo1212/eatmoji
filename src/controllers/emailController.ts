/**
 * 郵件控制器 - 使用分層架構模式
 */
import EmailService from '../services/emailService';
import type { 
  EmailSendRequest, 
  CancellationFeedbackData 
} from '../types/email';
import type { Env } from '../bindings';

/**
 * API 響應格式
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
 * Email Controller 介面
 */
export interface IEmailController {
  sendEmail(request: EmailSendRequest, env: Env): Promise<ApiResponse>;
  sendCancellationFeedbackEmail(
    recipientEmail: string,
    recipientName: string,
    cancellationData: CancellationFeedbackData,
    env: Env,
    userLanguage?: string
  ): Promise<ApiResponse>;
}

/**
 * Email Controller - 處理郵件相關的業務邏輯
 * 負責調用 EmailService 並格式化響應
 */
export class EmailController implements IEmailController {
  constructor(private emailService: EmailService) {}

  /**
   * 發送郵件
   * @param request 郵件發送請求
   * @param env 環境變數
   * @returns API 響應
   */
  async sendEmail(request: EmailSendRequest, env: Env): Promise<ApiResponse> {
    try {
      const result = await this.emailService.sendEmail(request, env);
      
      if (result.success) {
        return {
          success: true,
          result: {
            message: "郵件發送成功",
            messageId: result.messageId,
            timestamp: result.timestamp,
            recipient: result.recipient
          }
        };
      } else {
        return {
          success: false,
          error: result.error || "郵件發送失敗"
        };
      }
    } catch (error) {
      console.error("EmailController.sendEmail 錯誤:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "發送郵件時發生未知錯誤"
      };
    }
  }

  /**
   * 發送取消訂閱回饋郵件
   * @param recipientEmail 收件人郵箱
   * @param recipientName 收件人姓名
   * @param cancellationData 取消訂閱數據
   * @param env 環境變數
   * @param userLanguage 用戶語言
   * @returns API 響應
   */
  async sendCancellationFeedbackEmail(
    recipientEmail: string,
    recipientName: string,
    cancellationData: CancellationFeedbackData,
    env: Env,
    userLanguage: string = "zh_TW"
  ): Promise<ApiResponse> {
    try {
      const result = await this.emailService.sendCancellationFeedbackEmail(
        recipientEmail,
        recipientName,
        cancellationData,
        env,
        userLanguage
      );
      
      if (result.success) {
        return {
          success: true,
          result: {
            message: "取消訂閱回饋郵件發送成功",
            messageId: result.messageId,
            timestamp: result.timestamp,
            recipient: result.recipient
          }
        };
      } else {
        return {
          success: false,
          error: result.error || "取消訂閱回饋郵件發送失敗"
        };
      }
    } catch (error) {
      console.error("EmailController.sendCancellationFeedbackEmail 錯誤:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "發送取消訂閱回饋郵件時發生未知錯誤"
      };
    }
  }
}