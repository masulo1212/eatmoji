import { IRecipeRepository } from "../repositories/recipeRepository";
import { TaskStatus } from "../types/diary";
import { FavoriteRecipe, Recipe, RecipeIngredient } from "../types/recipe";
import { IImageCompressionService } from "./imageCompressionService";
import { IStorageService } from "./storageService";

/**
 * Recipe Service 介面 - 定義業務邏輯操作
 */
export interface IRecipeService {
  // 基本食譜操作
  createRecipe(
    userId: string,
    recipeData: Partial<Recipe>,
    images?: RecipeImageData
  ): Promise<Recipe>;

  updateRecipe(
    recipeId: string,
    updates: Partial<Recipe>,
    images?: RecipeImageData
  ): Promise<Recipe>;

  getRecipe(recipeId: string): Promise<Recipe | null>;
  getAllPublicRecipes(): Promise<Recipe[]>;
  getMyRecipes(userId: string): Promise<Recipe[]>;
  deleteRecipe(recipeId: string): Promise<void>;

  // 收藏操作
  addToFavorites(userId: string, recipeId: string): Promise<void>;
  removeFromFavorites(userId: string, recipeId: string): Promise<void>;
  getFavoriteRecipes(userId: string): Promise<FavoriteRecipe[]>;
}

/**
 * 食譜圖片資料結構
 */
export interface RecipeImageData {
  mainImage?: string; // base64 或 URL
  stepImages?: string[]; // base64 或 URLs
  ingredientImages?: { [ingredientIndex: string]: string }; // ingredient index -> base64 or URL
}

/**
 * Recipe Service - 業務邏輯層
 * 負責業務規則驗證、圖片處理協調和業務邏輯處理
 */
export class RecipeService implements IRecipeService {
  constructor(
    private recipeRepository: IRecipeRepository,
    private imageCompressionService?: IImageCompressionService,
    private storageService?: IStorageService
  ) {}

  /**
   * 智慧圖片處理 - 自動判斷是網址還是 base64 並進行適當處理
   * @param imageData 圖片資料（可能是 URL 或 base64）
   * @param userId 使用者 ID
   * @param imagePath 儲存路徑
   * @returns 處理後的圖片 URL
   */
  private async processImage(
    imageData: string,
    userId: string,
    imagePath: string,
    size: { maxWidth: number; maxHeight: number }
  ): Promise<string> {
    // 如果是網址，直接返回
    if (imageData.startsWith("https://") || imageData.startsWith("http://")) {
      return imageData;
    }

    // 如果是 base64，需要上傳
    if (!this.imageCompressionService || !this.storageService) {
      throw new Error("圖片服務未初始化");
    }

    try {
      // 壓縮圖片
      const compressedImageData =
        await this.imageCompressionService.compressImageFromDataURL(imageData, {
          maxWidth: size.maxWidth,
          maxHeight: size.maxHeight,
        });

      // 上傳到 Firebase Storage
      const uploadResult = await this.storageService.uploadSingleImage(
        userId,
        compressedImageData,
        imagePath
      );

      return uploadResult.url;
    } catch (error) {
      console.error("圖片處理失敗:", error);
      throw new Error("圖片處理失敗");
    }
  }

  /**
   * 批量處理食譜圖片
   * @param recipe 食譜資料
   * @param images 圖片資料
   * @param userId 使用者 ID
   * @returns 處理後的食譜資料
   */
  private async processRecipeImages(
    recipe: Recipe,
    images: RecipeImageData | undefined,
    userId: string
  ): Promise<Recipe> {
    let processedRecipe = { ...recipe };

    if (!images) {
      return processedRecipe;
    }

    try {
      // 處理主要圖片
      if (images.mainImage) {
        const timestamp = Date.now();
        processedRecipe.imgUrl = await this.processImage(
          images.mainImage,
          userId,
          `recipes/${recipe.id}/main_${timestamp}.png`,
          { maxWidth: 1024, maxHeight: 1024 }
        );
      }

      // 處理步驟圖片
      if (images.stepImages && images.stepImages.length > 0) {
        const processedStepImages: string[] = [];

        for (let i = 0; i < images.stepImages.length; i++) {
          const stepImage = images.stepImages[i];
          if (stepImage) {
            const timestamp = Date.now();
            const processedUrl = await this.processImage(
              stepImage,
              userId,
              `recipes/${recipe.id}/steps/step_${i}_${timestamp}.png`,
              { maxWidth: 1024, maxHeight: 1024 }
            );
            processedStepImages.push(processedUrl);
          }
        }

        processedRecipe.stepsImg = processedStepImages;
      }

      // 處理成分圖片
      if (images.ingredientImages) {
        const updatedIngredients = [...processedRecipe.ingredients];

        for (const [indexStr, imageData] of Object.entries(
          images.ingredientImages
        )) {
          const index = parseInt(indexStr);
          if (index >= 0 && index < updatedIngredients.length && imageData) {
            const timestamp = Date.now();
            const processedUrl = await this.processImage(
              imageData,
              userId,
              `recipes/${recipe.id}/ingredient_${index}_${timestamp}.png`,
              { maxWidth: 256, maxHeight: 256 }
            );

            updatedIngredients[index] = {
              ...updatedIngredients[index],
              imageUrl: processedUrl,
            };
          }
        }

        processedRecipe.ingredients = updatedIngredients;
      }

      return processedRecipe;
    } catch (error) {
      console.error("批量圖片處理失敗:", error);
      throw new Error("圖片處理失敗");
    }
  }

