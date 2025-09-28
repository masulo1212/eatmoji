/**
 * 郵件相關的 Zod 驗證 Schema
 */
import { z } from 'zod';

/**
 * 郵件類型 Schema
 */
export const EmailTypeSchema = z.enum([
  'cancellation_feedback',
  'welcome', 
  'confirmation',
  'notification'
]);

/**
 * 郵件模板數據 Schema
 */
export const EmailTemplateDataSchema = z.object({
  userName: z.string().optional(),
  productName: z.string().optional(),
  cancellationDate: z.string().optional(),
  feedbackUrl: z.string().url().optional(),
  resubscribeUrl: z.string().url().optional(),
  customContent: z.string().optional(),
  cancellationReason: z.string().optional(),
}).catchall(z.any());

/**
 * 郵件發送請求 Schema
 */
export const EmailSendRequestSchema = z.object({
  recipientEmail: z.string().email('無效的郵箱地址'),
  recipientName: z.string().min(1).optional(),
  subject: z.string().min(1, '郵件主題不能為空').max(200, '郵件主題過長'),
  emailType: EmailTypeSchema,
  userLanguage: z.string().default('zh_TW'),
  templateData: EmailTemplateDataSchema.optional(),
});

/**
 * 取消訂閱回饋郵件 Schema
 */
export const CancellationFeedbackEmailSchema = z.object({
  recipientEmail: z.string().email('無效的郵箱地址'),
  recipientName: z.string().min(1, '收件人姓名不能為空'),
  userLanguage: z.string().default('zh_TW'),
  templateData: z.object({
    userName: z.string().min(1, '用戶名稱不能為空'),
    cancellationDate: z.string().min(1, '取消日期不能為空'),
    feedbackUrl: z.string().url('無效的問卷連結').optional(),
    resubscribeUrl: z.string().url('無效的重新訂閱連結').optional(),
    cancellationReason: z.string().optional(),
    customContent: z.string().optional(),
  }).optional(),
});

/**
 * 郵件配置 Schema
 */
export const EmailConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP 主機不能為空'),
  smtpPort: z.number().int().min(1).max(65535, '無效的端口號'),
  smtpSecure: z.boolean(),
  senderEmail: z.string().email('無效的發件人郵箱'),
  senderPassword: z.string().min(1, '發件人密碼不能為空'),
  senderName: z.string().min(1, '發件人姓名不能為空'),
});

/**
 * 郵件發送結果 Schema
 */
export const EmailSendResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
  recipient: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
});

/**
 * 郵件模板 Schema
 */
export const EmailTemplateSchema = z.object({
  html: z.string().min(1, 'HTML 內容不能為空'),
  text: z.string().min(1, '純文字內容不能為空'),
  subject: z.string().min(1, '郵件主題不能為空'),
});

// 導出推斷的類型
export type EmailSendRequestInput = z.infer<typeof EmailSendRequestSchema>;
export type CancellationFeedbackEmailInput = z.infer<typeof CancellationFeedbackEmailSchema>;
export type EmailConfigInput = z.infer<typeof EmailConfigSchema>;
export type EmailSendResultInput = z.infer<typeof EmailSendResultSchema>;
export type EmailTemplateInput = z.infer<typeof EmailTemplateSchema>;