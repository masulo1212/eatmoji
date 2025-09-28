import type { Env } from "../bindings";
import { ImageAnalysisResult, RecipeAnalysisResult } from "../types/analyze";
import {
  AddIngredientResult,
  AddRecipeIngredientResult,
  EditRecipeResult,
  MealAnalysisResult,
  SupportedLanguage,
} from "../types/gemini";

/**
 * Gemini Service 介面 - 定義業務邏輯操作
 */
export interface IGeminiService {
  analyzeMealText(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<MealAnalysisResult>;

  analyzeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<AddIngredientResult>;

  analyzeRecipeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<AddRecipeIngredientResult>;

  analyzeImages(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput?: string | null
  ): Promise<ImageAnalysisResult>;

  createRecipeFromImages(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput?: string | null
  ): Promise<RecipeAnalysisResult>;

  editRecipe(
    name: string,
    description: string,
    stepTexts: string[],
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<EditRecipeResult>;
}

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
 * Gemini Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class GeminiController {
  constructor(private geminiService: IGeminiService) {}

  /**
   * 處理餐點文字分析請求
   * @param userInput 用戶輸入的文字描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns API 響應格式的分析結果
   */
  async analyzeMeal(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<ApiResponse<MealAnalysisResult>> {
    try {
      // 調用服務層處理業務邏輯
      console.log("GeminiController - 開始分析餐點");

      const result = await this.geminiService.analyzeMealText(
        userInput,
        userLanguage,
        env
      );

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 分析失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "分析餐點時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 驗證 AddMeal 請求參數
   * @param userInput 用戶輸入
   * @param userLanguage 用戶語言
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateAddMealRequest(
    userInput: string,
    userLanguage: string
  ): string | null {
    // 驗證用戶輸入
    if (!userInput || typeof userInput !== "string") {
      return "缺少 input 欄位";
    }

    if (userInput.trim().length === 0) {
      return "請輸入餐點描述";
    }

    if (userInput.trim().length > 1000) {
      return "餐點描述過長，請限制在 1000 字元以內";
    }

    // 驗證語言代碼
    const supportedLanguages: SupportedLanguage[] = [
      "zh_TW",
      "zh_CN",
      "en",
      "ja",
      "ko",
      "vi",
      "th",
      "ms",
      "id",
      "fr",
      "de",
      "es",
      "pt_BR",
    ];

    if (!supportedLanguages.includes(userLanguage as SupportedLanguage)) {
      return `不支援的語言代碼: ${userLanguage}`;
    }

    return null; // 驗證通過
  }

  /**
   * 處理食材分析請求
   * @param userInput 用戶輸入的食材描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns API 響應格式的分析結果
   */
  async analyzeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<ApiResponse<AddIngredientResult>> {
    try {
      const result = await this.geminiService.analyzeIngredient(
        userInput,
        userLanguage,
        env
      );

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 食材分析失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "分析食材時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 驗證 AddIngredient 請求參數
   * @param userInput 用戶輸入
   * @param userLanguage 用戶語言
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateAddIngredientRequest(
    userInput: string,
    userLanguage: string
  ): string | null {
    // 驗證用戶輸入
    if (!userInput || typeof userInput !== "string") {
      return "缺少 input 欄位";
    }

    if (userInput.trim().length === 0) {
      return "請輸入食材描述";
    }

    if (userInput.trim().length > 500) {
      return "食材描述過長，請限制在 500 字元以內";
    }

    // 驗證語言代碼
    const supportedLanguages: SupportedLanguage[] = [
      "zh_TW",
      "zh_CN",
      "en",
      "ja",
      "ko",
      "vi",
      "th",
      "ms",
      "id",
      "fr",
      "de",
      "es",
      "pt_BR",
    ];

    if (!supportedLanguages.includes(userLanguage as SupportedLanguage)) {
      return `不支援的語言代碼: ${userLanguage}`;
    }

    return null; // 驗證通過
  }

  /**
   * 處理食譜食材分析請求 - 多語言版本
   * @param userInput 用戶輸入的食材描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns API 響應格式的分析結果
   */
  async analyzeRecipeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<ApiResponse<AddRecipeIngredientResult>> {
    try {
      const result = await this.geminiService.analyzeRecipeIngredient(
        userInput,
        userLanguage,
        env
      );

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 食譜食材分析失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "分析食譜食材時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 驗證 AddRecipeIngredient 請求參數
   * @param userInput 用戶輸入
   * @param userLanguage 用戶語言
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateAddRecipeIngredientRequest(
    userInput: string,
    userLanguage: string
  ): string | null {
    // 驗證用戶輸入
    if (!userInput || typeof userInput !== "string") {
      return "缺少 input 欄位";
    }

    if (userInput.trim().length === 0) {
      return "請輸入食材描述";
    }

    if (userInput.trim().length > 500) {
      return "食材描述過長，請限制在 500 字元以內";
    }

    // 驗證語言代碼
    const supportedLanguages: SupportedLanguage[] = [
      "zh_TW",
      "zh_CN",
      "en",
      "ja",
      "ko",
      "vi",
      "th",
      "ms",
      "id",
      "fr",
      "de",
      "es",
      "pt_BR",
    ];

    if (!supportedLanguages.includes(userLanguage as SupportedLanguage)) {
      return `不支援的語言代碼: ${userLanguage}`;
    }

    return null; // 驗證通過
  }

  /**
   * 處理圖片分析請求
   * @param imageFiles 圖片文件數組
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @param userInput 用戶額外輸入（可選）
   * @returns API 響應格式的分析結果
   */
  async analyzeImages(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput?: string | null
  ): Promise<ApiResponse<ImageAnalysisResult>> {
    try {
      // 調用服務層處理業務邏輯
      console.log("GeminiController - 開始分析圖片:", {
        圖片數量: imageFiles.length,
        語言: userLanguage,
        是否有額外輸入: !!userInput,
      });

      const result = await this.geminiService.analyzeImages(
        imageFiles,
        userLanguage,
        env,
        userInput
      );

      console.log("GeminiController - 圖片分析完成:", {
        餐點名稱: result.name,
        總熱量: result.calories,
        食材數量: result.ingredients?.length || 0,
      });

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 圖片分析失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "分析圖片時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 處理食譜分析請求
   * @param imageFiles 圖片文件數組
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @param userInput 用戶額外輸入（可選）
   * @returns API 響應格式的食譜分析結果
   */
  async analyzeRecipe(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput?: string | null
  ): Promise<ApiResponse<RecipeAnalysisResult>> {
    try {
      // 調用服務層處理業務邏輯
      console.log("GeminiController - 開始分析食譜:", {
        圖片數量: imageFiles.length,
        語言: userLanguage,
        是否有額外輸入: !!userInput,
      });

      const result = await this.geminiService.createRecipeFromImages(
        imageFiles,
        userLanguage,
        env,
        userInput
      );

      console.log("GeminiController - 食譜分析完成:", {
        食譜名稱: result.name?.zh_TW || "未知",
        總熱量: result.calories,
        食材數量: result.ingredients?.length || 0,
        製作步驟: result.steps?.length || 0,
      });

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 食譜分析失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "分析食譜時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 驗證圖片分析請求參數
   * @param imageFiles 圖片文件數組
   * @param userLanguage 用戶語言
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateAnalyzeRequest(
    imageFiles: File[],
    userLanguage: string
  ): string | null {
    // 驗證圖片文件
    if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
      return "請至少上傳一張圖片";
    }

    // 檢查圖片數量限制
    if (imageFiles.length > 5) {
      return "最多只能上傳 5 張圖片";
    }

    // 驗證每個圖片文件
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      if (!file || !(file instanceof File)) {
        return `第 ${i + 1} 個文件不是有效的圖片文件`;
      }

      // 驗證文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return `第 ${i + 1} 個圖片文件過大，請上傳小於 10MB 的圖片`;
      }

      // 驗證文件類型
      if (!file.type.startsWith("image/")) {
        return `第 ${i + 1} 個文件不是有效的圖片格式`;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        return `第 ${
          i + 1
        } 個圖片格式不支援，請使用 JPEG、PNG、GIF 或 WebP 格式`;
      }
    }

    // 驗證語言代碼
    const supportedLanguages: SupportedLanguage[] = [
      "zh_TW",
      "zh_CN",
      "en",
      "ja",
      "ko",
      "vi",
      "th",
      "ms",
      "id",
      "fr",
      "de",
      "es",
      "pt_BR",
    ];

    if (!supportedLanguages.includes(userLanguage as SupportedLanguage)) {
      return `不支援的語言代碼: ${userLanguage}`;
    }

    return null; // 驗證通過
  }

  /**
   * 驗證用戶額外輸入
   * @param userInput 用戶輸入
   * @returns 驗證結果，如果有錯誤則返回錯誤訊息
   */
  validateUserInput(userInput?: string | null): string | null {
    if (userInput === null || userInput === undefined) {
      return null; // 可選輸入，允許為空
    }

    if (typeof userInput !== "string") {
      return "用戶輸入必須為字串格式";
    }

    if (userInput.trim().length > 500) {
      return "用戶輸入過長，請限制在 500 字元以內";
    }

    return null; // 驗證通過
  }

  /**
   * 處理編輯食譜請求
   * @param name 食譜名稱
   * @param description 食譜描述
   * @param stepTexts 步驟文字陣列
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns API 響應格式的編輯結果
   */
  async editRecipe(
    name: string,
    description: string,
    stepTexts: string[],
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<ApiResponse<EditRecipeResult>> {
    try {
      // 調用服務層處理業務邏輯
      console.log("GeminiController - 開始編輯食譜:", {
        name: name.substring(0, 50) + "...",
        description: description.substring(0, 50) + "...",
        stepTextsLength: stepTexts.length,
        userLanguage,
      });

      const result = await this.geminiService.editRecipe(
        name,
        description,
        stepTexts,
        userLanguage,
        env
      );

      // 檢查是否有錯誤
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // 返回成功響應
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      console.error("GeminiController - 編輯食譜失敗:", error);

      // 格式化錯誤響應
      const errorMessage =
        error instanceof Error ? error.message : "編輯食譜時發生未知錯誤";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
