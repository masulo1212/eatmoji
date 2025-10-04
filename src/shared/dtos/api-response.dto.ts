/**
 * 標準 API 響應格式
 * 統一所有 API 端點的響應結構
 */
export class ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;

  constructor(data: T | null = null, error?: string) {
    this.success = !error && data !== null;
    if (data !== null) {
      this.result = data;
    }
    if (error) {
      this.error = error;
    }
  }

  /**
   * 創建成功響應
   */
  static success<T>(data: T): ApiResponse<T> {
    return new ApiResponse(data);
  }

  /**
   * 創建錯誤響應
   */
  static error<T = never>(message: string): ApiResponse<T> {
    return new ApiResponse<T>(null, message);
  }

  /**
   * 檢查是否為成功響應
   */
  isSuccess(): boolean {
    return this.success;
  }

  /**
   * 檢查是否為錯誤響應
   */
  isError(): boolean {
    return !this.success;
  }
}