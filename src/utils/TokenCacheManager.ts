import type { Env } from "../bindings";

/**
 * 快取的 Token 資料結構
 */
interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

/**
 * JWT Payload 介面
 */
interface JWTPayload {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * OAuth Token 快取管理器
 * 
 * 專為 Cloudflare Workers 付費方案優化，解決 Vertex AI 524 超時問題：
 * - 利用記憶體快取 Access Token（1小時有效期）
 * - 預處理和快取 JWT 簽名金鑰，避免重複解析
 * - 背景自動刷新機制，提前 5 分鐘刷新 token
 * - 使用 Web Crypto API 提升簽名性能 >100ms
 */
export class TokenCacheManager {
  // 靜態快取，利用 Worker 記憶體空間
  private static tokenCache = new Map<string, CachedToken>();
  private static signingKeyCache: CryptoKey | null = null;
  private static keyFingerprint: string | null = null;

  // 常數設定
  private static readonly TOKEN_EXPIRES_BUFFER = 5 * 60 * 1000; // 5分鐘緩衝時間
  private static readonly OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private static readonly VERTEX_AI_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

  /**
   * 獲取 Access Token（主要入口點）
   * @param env 環境變數
   * @returns Promise<string> Access Token
   */
  static async getAccessToken(env: Env): Promise<string> {
    const cacheKey = this.generateCacheKey(env);
    const cachedToken = this.tokenCache.get(cacheKey);

    // 檢查快取是否有效
    if (cachedToken && this.isTokenValid(cachedToken)) {
      console.log("✅ TokenCache: 使用快取的 Access Token");
      return cachedToken.accessToken;
    }

    console.log("🔄 TokenCache: 生成新的 Access Token");
    
    // 生成新 token
    const newToken = await this.generateAccessToken(env);
    
    // 快取新 token
    this.tokenCache.set(cacheKey, newToken);
    
    return newToken.accessToken;
  }

  /**
   * 預先獲取 Token（背景任務）
   * @param env 環境變數
   * @param ctx Cloudflare Worker Context（用於 waitUntil）
   */
  static async preloadToken(env: Env, ctx?: ExecutionContext): Promise<void> {
    if (ctx) {
      // 使用 waitUntil 進行背景預載入
      ctx.waitUntil(this.getAccessToken(env));
    } else {
      // 同步預載入
      await this.getAccessToken(env);
    }
  }

  /**
   * 檢查是否需要刷新 Token
   * @param env 環境變數
   * @returns boolean 是否需要刷新
   */
  static shouldRefreshToken(env: Env): boolean {
    const cacheKey = this.generateCacheKey(env);
    const cachedToken = this.tokenCache.get(cacheKey);

    if (!cachedToken) return true;

    // 檢查是否在緩衝時間內（提前 5 分鐘刷新）
    const now = Date.now();
    const refreshTime = cachedToken.expiresAt - this.TOKEN_EXPIRES_BUFFER;
    
    return now >= refreshTime;
  }

  /**
   * 背景刷新 Token（非阻塞）
   * @param env 環境變數
   * @param ctx Cloudflare Worker Context
   */
  static scheduleTokenRefresh(env: Env, ctx: ExecutionContext): void {
    if (this.shouldRefreshToken(env)) {
      console.log("🔄 TokenCache: 排程背景 Token 刷新");
      ctx.waitUntil(this.getAccessToken(env));
    }
  }

  /**
   * 生成新的 Access Token
   * @param env 環境變數
   * @returns Promise<CachedToken>
   */
  private static async generateAccessToken(env: Env): Promise<CachedToken> {
    // 1. 獲取或創建簽名金鑰
    const signingKey = await this.getSigningKey(env);
    
    // 2. 創建 JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: this.VERTEX_AI_SCOPE,
      aud: this.OAUTH_TOKEN_URL,
      exp: now + 3600, // 1 小時後過期
      iat: now,
    };

    // 3. 生成 JWT
    const jwt = await this.createJWT(payload, signingKey);
    
    // 4. 交換 Access Token
    const tokenResponse = await this.exchangeJWTForToken(jwt);
    
    // 5. 返回快取格式
    return {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      scope: this.VERTEX_AI_SCOPE,
    };
  }

