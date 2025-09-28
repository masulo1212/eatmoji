/**
 * API 重試配置介面
 */
interface RetryConfig {
  maxRetries?: number; // 最大重試次數（預設：3）
  baseDelay?: number; // 基礎延遲時間 ms（預設：1000）
  maxDelay?: number; // 最大延遲時間 ms（預設：10000）
  retryableStatusCodes?: number[]; // 可重試的 HTTP 狀態碼
  timeout?: number; // 請求超時時間 ms（預設：30000）
}

/**
 * 重試統計資訊
 */
interface RetryStats {
  attempt: number;
  totalTime: number;
  lastError?: Error;
  statusCode?: number;
}

/**
 * 請求選項介面
 */
interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * API 重試工具類
 *
 * 專為解決 Gemini API 503 服務不可用錯誤設計：
 * - 指數退避重試策略（1s, 2s, 4s, 8s 間隔）
 * - 智能錯誤分類（暫時性 vs 永久性錯誤）
 * - 超時控制避免無限等待
 * - 併發請求限制
 * - 詳細錯誤日誌和統計資訊
 */
export class ApiRetryUtil {
  // 預設配置
  private static readonly DEFAULT_CONFIG: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelay: 1000, // 1 秒
    maxDelay: 10000, // 10 秒
    retryableStatusCodes: [429, 500, 502, 503, 504, 520, 521, 522, 524],
    timeout: 30000, // 30 秒
  };

  // 併發控制
  private static activeRequests = new Map<string, number>();
  private static readonly MAX_CONCURRENT_REQUESTS = 5;

  /**
   * 帶重試機制的 fetch 請求
   * @param url 請求 URL
   * @param options 請求選項
   * @param config 重試配置
   * @returns Promise<Response>
   */
  static async fetchWithRetry(
    url: string,
    options: FetchOptions = {},
    config: RetryConfig = {}
  ): Promise<Response> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const requestId = this.generateRequestId(url, options);

    // 併發控制
    await this.waitForSlot(requestId);

    try {
      return await this.attemptRequest(url, options, finalConfig, requestId);
    } finally {
      this.releaseSlot(requestId);
    }
  }

  /**
   * 執行帶重試的請求
   * @param url 請求 URL
   * @param options 請求選項
   * @param config 重試配置
   * @param requestId 請求 ID
   * @returns Promise<Response>
   */
  private static async attemptRequest(
    url: string,
    options: FetchOptions,
    config: Required<RetryConfig>,
    requestId: string
  ): Promise<Response> {
    const stats: RetryStats = {
      attempt: 0,
      totalTime: 0,
    };

    const startTime = Date.now();

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      stats.attempt = attempt + 1;
      stats.totalTime = Date.now() - startTime;

      try {
        console.log(
          `🔄 API 請求嘗試 ${stats.attempt}/${config.maxRetries + 1}: ${url}`
        );

        // 創建 AbortController 用於超時控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const requestOptions: RequestInit = {
          ...options,
          signal: controller.signal,
        };

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // 檢查是否為可重試的錯誤
        if (response.ok || !this.isRetryableError(response.status, config)) {
          // 成功或不可重試的錯誤
          if (response.ok) {
            console.log(
              `✅ API 請求成功 (嘗試 ${stats.attempt}): ${response.status}`
            );
          } else {
            console.log(`❌ API 請求失敗 (不可重試): ${response.status}`);
          }

          stats.totalTime = Date.now() - startTime;
          this.logStats(requestId, stats, response.status, true);
          return response;
        }

        // 可重試的錯誤
        stats.statusCode = response.status;
        stats.lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );

        console.warn(
          `⚠️ API 請求失敗 (可重試): ${response.status} ${response.statusText}`
        );

        // 如果不是最後一次嘗試，則等待後重試
        if (attempt < config.maxRetries) {
          const delay = this.calculateDelay(attempt, config);
          console.log(`⏳ 等待 ${delay}ms 後重試...`);
          await this.sleep(delay);
        }
      } catch (error) {
        const errorInstance = error as Error;
        stats.lastError = errorInstance;

        // 檢查是否為超時錯誤
        if (errorInstance.name === "AbortError") {
          console.error(`⏰ API 請求超時 (${config.timeout}ms): ${url}`);
          stats.lastError = new Error(`請求超時 (${config.timeout}ms)`);
        } else {
          console.error(`❌ API 請求錯誤: ${errorInstance.message}`);
        }

        // 網路錯誤通常可以重試
        if (attempt < config.maxRetries) {
          const delay = this.calculateDelay(attempt, config);
          console.log(`⏳ 網路錯誤，等待 ${delay}ms 後重試...`);
          await this.sleep(delay);
        }
      }
    }

    // 所有重試都失敗了
    stats.totalTime = Date.now() - startTime;
    this.logStats(requestId, stats, stats.statusCode, false);

    const finalError = new Error(
      `API 請求失敗: ${config.maxRetries + 1} 次嘗試後仍然失敗。` +
        `最後錯誤: ${stats.lastError?.message || "未知錯誤"}`
    );

    throw finalError;
  }

  /**
   * 檢查是否為可重試的錯誤
   * @param statusCode HTTP 狀態碼
   * @param config 重試配置
   * @returns boolean 是否可重試
   */
  private static isRetryableError(
    statusCode: number,
    config: Required<RetryConfig>
  ): boolean {
    // 特殊處理一些常見的錯誤碼
    switch (statusCode) {
      case 400: // Bad Request - 通常不可重試
      case 401: // Unauthorized - 通常不可重試
      case 403: // Forbidden - 通常不可重試
      case 404: // Not Found - 通常不可重試
        return false;

      case 429: // Too Many Requests - 可重試
      case 503: // Service Unavailable - 可重試（這是我們的主要目標）
        return true;

      default:
        return config.retryableStatusCodes.includes(statusCode);
    }
  }

  /**
   * 計算延遲時間（指數退避）
   * @param attempt 嘗試次數
   * @param config 重試配置
   * @returns number 延遲時間 ms
   */
  private static calculateDelay(
    attempt: number,
    config: Required<RetryConfig>
  ): number {
    // 指數退避：baseDelay * 2^attempt + 隨機抖動
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);

    // 添加隨機抖動（±25%）以避免驚群效應
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const delayWithJitter = exponentialDelay + jitter;

    // 限制最大延遲時間
    return Math.min(delayWithJitter, config.maxDelay);
  }

  /**
   * 等待指定時間
   * @param ms 毫秒數
   * @returns Promise<void>
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 併發控制：等待可用槽位
   * @param requestId 請求 ID
   */
  private static async waitForSlot(requestId: string): Promise<void> {
    const domain = this.extractDomain(requestId);
    const currentCount = this.activeRequests.get(domain) || 0;

    if (currentCount >= this.MAX_CONCURRENT_REQUESTS) {
      console.log(`🚦 API 併發限制，等待可用槽位... (當前: ${currentCount})`);

      // 等待直到有槽位可用
      while (
        (this.activeRequests.get(domain) || 0) >= this.MAX_CONCURRENT_REQUESTS
      ) {
        await this.sleep(100); // 等待 100ms 後重新檢查
      }
    }

    // 佔用槽位
    this.activeRequests.set(domain, (this.activeRequests.get(domain) || 0) + 1);
  }

  /**
   * 釋放槽位
   * @param requestId 請求 ID
   */
  private static releaseSlot(requestId: string): void {
    const domain = this.extractDomain(requestId);
    const currentCount = this.activeRequests.get(domain) || 0;

    if (currentCount > 0) {
      this.activeRequests.set(domain, currentCount - 1);
    }

    if (this.activeRequests.get(domain) === 0) {
      this.activeRequests.delete(domain);
    }
  }

  /**
   * 生成請求 ID
   * @param url 請求 URL
   * @param options 請求選項
   * @returns string 請求 ID
   */
  private static generateRequestId(url: string, options: FetchOptions): string {
    const method = options.method || "GET";
    return `${method}:${url}`;
  }

  /**
   * 從請求 ID 提取域名
   * @param requestId 請求 ID
   * @returns string 域名
   */
  private static extractDomain(requestId: string): string {
    try {
      const url = requestId.split(":").slice(1).join(":");
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  }

  /**
   * 記錄統計資訊
   * @param requestId 請求 ID
   * @param stats 統計資訊
   * @param statusCode 狀態碼
   * @param success 是否成功
   */
  private static logStats(
    requestId: string,
    stats: RetryStats,
    statusCode?: number,
    success?: boolean
  ): void {
    const domain = this.extractDomain(requestId);

    console.log(`📊 API 請求統計 [${domain}]:`, {
      嘗試次數: stats.attempt,
      總耗時: `${stats.totalTime}ms`,
      狀態碼: statusCode,
      結果: success ? "成功" : "失敗",
      最後錯誤: stats.lastError?.message,
    });
  }

  /**
   * 獲取當前併發統計
   * @returns object 併發統計
   */
  static getConcurrencyStats(): Record<string, number> {
    return Object.fromEntries(this.activeRequests);
  }

  /**
   * 清除所有併發計數（用於測試）
   */
  static clearConcurrencyStats(): void {
    this.activeRequests.clear();
  }

  /**
   * 創建 Gemini API 專用的重試配置
   * @returns RetryConfig Gemini 專用配置
   */
  static createGeminiConfig(): RetryConfig {
    return {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      timeout: 35000, // Gemini API 稍短的超時時間
    };
  }

  /**
   * 創建 Vertex AI 專用的重試配置
   * @returns RetryConfig Vertex AI 專用配置
   */
  static createVertexAIConfig(): RetryConfig {
    return {
      maxRetries: 2, // Vertex AI 通常更穩定，減少重試次數
      baseDelay: 2000,
      maxDelay: 10000,
      retryableStatusCodes: [429, 500, 502, 503, 504, 524],
      timeout: 50000, // 更長的超時時間
    };
  }
}
