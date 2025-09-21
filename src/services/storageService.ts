import {
  ImageUploadResult,
  MultipleImageUploadResult,
  ImageProcessingError,
} from '../types/image';

/**
 * Firebase Storage metadata 回應介面
 */
interface FirebaseStorageMetadata {
  downloadTokens: string;
  name: string;
  bucket: string;
  generation?: string;
  metageneration?: string;
  contentType?: string;
  timeCreated?: string;
  updated?: string;
  size?: string;
}

/**
 * Firebase OAuth token 回應介面
 */
interface FirebaseOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Firebase Storage 配置介面
 */
export interface FirebaseStorageConfig {
  /** Firebase 專案 ID */
  projectId: string;
  /** Storage bucket 名稱，預設為 {projectId}.appspot.com */
  bucketName?: string;
  /** Service Account 私鑰（用於 JWT 簽名） */
  privateKey: string;
  /** Service Account Email */
  clientEmail: string;
}

/**
 * Firebase Storage 服務介面
 */
export interface IStorageService {
  /**
   * 上傳單張圖片到 Firebase Storage
   * @param userId 使用者 ID
   * @param imageData 圖片資料
   * @param filename 自訂檔名（可選）
   * @returns 上傳結果包含 URL
   */
  uploadSingleImage(
    userId: string,
    imageData: Uint8Array,
    filename?: string
  ): Promise<ImageUploadResult>;

  /**
   * 上傳多張圖片到 Firebase Storage
   * @param userId 使用者 ID
   * @param imagesData 圖片資料陣列
   * @returns 多張圖片上傳結果
   */
  uploadMultipleImages(
    userId: string,
    imagesData: Uint8Array[]
  ): Promise<MultipleImageUploadResult>;

  /**
   * 刪除 Storage 中的圖片
   * @param filePath 檔案路徑
   * @returns 是否刪除成功
   */
  deleteImage(filePath: string): Promise<boolean>;
}

/**
 * Firebase Storage 服務實作
 * 使用 Firebase Storage REST API 處理圖片上傳
 */
