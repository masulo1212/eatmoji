import { Recipe, FavoriteRecipe, CreateRecipeWithImagesSchema, UpdateRecipeWithImagesSchema } from "../types/recipe";
import { IRecipeService, RecipeImageData } from "../services/recipeService";

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
 * 建立食譜請求格式（包含圖片）
 */
export interface CreateRecipeWithImagesRequest {
  recipe: Partial<Recipe>;
  mainImage?: string;
  stepImages?: string[];
  ingredientImages?: { [ingredientIndex: string]: string };
}

/**
 * 更新食譜請求格式（包含圖片）
 */
export interface UpdateRecipeWithImagesRequest {
  recipe: Partial<Recipe>;
  mainImage?: string;
  stepImages?: string[];
  ingredientImages?: { [ingredientIndex: string]: string };
}

/**
 * Recipe Controller - 處理 HTTP 請求/響應的薄層
 * 負責調用 Service 層並格式化響應
 */
export class RecipeController {
  constructor(private recipeService: IRecipeService) {}

  /**
   * 建立新食譜（包含圖片處理）
   * @param userId 使用者 ID
   * @param request 建立食譜請求
   * @returns API 響應格式
   */
  async createRecipe(
    userId: string,
    request: CreateRecipeWithImagesRequest
  ): Promise<ApiResponse<Recipe>> {
    try {
      // 基本參數驗證
      if (!request.recipe.name || Object.keys(request.recipe.name).length === 0) {
        return {
          success: false,
          error: "食譜名稱不能為空",
        };
      }

      if (!request.recipe.description || Object.keys(request.recipe.description).length === 0) {
        return {
          success: false,
          error: "食譜描述不能為空",
        };
      }

      if (!request.recipe.id) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      // 準備圖片資料
      const images: RecipeImageData = {
        mainImage: request.mainImage,
        stepImages: request.stepImages,
        ingredientImages: request.ingredientImages,
      };

      // 調用 Service 層
      const createdRecipe = await this.recipeService.createRecipe(
        userId,
        request.recipe,
        images
      );

      return {
        success: true,
        result: createdRecipe,
      };
    } catch (error) {
      console.error("Controller: 建立食譜失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "建立食譜時發生未知錯誤",
      };
    }
  }

  /**
   * 更新食譜（包含圖片處理）
   * @param recipeId 食譜 ID
   * @param request 更新食譜請求
   * @returns API 響應格式
   */
  async updateRecipe(
    recipeId: string,
    request: UpdateRecipeWithImagesRequest
  ): Promise<ApiResponse<Recipe>> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      if (
        Object.keys(request.recipe).length === 0 &&
        !request.mainImage &&
        !request.stepImages &&
        !request.ingredientImages
      ) {
        return {
          success: false,
          error: "更新資料不能為空",
        };
      }

      // 準備圖片資料
      const images: RecipeImageData = {
        mainImage: request.mainImage,
        stepImages: request.stepImages,
        ingredientImages: request.ingredientImages,
      };

      // 調用 Service 層
      const updatedRecipe = await this.recipeService.updateRecipe(
        recipeId,
        request.recipe,
        images
      );

      return {
        success: true,
        result: updatedRecipe,
      };
    } catch (error) {
      console.error("Controller: 更新食譜失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "更新食譜時發生未知錯誤",
      };
    }
  }

  /**
   * 取得單一食譜
   * @param recipeId 食譜 ID
   * @returns API 響應格式
   */
  async getRecipe(recipeId: string): Promise<ApiResponse<Recipe | null>> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      // 調用 Service 層
      const recipe = await this.recipeService.getRecipe(recipeId);

      return {
        success: true,
        result: recipe,
      };
    } catch (error) {
      console.error("Controller: 取得食譜失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "取得食譜時發生未知錯誤",
      };
    }
  }

  /**
   * 取得所有公開食譜
   * @returns API 響應格式
   */
  async getAllPublicRecipes(): Promise<ApiResponse<Recipe[]>> {
    try {
      // 調用 Service 層
      const recipes = await this.recipeService.getAllPublicRecipes();

      return {
        success: true,
        result: recipes,
      };
    } catch (error) {
      console.error("Controller: 取得公開食譜列表失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "取得公開食譜列表時發生未知錯誤",
      };
    }
  }

  /**
   * 取得我的食譜
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getMyRecipes(userId: string): Promise<ApiResponse<Recipe[]>> {
    try {
      // 調用 Service 層
      const recipes = await this.recipeService.getMyRecipes(userId);

      return {
        success: true,
        result: recipes,
      };
    } catch (error) {
      console.error("Controller: 取得我的食譜列表失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "取得我的食譜列表時發生未知錯誤",
      };
    }
  }

  /**
   * 刪除食譜
   * @param recipeId 食譜 ID
   * @returns API 響應格式
   */
  async deleteRecipe(recipeId: string): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.recipeService.deleteRecipe(recipeId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 刪除食譜失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "刪除食譜時發生未知錯誤",
      };
    }
  }

  /**
   * 加入收藏
   * @param userId 使用者 ID
   * @param recipeId 食譜 ID
   * @returns API 響應格式
   */
  async addToFavorites(
    userId: string,
    recipeId: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.recipeService.addToFavorites(userId, recipeId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 加入收藏失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "加入收藏時發生未知錯誤",
      };
    }
  }

  /**
   * 移除收藏
   * @param userId 使用者 ID
   * @param recipeId 食譜 ID
   * @returns API 響應格式
   */
  async removeFromFavorites(
    userId: string,
    recipeId: string
  ): Promise<ApiResponse<void>> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        return {
          success: false,
          error: "食譜 ID 不能為空",
        };
      }

      // 調用 Service 層
      await this.recipeService.removeFromFavorites(userId, recipeId);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Controller: 移除收藏失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "移除收藏時發生未知錯誤",
      };
    }
  }

  /**
   * 取得收藏食譜列表
   * @param userId 使用者 ID
   * @returns API 響應格式
   */
  async getFavoriteRecipes(userId: string): Promise<ApiResponse<FavoriteRecipe[]>> {
    try {
      // 調用 Service 層
      const favoriteRecipes = await this.recipeService.getFavoriteRecipes(userId);

      return {
        success: true,
        result: favoriteRecipes,
      };
    } catch (error) {
      console.error("Controller: 取得收藏食譜列表失敗:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "取得收藏食譜列表時發生未知錯誤",
      };
    }
  }

  /**
   * 將 Controller 響應轉換為 HTTP 錯誤格式
   * @param response Controller 響應
   * @param defaultErrorCode 預設錯誤代碼
   * @returns 錯誤響應格式
   */
  static toErrorResponse(
    response: ApiResponse,
    defaultErrorCode: number = 500
  ): ApiErrorResponse {
    return {
      success: false,
      errors: [
        {
          code: defaultErrorCode,
          message: response.error || "發生未知錯誤",
        },
      ],
    };
  }
}