/**
 * RevenueCat Webhook 事件類型定義
 */

/**
 * RevenueCat Webhook 事件類型
 */
export type RevenueCatEventType = 
  | 'INITIAL_PURCHASE'
  | 'NON_RENEWING_PURCHASE' 
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TEST';

/**
 * 取消原因類型
 */
export type CancelReason = 
  | 'UNSUBSCRIBE'           // 用戶主動取消 (我們最關注的)
  | 'BILLING_ERROR'         // 付款失敗
  | 'DEVELOPER_INITIATED'   // 開發者取消
  | 'PRICE_INCREASE'        // 價格上漲拒絕
  | 'CUSTOMER_SUPPORT'      // 客服退款
  | 'UNKNOWN';              // 未知原因

/**
 * RevenueCat Webhook 事件基礎結構
 */
export interface RevenueCatWebhookEvent {
  /** 事件類型 */
  type: RevenueCatEventType;
  
  /** 事件時間戳 (毫秒) */
  event_timestamp_ms: number;
  
  /** 應用用戶 ID */
  app_user_id: string;
  
  /** 原始應用用戶 ID */
  original_app_user_id: string;
  
  /** 產品 ID */
  product_id: string;
  
  /** 期間類型 */
  period_type: 'NORMAL' | 'TRIAL' | 'INTRO';
  
  /** 購買日期 (ISO 8601) */
  purchased_at_ms: number;
  
  /** 過期日期 (毫秒) */
  expiration_at_ms: number;
  
  /** 環境 */
  environment: 'SANDBOX' | 'PRODUCTION';
  
  /** 權益名稱 */
  entitlement_id?: string;
  
  /** 權益 ID 列表 */
  entitlement_ids?: string[];
  
  /** 展示的產品組合 ID */
  presented_offering_id?: string;
  
  /** 交易 ID */
  transaction_id: string;
  
  /** 原始交易 ID */
  original_transaction_id: string;
  
  /** 商店 */
  store: 'APP_STORE' | 'MAC_APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL' | 'AMAZON' | 'RC_BILLING';
  
  /** 取消原因 (僅 CANCELLATION 事件) */
  cancel_reason?: CancelReason;
  
  /** 是否為家庭共享 */
  is_family_share?: boolean;
  
  /** 國家代碼 */
  country_code?: string;
  
  /** 應用 ID */
  app_id: string;
  
  /** 訂閱者屬性 */
  subscriber_attributes?: Record<string, any>;
  
  /** 價格 */
  price?: number;
  
  /** 價格字符串 */
  price_string?: string;
  
  /** 貨幣 */
  currency?: string;
  
  /** 稅額 */
  tax_percentage?: number;
  
  /** 佣金百分比 */
  commission_percentage?: number;
  
  /** 是否沙盒環境 */
  is_sandbox?: boolean;
}

/**
 * RevenueCat Webhook 請求結構
 */
export interface RevenueCatWebhookRequest {
  /** 事件數據 */
  event: RevenueCatWebhookEvent;
}

/**
 * RevenueCat Webhook 驗證結果
 */
export interface WebhookValidationResult {
  /** 是否驗證成功 */
  isValid: boolean;
  
  /** 錯誤訊息 */
  error?: string;
  
  /** 事件數據 (如果驗證成功) */
  event?: RevenueCatWebhookEvent;
}

/**
 * 用戶取消訂閱資訊
 */
export interface UserCancellationInfo {
  /** 用戶 ID */
  userId: string;
  
  /** 用戶郵箱 (如果可用) */
  userEmail?: string;
  
  /** 取消原因 */
  cancelReason: CancelReason;
  
  /** 取消時間 */
  cancelledAt: Date;
  
  /** 訂閱過期時間 */
  expiresAt: Date;
  
  /** 產品 ID */
  productId: string;
  
  /** 商店類型 */
  store: string;
  
  /** 是否為沙盒環境 */
  isSandbox: boolean;
  
  /** 訂閱者屬性 (完整的 RevenueCat 用戶屬性) */
  subscriberAttributes?: Record<string, any>;
}