/**
 * 郵件發送服務
 */
import * as nodemailer from "nodemailer";
import {
  getEmailTemplate,
  processTemplate,
} from "../utils/emailTemplates";
import type {
  CancellationFeedbackData,
  EmailConfig,
  EmailSendRequest,
  EmailSendResult,
  EmailTemplate,
  EmailType,
} from "../types/email";
import type { Env } from "../bindings";

/**
 * 郵件服務類
 */
export default class EmailService {
  /**
   * 從環境變數獲取郵件配置
   * @param env 環境變數
   * @returns 郵件配置
   */
  private getEmailConfig(env: Env): EmailConfig {
    return {
      smtpHost: env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: parseInt(env.SMTP_PORT || "587"),
      smtpSecure: env.SMTP_SECURE === "true" || false,
      senderEmail: env.SENDER_EMAIL || "",
      senderPassword: env.SENDER_APP_PASSWORD || "",
      smtpAuthUser: env.SMTP_AUTH_USER || env.SENDER_EMAIL || "",
      senderName: env.SENDER_NAME || "Eatmoji",
    };
  }

  /**
   * 創建 nodemailer 傳輸器
   * @param config 郵件配置
   * @returns nodemailer 傳輸器
   */
  private createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpAuthUser,
        pass: config.senderPassword,
      },
    });
  }

  /**
   * 獲取郵件模板
   * @param emailType 郵件類型
   * @param language 語言
   * @param data 模板數據
   * @returns 郵件模板
   */
  private getEmailTemplate(
    emailType: EmailType,
    language: string = "zh_TW",
    data: any = {}
  ): EmailTemplate {
    switch (emailType) {
      case "cancellation_feedback":
        return this.getCancellationFeedbackTemplate(
          language,
          data as CancellationFeedbackData
        );

      default:
        throw new Error(`不支援的郵件類型: ${emailType}`);
    }
  }

  /**
   * 取消訂閱回饋郵件模板
   * @param language 語言
   * @param data 模板數據
   * @returns 郵件模板
   */
  private getCancellationFeedbackTemplate(
    language: string,
    data: CancellationFeedbackData
  ): EmailTemplate {
    // 從模板系統獲取模板
    const template = getEmailTemplate(language, "cancellation");

    if (!template) {
      // 回退到英文模板
      const englishTemplate = getEmailTemplate("en", "cancellation");
      if (!englishTemplate) {
        throw new Error("無法獲取郵件模板");
      }

      const processedContent = processTemplate(englishTemplate.content, {
        userName: data.userName,
        // cancellationDate: data.cancellationDate,
        resubscribeUrl: data.resubscribeUrl,
        customContent: data.customContent,
      });

      return {
        subject: englishTemplate.subject,
        html: processedContent, // 現在只使用純文字
        text: processedContent,
      };
    }

    // 處理模板變數
    const processedContent = processTemplate(template.content, {
      userName: data.userName,
      // cancellationDate: data.cancellationDate,
      resubscribeUrl: data.resubscribeUrl,
      customContent: data.customContent,
    });

    return {
      subject: template.subject,
      html: processedContent, // 現在只使用純文字
      text: processedContent,
    };
  }

  /**
   * 發送郵件
   * @param request 郵件發送請求
   * @param env 環境變數
   * @returns 發送結果
   */
  async sendEmail(
    request: EmailSendRequest,
    env: Env
  ): Promise<EmailSendResult> {
    try {
      // 獲取郵件配置
      const config = this.getEmailConfig(env);

      // 驗證必要的環境變數
      if (!config.senderEmail || !config.senderPassword) {
        throw new Error(
          "缺少必要的 SMTP 配置：SENDER_EMAIL 或 SENDER_APP_PASSWORD"
        );
      }

      // 創建傳輸器
      const transporter = this.createTransporter(config);

      // 獲取郵件模板
      const template = this.getEmailTemplate(
        request.emailType,
        request.userLanguage,
        request.templateData
      );

      // 郵件選項（僅發送純文字版本）
      const mailOptions = {
        from: {
          name: config.senderName,
          address: config.senderEmail,
        },
        to: request.recipientName
          ? {
              name: request.recipientName,
              address: request.recipientEmail,
            }
          : request.recipientEmail,
        subject: request.subject || template.subject,
        text: template.text,
        // 移除 HTML 版本，只發送純文字
      };

      // 發送郵件
      const info = await transporter.sendMail(mailOptions);

      // 返回成功結果
      return {
        success: true,
        messageId: (info as any)?.messageId || "unknown",
        timestamp: new Date().toISOString(),
        recipient: {
          email: request.recipientEmail,
          name: request.recipientName,
        },
      };
    } catch (error) {
      console.error("郵件發送失敗:", error);

      // 返回失敗結果
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知錯誤",
        timestamp: new Date().toISOString(),
        recipient: {
          email: request.recipientEmail,
          name: request.recipientName,
        },
      };
    }
  }

  /**
   * 發送取消訂閱回饋郵件（便捷方法）
   * @param recipientEmail 收件人郵箱
   * @param recipientName 收件人姓名
   * @param cancellationData 取消訂閱數據
   * @param env 環境變數
   * @returns 發送結果
   */
  async sendCancellationFeedbackEmail(
    recipientEmail: string,
    recipientName: string,
    cancellationData: CancellationFeedbackData,
    env: Env,
    userLanguage: string = "zh_TW"
  ): Promise<EmailSendResult> {
    const request: EmailSendRequest = {
      recipientEmail,
      recipientName,
      subject: "", // 使用模板預設主題
      emailType: "cancellation_feedback",
      userLanguage,
      templateData: cancellationData,
    };

    return await this.sendEmail(request, env);
  }
}