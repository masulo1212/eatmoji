/**
 * 郵件相關類型定義
 */

/**
 * 郵件發送請求數據
 */
export interface EmailSendRequest {
  /** 收件人郵箱地址 */
  recipientEmail: string;
  /** 收件人姓名 */
  recipientName?: string;
  /** 郵件主題 */
  subject: string;
  /** 郵件類型 */
  emailType: EmailType;
  /** 用戶語言偏好 */
  userLanguage?: string;
  /** 額外的模板數據 */
  templateData?: EmailTemplateData;
}

/**
 * 郵件類型枚舉
 */
export type EmailType = 
  | 'cancellation_feedback'  // 取消訂閱回饋
  | 'welcome'                // 歡迎郵件
  | 'confirmation'           // 確認郵件
  | 'notification';          // 通知郵件

/**
 * 郵件模板數據
 */
export interface EmailTemplateData {
  /** 用戶名稱 */
  userName?: string;
  /** 產品名稱 */
  productName?: string;
  /** 取消訂閱日期 */
  cancellationDate?: string;
  /** 回饋問卷連結 */
  feedbackUrl?: string;
  /** 重新訂閱連結 */
  resubscribeUrl?: string;
  /** 自定義內容 */
  customContent?: string;
  /** 其他動態屬性 */
  [key: string]: string | undefined;
}

/**
 * 郵件發送配置
 */
export interface EmailConfig {
  /** SMTP 主機 */
  smtpHost: string;
  /** SMTP 端口 */
  smtpPort: number;
  /** SMTP 安全連接 */
  smtpSecure: boolean;
  /** 發件人郵箱 */
  senderEmail: string;
  /** 發件人密碼（App Password） */
  senderPassword: string;
  /** SMTP 認證用戶（通常是真實的 Gmail 帳號） */
  smtpAuthUser: string;
  /** 發件人姓名 */
  senderName: string;
}

/**
 * 郵件發送結果
 */
export interface EmailSendResult {
  /** 是否成功發送 */
  success: boolean;
  /** 郵件 ID（如果成功） */
  messageId?: string;
  /** 錯誤訊息（如果失敗） */
  error?: string;
  /** 發送時間戳 */
  timestamp: string;
  /** 收件人資訊 */
  recipient: {
    email: string;
    name?: string;
  };
}

/**
 * 郵件模板內容
 */
export interface EmailTemplate {
  /** HTML 內容 */
  html: string;
  /** 純文字內容 */
  text: string;
  /** 郵件主題 */
  subject: string;
}

/**
 * 多語言郵件模板配置
 */
export interface MultiLanguageEmailTemplates {
  [language: string]: {
    [emailType in EmailType]: EmailTemplate;
  };
}

/**
 * 取消訂閱回饋郵件特定數據
 */
export interface CancellationFeedbackData {
  /** 用戶名稱 */
  userName: string;
  /** 回饋問卷連結 */
  feedbackUrl?: string;
  /** 重新訂閱連結 */
  resubscribeUrl?: string;
  /** 取消原因（如果用戶提供） */
  cancellationReason?: string;
  /** 自定義內容 */
  customContent?: string;
  /** 其他動態屬性 */
  [key: string]: string | undefined;
}