  /**
   * 計算食譜總營養素（基於成分）
   * @param ingredients 成分列表
   * @returns 總營養素
   */
  private calculateTotalNutrition(ingredients: RecipeIngredient[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return ingredients.reduce(
      (total, ingredient) => ({
        calories: total.calories + ingredient.calories,
        protein: total.protein + ingredient.protein,
        carbs: total.carbs + ingredient.carbs,
        fat: total.fat + ingredient.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /**
   * 驗證食譜資料
   * @param recipe 食譜資料
   */
  private validateRecipe(recipe: Partial<Recipe>): void {
    if (!recipe.name || Object.keys(recipe.name).length === 0) {
      throw new Error("食譜名稱不能為空");
    }

    if (!recipe.description || Object.keys(recipe.description).length === 0) {
      throw new Error("食譜描述不能為空");
    }

    if (recipe.duration !== undefined && recipe.duration < 0) {
      throw new Error("製作時間不能為負數");
    }

    if (recipe.servings !== undefined && recipe.servings <= 0) {
      throw new Error("份數必須大於 0");
    }
  }

  // 實作介面方法

  async createRecipe(
    userId: string,
    recipeData: Partial<Recipe>,
    images?: RecipeImageData
  ): Promise<Recipe> {
    try {
      // 驗證使用者權限
      if (!userId || userId.trim() === "") {
        throw new Error("使用者 ID 不能為空");
      }

      // 驗證食譜資料
      this.validateRecipe(recipeData);

      if (!recipeData.id) {
        throw new Error("食譜 ID 不能為空");
      }

      const now = new Date();

      // 建立基本食譜資料
      let recipe: Recipe = {
        id: recipeData.id,
        name: recipeData.name || {},
        description: recipeData.description || {},
        authorId: userId,
        imgUrl: recipeData.imgUrl || "",
        isPublic: recipeData.isPublic ?? true,
        calories: 0, // 將根據成分計算
        protein: 0,
        carbs: 0,
        fat: 0,
        duration: recipeData.duration || 0,
        difficulty: recipeData.difficulty || "easy",
        servings: recipeData.servings || 1,
        tags: recipeData.tags || [],
        ingredients: recipeData.ingredients || [],
        recipeHealthAssessment: recipeData.recipeHealthAssessment,
        steps: recipeData.steps || [],
        stepsImg: recipeData.stepsImg || [],
        status: recipeData.status || TaskStatus.DONE,
        progress: recipeData.progress || 0,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      // 計算總營養素
      const nutrition = this.calculateTotalNutrition(recipe.ingredients);
      recipe.calories = nutrition.calories;
      recipe.protein = nutrition.protein;
      recipe.carbs = nutrition.carbs;
      recipe.fat = nutrition.fat;

      // 處理圖片
      recipe = await this.processRecipeImages(recipe, images, userId);

      // 儲存到資料庫
      return await this.recipeRepository.create(recipe);
    } catch (error) {
      console.error("Service: 建立食譜失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("建立食譜時發生未知錯誤");
    }
  }

  async updateRecipe(
    recipeId: string,
    updates: Partial<Recipe>,
    images?: RecipeImageData
  ): Promise<Recipe> {
    try {
      // 基本參數驗證
      if (!recipeId.trim()) {
        throw new Error("食譜 ID 不能為空");
      }

      if (Object.keys(updates).length === 0 && !images) {
        throw new Error("更新資料不能為空");
      }

      // 取得現有食譜
      const existingRecipe = await this.recipeRepository.findById(recipeId);
      if (!existingRecipe) {
        throw new Error("找不到指定的食譜");
      }

      // 驗證更新資料
      if (Object.keys(updates).length > 0) {
        this.validateRecipe(updates);
      }

      // 準備更新資料
      let updatedData = { ...updates };

      // 如果成分有更新，重新計算營養素
      if (updates.ingredients) {
        const nutrition = this.calculateTotalNutrition(updates.ingredients);
        updatedData.calories = nutrition.calories;
        updatedData.protein = nutrition.protein;
        updatedData.carbs = nutrition.carbs;
        updatedData.fat = nutrition.fat;
      }

      // 處理圖片（如果有提供）
      if (images) {
        // 建立臨時食譜物件用於圖片處理
        const tempRecipe: Recipe = {
          ...existingRecipe,
          ...updatedData,
        };

        const processedRecipe = await this.processRecipeImages(
          tempRecipe,
          images,
          existingRecipe.authorId!
        );

        // 更新圖片相關欄位
        if (images.mainImage) {
          updatedData.imgUrl = processedRecipe.imgUrl;
        }
        if (images.stepImages) {
          updatedData.stepsImg = processedRecipe.stepsImg;
        }
        if (images.ingredientImages) {
          updatedData.ingredients = processedRecipe.ingredients;
        }
      }

      // 更新資料庫
      return await this.recipeRepository.update(recipeId, updatedData);
    } catch (error) {
      console.error("Service: 更新食譜失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("更新食譜時發生未知錯誤");
    }
  }

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    try {
      if (!recipeId.trim()) {
        throw new Error("食譜 ID 不能為空");
      }

      return await this.recipeRepository.findById(recipeId);
    } catch (error) {
      console.error("Service: 取得食譜失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("取得食譜時發生未知錯誤");
    }
  }

  async getAllPublicRecipes(): Promise<Recipe[]> {
    try {
      return await this.recipeRepository.findAllPublic();
    } catch (error) {
      console.error("Service: 取得公開食譜列表失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("取得公開食譜列表時發生未知錯誤");
    }
  }

  async getMyRecipes(userId: string): Promise<Recipe[]> {
    try {
      if (!userId || userId.trim() === "") {
        throw new Error("使用者 ID 不能為空");
      }

      return await this.recipeRepository.findByAuthor(userId);
    } catch (error) {
      console.error("Service: 取得我的食譜列表失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("取得我的食譜列表時發生未知錯誤");
    }
  }

  async deleteRecipe(recipeId: string): Promise<void> {
    try {
      if (!recipeId.trim()) {
        throw new Error("食譜 ID 不能為空");
      }

      // 檢查食譜是否存在
      const recipe = await this.recipeRepository.findById(recipeId);
      if (!recipe) {
        throw new Error("找不到指定的食譜");
      }

      await this.recipeRepository.softDelete(recipeId);
    } catch (error) {
      console.error("Service: 刪除食譜失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("刪除食譜時發生未知錯誤");
    }
  }

  async addToFavorites(userId: string, recipeId: string): Promise<void> {
    try {
      if (!userId || userId.trim() === "") {
        throw new Error("使用者 ID 不能為空");
      }

      if (!recipeId.trim()) {
        throw new Error("食譜 ID 不能為空");
      }

      // 檢查食譜是否存在
      const recipe = await this.recipeRepository.findById(recipeId);
      if (!recipe) {
        throw new Error("找不到指定的食譜");
      }

      await this.recipeRepository.addToFavorites(userId, recipe);
    } catch (error) {
      console.error("Service: 加入收藏失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("加入收藏時發生未知錯誤");
    }
  }

  async removeFromFavorites(userId: string, recipeId: string): Promise<void> {
    try {
      if (!userId || userId.trim() === "") {
        throw new Error("使用者 ID 不能為空");
      }

      if (!recipeId.trim()) {
        throw new Error("食譜 ID 不能為空");
      }

      await this.recipeRepository.removeFromFavorites(userId, recipeId);
    } catch (error) {
      console.error("Service: 移除收藏失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("移除收藏時發生未知錯誤");
    }
  }

  async getFavoriteRecipes(userId: string): Promise<FavoriteRecipe[]> {
    try {
      if (!userId || userId.trim() === "") {
        throw new Error("使用者 ID 不能為空");
      }

      return await this.recipeRepository.findFavoritesByUser(userId);
    } catch (error) {
      console.error("Service: 取得收藏食譜列表失敗:", error);
      throw error instanceof Error
        ? error
        : new Error("取得收藏食譜列表時發生未知錯誤");
    }
  }
}