  /**
   * 獲取或創建簽名金鑰（快取優化）
   * @param env 環境變數
   * @returns Promise<CryptoKey>
   */
  private static async getSigningKey(env: Env): Promise<CryptoKey> {
    const currentFingerprint = this.generateKeyFingerprint(env.FIREBASE_PRIVATE_KEY);
    
    // 檢查快取的金鑰是否仍然有效
    if (this.signingKeyCache && this.keyFingerprint === currentFingerprint) {
      console.log("✅ TokenCache: 使用快取的簽名金鑰");
      return this.signingKeyCache;
    }

    console.log("🔄 TokenCache: 生成新的簽名金鑰");
    
    // 解析 Private Key
    const keyData = this.parsePrivateKey(env.FIREBASE_PRIVATE_KEY);
    
    // 使用 Web Crypto API 創建簽名金鑰（優化性能）
    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // 快取金鑰和指紋
    this.signingKeyCache = signingKey;
    this.keyFingerprint = currentFingerprint;
    
    return signingKey;
  }

  /**
   * 創建 JWT Token
   * @param payload JWT Payload
   * @param signingKey 簽名金鑰
   * @returns Promise<string> JWT Token
   */
  private static async createJWT(payload: JWTPayload, signingKey: CryptoKey): Promise<string> {
    // JWT Header
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    // Base64URL 編碼
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // 使用 Web Crypto API 簽名（性能優化）
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      signingKey,
      new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = this.base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    );

    return `${unsignedToken}.${encodedSignature}`;
  }

  /**
   * 使用 JWT 交換 Access Token
   * @param jwt JWT Token
   * @returns Promise<{access_token: string, expires_in: number}>
   */
  private static async exchangeJWTForToken(jwt: string): Promise<{access_token: string, expires_in: number}> {
    const response = await fetch(this.OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token 獲取失敗: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  /**
   * 解析 Private Key
   * @param privateKeyStr Private Key 字串
   * @returns ArrayBuffer
   */
  private static parsePrivateKey(privateKeyStr: string): ArrayBuffer {
    try {
      if (!privateKeyStr || typeof privateKeyStr !== "string") {
        throw new Error("Private Key 不存在或格式不正確");
      }

      // 移除 PEM 格式標頭和清理內容
      let pemContent = privateKeyStr
        .replace(/-----BEGIN[^-]*-----/g, "")
        .replace(/-----END[^-]*-----/g, "")
        .replace(/\\n/g, "")
        .replace(/\\r/g, "")
        .replace(/\\t/g, "")
        .replace(/\s/g, "")
        .replace(/\n/g, "")
        .replace(/\r/g, "");

      if (!pemContent) {
        throw new Error("Private Key 內容為空");
      }

      // 確保 base64 長度是 4 的倍數
      while (pemContent.length % 4 !== 0) {
        pemContent += "=";
      }

      // Base64 解碼
      const binaryString = atob(pemContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes.buffer;
    } catch (error) {
      console.error("Private Key 解析失敗:", error);
      throw new Error(`Firebase Private Key 解析失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
    }
  }

  /**
   * Base64URL 編碼
   * @param str 字串
   * @returns string Base64URL 編碼結果
   */
  private static base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * 生成快取鍵
   * @param env 環境變數
   * @returns string 快取鍵
   */
  private static generateCacheKey(env: Env): string {
    return `${env.FIREBASE_PROJECT_ID}:${env.FIREBASE_CLIENT_EMAIL}:${this.VERTEX_AI_SCOPE}`;
  }

  /**
   * 生成金鑰指紋
   * @param privateKey Private Key
   * @returns string 金鑰指紋
   */
  private static generateKeyFingerprint(privateKey: string): string {
    // 使用 private key 的前 100 個字符作為指紋
    return privateKey.substring(0, 100);
  }

  /**
   * 檢查 Token 是否有效
   * @param token 快取的 Token
   * @returns boolean 是否有效
   */
  private static isTokenValid(token: CachedToken): boolean {
    const now = Date.now();
    return now < (token.expiresAt - this.TOKEN_EXPIRES_BUFFER);
  }

  /**
   * 清除快取（用於測試或重置）
   */
  static clearCache(): void {
    this.tokenCache.clear();
    this.signingKeyCache = null;
    this.keyFingerprint = null;
    console.log("🧹 TokenCache: 快取已清除");
  }

  /**
   * 獲取快取統計資訊
   * @returns object 快取統計
   */
  static getCacheStats(): {tokenCount: number, hasSigningKey: boolean} {
    return {
      tokenCount: this.tokenCache.size,
      hasSigningKey: this.signingKeyCache !== null,
    };
  }
}