export class FirebaseStorageService implements IStorageService {
  private config: FirebaseStorageConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: FirebaseStorageConfig) {
    this.config = {
      ...config,
      bucketName: config.bucketName || `${config.projectId}.appspot.com`,
    };
  }

  /**
   * 上傳單張圖片
   * 對應 Flutter uploadImage 方法的邏輯
   */
  async uploadSingleImage(
    userId: string,
    imageData: Uint8Array,
    filename?: string
  ): Promise<ImageUploadResult> {
    try {
      const fileName = filename || this.generateFileName();
      const filePath = this.buildFilePath(userId, fileName);
      
      const originalSize = imageData.length;
      
      // 執行上傳
      const downloadURL = await this.uploadFile(filePath, imageData);
      
      return {
        url: downloadURL,
        originalSize,
        compressedSize: imageData.length,
        compressionRatio: 1, // 在這階段已經是壓縮後的資料
      };

    } catch (error) {
      console.error('上傳單張圖片失敗:', error);
      throw new Error(`${ImageProcessingError.UPLOAD_FAILED}: ${error}`);
    }
  }

  /**
   * 上傳多張圖片
   * 對應 Flutter _uploadImages 方法的邏輯
   */
  async uploadMultipleImages(
    userId: string,
    imagesData: Uint8Array[]
  ): Promise<MultipleImageUploadResult> {
    const successResults: ImageUploadResult[] = [];
    const failedResults: { index: number; error: string }[] = [];

    // 並行上傳所有圖片
    const uploadPromises = imagesData.map(async (imageData, index) => {
      try {
        const fileName = this.generateFileName(index);
        const result = await this.uploadSingleImage(userId, imageData, fileName);
        successResults.push(result);
      } catch (error) {
        console.error(`上傳第 ${index} 張圖片失敗:`, error);
        failedResults.push({
          index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // 等待所有上傳完成
    await Promise.allSettled(uploadPromises);

    return {
      successResults,
      failedResults,
      successCount: successResults.length,
      failedCount: failedResults.length,
    };
  }

  /**
   * 刪除 Storage 中的圖片
   */
  async deleteImage(filePath: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const url = this.buildStorageURL(filePath);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(`刪除圖片失敗: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;

    } catch (error) {
      console.error('刪除圖片時發生錯誤:', error);
      return false;
    }
  }

  /**
   * 上傳檔案到 Firebase Storage
   */
  private async uploadFile(filePath: string, data: Uint8Array): Promise<string> {
    try {
      console.log(`🔄 開始上傳檔案: ${filePath}`);
      console.log(`📁 Bucket: ${this.config.bucketName}`);
      console.log(`📦 檔案大小: ${data.length} bytes`);

      const token = await this.getAccessToken();
      const uploadURL = this.buildUploadURL(filePath);
      
      console.log(`🌐 上傳 URL: ${uploadURL}`);
      console.log(`🔑 認證 Token 前 20 字元: ${token.substring(0, 20)}...`);

      // 上傳檔案
      const uploadResponse = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/png',
        },
        body: data,
      });

      console.log(`📡 上傳響應狀態: ${uploadResponse.status}`);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`❌ 上傳失敗詳情:`);
        console.error(`  狀態碼: ${uploadResponse.status}`);
        console.error(`  狀態文字: ${uploadResponse.statusText}`);
        console.error(`  響應內容: ${errorText}`);
        console.error(`  上傳 URL: ${uploadURL}`);
        throw new Error(`上傳失敗: ${uploadResponse.status} ${errorText}`);
      }

      console.log(`✅ 檔案上傳成功，開始取得下載 URL`);

      // 取得下載 URL
      const downloadURL = await this.getDownloadURL(filePath);
      console.log(`🔗 取得下載 URL: ${downloadURL}`);
      return downloadURL;

    } catch (error) {
      console.error('❌ 檔案上傳失敗:', error);
      throw error;
    }
  }

  /**
   * 取得檔案的下載 URL
   */
  private async getDownloadURL(filePath: string): Promise<string> {
    try {
      console.log(`🔍 取得檔案 metadata: ${filePath}`);
      
      const token = await this.getAccessToken();
      const metadataURL = this.buildStorageURL(filePath);
      
      console.log(`🌐 Metadata URL: ${metadataURL}`);

      const response = await fetch(metadataURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`📡 Metadata 響應狀態: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 取得 metadata 失敗詳情:`);
        console.error(`  狀態碼: ${response.status}`);
        console.error(`  狀態文字: ${response.statusText}`);
        console.error(`  響應內容: ${errorText}`);
        console.error(`  Metadata URL: ${metadataURL}`);
        throw new Error(`取得下載 URL 失敗: ${response.status} - ${errorText}`);
      }

      const metadata = await response.json() as FirebaseStorageMetadata;
      console.log(`📋 Metadata:`, JSON.stringify(metadata, null, 2));
      
      // 驗證回應資料
      if (!metadata.downloadTokens) {
        console.error(`❌ Firebase Storage metadata 缺少 downloadTokens`);
        throw new Error('Firebase Storage metadata 缺少 downloadTokens');
      }
      
      // 建構下載 URL
      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${this.config.bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${metadata.downloadTokens}`;
      
      console.log(`✅ 成功建構下載 URL`);
      return downloadURL;

    } catch (error) {
      console.error('❌ 取得下載 URL 失敗:', error);
      throw error;
    }
  }

  /**
   * 取得 Firebase 存取權杖
   */
  private async getAccessToken(): Promise<string> {
    // 檢查是否有有效的 token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      console.log(`🔄 使用現有的 access token`);
      return this.accessToken;
    }

    try {
      console.log(`🔑 開始取得新的 access token`);
      console.log(`📧 Service Account Email: ${this.config.clientEmail}`);
      console.log(`🏗️ Project ID: ${this.config.projectId}`);

      // 建立 JWT
      const jwt = await this.createJWT();
      console.log(`📋 JWT 建立成功，長度: ${jwt.length} 字元`);
      
      // 交換存取權杖
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      console.log(`📡 OAuth 響應狀態: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OAuth token 取得失敗詳情:`);
        console.error(`  狀態碼: ${response.status}`);
        console.error(`  狀態文字: ${response.statusText}`);
        console.error(`  響應內容: ${errorText}`);
        throw new Error(`OAuth token 取得失敗: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json() as FirebaseOAuthTokenResponse;
      console.log(`📊 Token 資料:`, {
        has_access_token: !!tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      });
      
      // 驗證回應資料
      if (!tokenData.access_token || !tokenData.expires_in) {
        console.error(`❌ OAuth 回應格式錯誤：缺少必要欄位`);
        throw new Error('OAuth 回應格式錯誤：缺少必要欄位');
      }
      
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000; // 提前 60 秒過期

      // 確保 accessToken 不為 null
      if (!this.accessToken) {
        throw new Error('取得存取權杖失敗');
      }

      console.log(`✅ Access token 取得成功，有效期至: ${new Date(this.tokenExpiry).toISOString()}`);
      return this.accessToken;

    } catch (error) {
      console.error('❌ 取得存取權杖失敗:', error);
      throw error;
    }
  }

  /**
   * 建立 JWT 用於身份驗證
   */
  private async createJWT(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.config.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // 使用 WebCrypto API 進行 RSA 簽名
    const privateKey = await this.importPrivateKey(this.config.privateKey);
    const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerBase64}.${payloadBase64}`;

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(unsignedToken)
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${unsignedToken}.${signatureBase64}`;
  }

  /**
   * 匯入私鑰用於 JWT 簽名
   */
  private async importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
    // 移除 PEM 格式的標頭和標尾
    const pemContents = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const binaryDer = atob(pemContents);
    const keyData = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) {
      keyData[i] = binaryDer.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  }

  /**
   * 建構檔案路徑
   * 對應 Flutter 的路徑格式：users/{userId}/{filename}
   */
  private buildFilePath(userId: string, fileName: string): string {
    return `users/${userId}/${fileName}`;
  }

  /**
   * 產生檔名
   * 對應 Flutter 的檔名格式：{timestamp}.png 或 {timestamp}_{index}.png
   */
  private generateFileName(index?: number): string {
    const timestamp = Date.now();
    const suffix = index !== undefined ? `_${index}` : '';
    return `${timestamp}${suffix}.png`;
  }

  /**
   * 建構上傳 URL
   */
  private buildUploadURL(filePath: string): string {
    const encodedPath = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${this.config.bucketName}/o?uploadType=media&name=${encodedPath}`;
  }

  /**
   * 建構 Storage URL
   */
  private buildStorageURL(filePath: string): string {
    const encodedPath = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${this.config.bucketName}/o/${encodedPath}`;
  }
}