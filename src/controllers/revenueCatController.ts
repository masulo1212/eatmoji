/**
 * RevenueCat Webhook 控制器 - 使用分層架構模式
 */
import EmailService from "../services/emailService";
import type { CancellationFeedbackData } from "../types/email";
import type { Env } from "../bindings";
import type {
  RevenueCatWebhookEvent,
  RevenueCatWebhookRequest,
  UserCancellationInfo,
  WebhookValidationResult,
} from "../types/revenuecat";

/**
 * API 響應格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * RevenueCat Controller 介面
 */
export interface IRevenueCatController {
  handleWebhook(webhookData: RevenueCatWebhookRequest, env: Env): Promise<ApiResponse>;
}

/**
 * RevenueCat Controller - 處理 RevenueCat Webhook 的業務邏輯
 */
export class RevenueCatController implements IRevenueCatController {
  constructor(private emailService: EmailService) {}

  /**
   * 處理 RevenueCat Webhook 請求
   * @param webhookData Webhook 數據
   * @param env 環境變數
   * @returns API 響應
   */
  async handleWebhook(webhookData: RevenueCatWebhookRequest, env: Env): Promise<ApiResponse> {
    try {
      console.log(
        "收到 RevenueCat Webhook:",
        JSON.stringify(webhookData, null, 2)
      );

      // 驗證 Webhook 數據
      const validation = this.validateWebhook(webhookData);
      if (!validation.isValid) {
        console.error("Webhook 驗證失敗:", validation.error);
        return {
          success: false,
          error: `Webhook validation failed: ${validation.error}`
        };
      }

      const event = validation.event!;

      // 檢查是否為取消訂閱事件
      if (!this.isCancellationEvent(event)) {
        console.log("非取消訂閱事件，跳過處理:", event.type);
        return {
          success: true,
          result: {
            message: "Event processed (not cancellation)",
            eventType: event.type
          }
        };
      }

      // 提取用戶取消資訊
      const cancellationInfo = this.extractCancellationInfo(event);
      console.log("取消訂閱資訊:", cancellationInfo);

      // 過濾沙盒環境（可選）
      if (cancellationInfo.isSandbox && env.ENVIRONMENT === "production") {
        console.log("生產環境跳過沙盒事件");
        return {
          success: true,
          result: {
            message: "Sandbox event skipped in production"
          }
        };
      }

      // 發送取消訂閱回饋郵件
      const emailResult = await this.sendCancellationEmail(
        cancellationInfo,
        env
      );

      if (!emailResult.success) {
        console.error("郵件發送失敗:", emailResult.error);
        // 即使郵件發送失敗，也返回成功以避免 RevenueCat 重複發送
        return {
          success: true,
          result: {
            message: "Webhook processed, email send failed",
            emailError: emailResult.error
          }
        };
      }

      console.log("取消訂閱郵件發送成功");
      return {
        success: true,
        result: {
          message: "Webhook processed successfully",
          emailSent: true
        }
      };
    } catch (error) {
      console.error("Webhook 處理錯誤:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      };
    }
  }

  /**
   * 驗證 Webhook 數據
   * @param webhookData Webhook 數據
   * @returns 驗證結果
   */
  private validateWebhook(
    webhookData: RevenueCatWebhookRequest
  ): WebhookValidationResult {
    try {
      // 檢查基本結構
      if (!webhookData || !webhookData.event) {
        return { isValid: false, error: "缺少事件數據" };
      }

      const event = webhookData.event;

      // 檢查必要欄位
      if (!event.app_user_id || !event.type || !event.product_id) {
        return { isValid: false, error: "缺少必要的事件欄位" };
      }

      // 檢查事件時間戳
      if (!event.event_timestamp_ms || event.event_timestamp_ms <= 0) {
        return { isValid: false, error: "無效的事件時間戳" };
      }

      return { isValid: true, event };
    } catch (error) {
      return {
        isValid: false,
        error: `驗證過程出錯: ${
          error instanceof Error ? error.message : "未知錯誤"
        }`,
      };
    }
  }

  /**
   * 檢查是否為取消訂閱事件
   * @param event RevenueCat 事件
   * @returns 是否為取消訂閱事件
   */
  private isCancellationEvent(event: RevenueCatWebhookEvent): boolean {
    // 檢查事件類型是否為取消
    if (event.type !== "CANCELLATION") {
      return false;
    }

    // 檢查取消原因是否為用戶主動取消
    if (event.cancel_reason !== "UNSUBSCRIBE") {
      console.log(`取消原因不是用戶主動取消: ${event.cancel_reason}`);
      return false;
    }

    return true;
  }

  /**
   * 提取用戶取消資訊
   * @param event RevenueCat 事件
   * @returns 用戶取消資訊
   */
  private extractCancellationInfo(
    event: RevenueCatWebhookEvent
  ): UserCancellationInfo {
    return {
      userId: event.app_user_id,
      userEmail:
        event.subscriber_attributes?.["$email"]?.value ||
        event.subscriber_attributes?.email?.value ||
        undefined,
      cancelReason: event.cancel_reason || "UNKNOWN",
      cancelledAt: new Date(event.event_timestamp_ms),
      expiresAt: new Date(event.expiration_at_ms),
      productId: event.product_id,
      store: event.store,
      isSandbox: event.environment === "SANDBOX" || event.is_sandbox === true,
      subscriberAttributes: event.subscriber_attributes,
    };
  }

  /**
   * 發送取消訂閱回饋郵件
   * @param cancellationInfo 取消資訊
   * @param env 環境變數
   * @returns 郵件發送結果
   */
  private async sendCancellationEmail(
    cancellationInfo: UserCancellationInfo,
    env: Env
  ) {
    // 檢查用戶郵箱
    if (!cancellationInfo.userEmail) {
      console.warn("用戶沒有郵箱地址，跳過發送郵件");
      return { success: false, error: "用戶沒有郵箱地址" };
    }

    // 準備模板數據
    const cancellationData: CancellationFeedbackData = {
      userName: this.extractUserName(cancellationInfo),
      resubscribeUrl: this.generateResubscribeUrl(cancellationInfo, env),
      // customContent: this.generateCustomContent(cancellationInfo),
    };

    // 獲取用戶語言（從用戶屬性或預設為繁體中文）
    const userLanguage = this.extractUserLanguage(cancellationInfo) || "en";

    try {
      // 發送郵件
      const result = await this.emailService.sendCancellationFeedbackEmail(
        cancellationInfo.userEmail,
        cancellationData.userName,
        cancellationData,
        env,
        userLanguage
      );

      return result;
    } catch (error) {
      console.error("郵件發送服務錯誤:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知郵件發送錯誤",
      };
    }
  }

  /**
   * 提取用戶姓名
   * @param cancellationInfo 取消資訊
   * @returns 用戶姓名
   */
  private extractUserName(cancellationInfo: UserCancellationInfo): string {
    const attributes = cancellationInfo.subscriberAttributes;
    if (!attributes) return "用戶";

    // 嘗試從多個可能的屬性中獲取用戶姓名
    const displayName =
      attributes["$displayName"]?.value ||
      attributes["display_name"]?.value ||
      attributes["$userName"]?.value ||
      attributes["user_name"]?.value ||
      attributes["name"]?.value;

    return displayName || "用戶";
  }

  /**
   * 提取用戶語言偏好
   * @param cancellationInfo 取消資訊
   * @returns 語言代碼
   */
  private extractUserLanguage(
    cancellationInfo: UserCancellationInfo
  ): string | undefined {
    const attributes = cancellationInfo.subscriberAttributes;
    if (!attributes) return undefined;

    // 嘗試從多個可能的屬性中獲取語言設定
    const locale =
      attributes["$locale"]?.value ||
      attributes["locale"]?.value ||
      attributes["language"]?.value ||
      attributes["$language"]?.value;

    // 標準化語言代碼並使用包含匹配
    if (locale) {
      const normalizedLocale = locale.toLowerCase().replace(/-/g, "_");

      // 根據您的應用支持的語言進行映射
      const languageMap: Record<string, string> = {
        zh_hant: "zh-TW",
        zh_tw: "zh-TW",
        zh_hans: "zh-CN",
        zh_cn: "zh-CN",
        en_us: "en",
        pt_br: "pt-BR",
        zh: "zh-CN",
        en: "en",
        ja: "ja",
        ko: "ko",
        es: "es",
        fr: "fr",
        de: "de",
        pt: "pt-BR",
        th: "th",
        vi: "vi",
        id: "id",
        ms: "ms",
      };

      // 按具體性排序（從最具體到最一般），進行包含匹配
      const languageKeys = Object.keys(languageMap).sort(
        (a, b) => b.length - a.length
      );

      for (const key of languageKeys) {
        if (normalizedLocale.includes(key)) {
          console.log(
            `語言匹配成功: ${locale} -> ${key} -> ${languageMap[key]}`
          );
          return languageMap[key];
        }
      }

      console.log(`無法匹配語言: ${locale}，使用預設語言`);
    }

    return undefined;
  }

  /**
   * 生成重新訂閱 URL
   * @param cancellationInfo 取消資訊
   * @param env 環境變數
   * @returns 重新訂閱 URL
   */
  private generateResubscribeUrl(
    cancellationInfo: UserCancellationInfo,
    env: Env
  ): string {
    // 從環境變數獲取商店 URL，如果沒有則使用預設值
    const appStoreUrl =
      env.APP_STORE_URL || "https://apps.apple.com/account/subscriptions";
    const playStoreUrl =
      env.PLAY_STORE_URL ||
      "https://play.google.com/store/account/subscriptions";

    // 根據商店類型返回相應的 URL（使用 store 屬性而不是 productId）
    switch (cancellationInfo.store) {
      case "APP_STORE":
      case "MAC_APP_STORE":
        return appStoreUrl;
      case "PLAY_STORE":
        return playStoreUrl;
      case "AMAZON":
        // Amazon Appstore URL (如果需要的話)
        return appStoreUrl; // 預設回退到 App Store
      default:
        console.log(
          `未知的商店類型: ${cancellationInfo.store}，使用預設 App Store URL`
        );
        return appStoreUrl; // 預設為 App Store
    }
  }
}