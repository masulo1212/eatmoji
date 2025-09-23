import { FirestoreClient } from "firebase-rest-firestore";
import { firestoreTimestampToDate } from "../types/diary";
import { FavoriteRecipe, Recipe } from "../types/recipe";

/**
 * Recipe Repository 介面 - 定義資料存取操作
 */
export interface IRecipeRepository {
  // 基本食譜操作
  /**
   * 建立新的食譜
   * @param recipe 食譜資料
   * @returns 建立的 Recipe 物件
   */
  create(recipe: Recipe): Promise<Recipe>;

  /**
   * 更新現有食譜
   * @param recipeId 食譜 ID
   * @param updates 更新資料
   * @returns 更新後的 Recipe 物件
   */
  update(recipeId: string, updates: Partial<Recipe>): Promise<Recipe>;

  /**
   * 根據 ID 查詢單一食譜
   * @param recipeId 食譜 ID
   * @returns Recipe 物件或 null
   */
  findById(recipeId: string): Promise<Recipe | null>;

  /**
   * 查詢所有公開食譜
   * @returns Recipe 陣列
   */
  findAllPublic(): Promise<Recipe[]>;

  /**
   * 查詢使用者的食譜
   * @param userId 使用者 ID
   * @returns Recipe 陣列
   */
  findByAuthor(userId: string): Promise<Recipe[]>;

  /**
   * 軟刪除食譜
   * @param recipeId 食譜 ID
   */
  softDelete(recipeId: string): Promise<void>;

  // 收藏食譜操作
  /**
   * 加入收藏食譜
   * @param userId 使用者 ID
   * @param recipe 要收藏的食譜
   */
  addToFavorites(userId: string, recipe: Recipe): Promise<void>;

  /**
   * 移除收藏食譜
   * @param userId 使用者 ID
   * @param recipeId 食譜 ID
   */
  removeFromFavorites(userId: string, recipeId: string): Promise<void>;

  /**
   * 查詢使用者的收藏食譜
   * @param userId 使用者 ID
   * @returns FavoriteRecipe 陣列
   */
  findFavoritesByUser(userId: string): Promise<FavoriteRecipe[]>;
}

/**
 * Firestore Recipe Repository 實作
 */
export class FirestoreRecipeRepository implements IRecipeRepository {
  constructor(private firestore: FirestoreClient) {}

  /**
   * 取得全局 recipes collection 參考
   */
  private getRecipesCollection() {
    return this.firestore.collection("recipes");
  }

  /**
   * 取得使用者的收藏食譜 collection 參考
   * @param userId 使用者 ID
   */
  private getUserFavRecipesCollection(userId: string) {
    return this.firestore.collection(`users/${userId}/fav_recipes`);
  }

  /**
   * 將 Firestore 文件轉換為 Recipe 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 Recipe 物件
   */
  private convertFirestoreDocToRecipe(doc: any): Recipe {
    const data = doc.data();

    return {
      id: data.id || doc.id, // 確保 id 欄位存在
      name: data.name || {},
      description: data.description || {},
      authorId: data.authorId,
      imgUrl: data.imgUrl,
      isPublic: data.isPublic ?? true,
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      duration: data.duration || 0,
      difficulty: data.difficulty || "easy",
      servings: data.servings || 1,
      tags: data.tags || [],
      ingredients: data.ingredients || [],
      recipeHealthAssessment: data.recipeHealthAssessment,
      steps: data.steps || [],
      stepsImg: data.stepsImg || [],
      status: data.status || "done",
      progress: data.progress || 0,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt
        ? firestoreTimestampToDate(data.deletedAt)
        : undefined,
      createdAt: firestoreTimestampToDate(data.createdAt),
      updatedAt: firestoreTimestampToDate(data.updatedAt),
    };
  }

  /**
   * 將 Firestore 文件轉換為 FavoriteRecipe 物件
   * @param doc Firestore 文件
   * @returns 經過適當類型轉換的 FavoriteRecipe 物件
   */
  private convertFirestoreDocToFavoriteRecipe(doc: any): FavoriteRecipe {
    const recipe = this.convertFirestoreDocToRecipe(doc);
    const data = doc.data();

    return {
      ...recipe,
      favoritedAt: firestoreTimestampToDate(data.favoritedAt || data.createdAt),
    };
  }

  /**
   * 準備要儲存到 Firestore 的資料
   * @param recipe Recipe 物件
   * @returns 格式化後的資料
   */
  // private prepareRecipeForFirestore(recipe: Recipe): any {
  //   const now = new Date();
  //   const firestoreTimestamp = dateToFirestoreTimestamp(now);

  //   return {
  //     ...recipe,
  //     id: recipe.id, // 確保 id 欄位包含在文檔中
  //     updatedAt: firestoreTimestamp,
  //     createdAt: recipe.createdAt
  //       ? dateToFirestoreTimestamp(recipe.createdAt)
  //       : firestoreTimestamp,
  //   };
  // }

  // 實作介面方法

  async create(recipe: Recipe): Promise<Recipe> {
    try {
      if (!recipe.id) {
        throw new Error("Recipe ID is required");
      }

      const collection = this.getRecipesCollection();
      const now = new Date();

      const recipeWithTimestamp: Recipe = {
        ...recipe,
        createdAt: recipe.createdAt || now,
        updatedAt: now,
      };

      console.log("recipeWithTimestamp", recipeWithTimestamp);

      // const firestoreData = this.prepareRecipeForFirestore(recipeWithTimestamp);

      // console.log("firestoreData", firestoreData);

      await collection.doc(recipe.id).set(recipeWithTimestamp);

      return recipeWithTimestamp;
    } catch (error) {
      console.error("Repository: 建立食譜時發生錯誤:", error);
      throw new Error("無法建立食譜");
    }
  }

  async update(recipeId: string, updates: Partial<Recipe>): Promise<Recipe> {
    try {
      const collection = this.getRecipesCollection();
      const now = new Date();

      const updateData = {
        ...updates,
        id: recipeId, // 確保 id 欄位存在
        updatedAt: now,
      };

      await collection.doc(recipeId).update(updateData);

      // 取得更新後的食譜
      const updatedDoc = await collection.doc(recipeId).get();
      if (!updatedDoc.exists) {
        throw new Error("食譜更新後無法找到");
      }

      return this.convertFirestoreDocToRecipe(updatedDoc);
    } catch (error) {
      console.error("Repository: 更新食譜時發生錯誤:", error);
      throw new Error("無法更新食譜");
    }
  }

  async findById(recipeId: string): Promise<Recipe | null> {
    try {
      const collection = this.getRecipesCollection();
      const doc = await collection.doc(recipeId).get();

      if (!doc.exists) {
        return null;
      }

      const recipe = this.convertFirestoreDocToRecipe(doc);

      // 如果食譜被軟刪除，返回 null
      if (recipe.isDeleted) {
        return null;
      }

      return recipe;
    } catch (error) {
      console.error("Repository: 取得食譜時發生錯誤:", error);
      throw new Error("無法取得食譜");
    }
  }

  async findAllPublic(): Promise<Recipe[]> {
    try {
      const collection = this.getRecipesCollection();

      const query = collection
        .where("isDeleted", "==", false)
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => this.convertFirestoreDocToRecipe(doc));
    } catch (error) {
      console.error("Repository: 取得公開食譜列表時發生錯誤:", error);
      throw new Error("無法取得公開食譜列表");
    }
  }

  async findByAuthor(userId: string): Promise<Recipe[]> {
    try {
      const collection = this.getRecipesCollection();

      const query = collection
        .where("isDeleted", "==", false)
        .where("authorId", "==", userId)
        .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => this.convertFirestoreDocToRecipe(doc));
    } catch (error) {
      console.error("Repository: 取得作者食譜列表時發生錯誤:", error);
      throw new Error("無法取得作者食譜列表");
    }
  }

  async softDelete(recipeId: string): Promise<void> {
    try {
      const collection = this.getRecipesCollection();
      const now = new Date();

      await collection.doc(recipeId).update({
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error("Repository: 軟刪除食譜時發生錯誤:", error);
      throw new Error("無法刪除食譜");
    }
  }

  async addToFavorites(userId: string, recipe: Recipe): Promise<void> {
    try {
      const collection = this.getUserFavRecipesCollection(userId);
      const now = new Date();

      const favoriteRecipeData = {
        ...recipe,
        id: recipe.id, // 確保 id 欄位存在
        createdAt: now, // 收藏時間作為創建時間
      };

      await collection.doc(recipe.id!).set(favoriteRecipeData);
    } catch (error) {
      console.error("Repository: 加入收藏時發生錯誤:", error);
      throw new Error("無法加入收藏");
    }
  }

  async removeFromFavorites(userId: string, recipeId: string): Promise<void> {
    try {
      const collection = this.getUserFavRecipesCollection(userId);
      await collection.doc(recipeId).delete();
    } catch (error) {
      console.error("Repository: 移除收藏時發生錯誤:", error);
      throw new Error("無法移除收藏");
    }
  }

  async findFavoritesByUser(userId: string): Promise<FavoriteRecipe[]> {
    try {
      const collection = this.getUserFavRecipesCollection(userId);

      const query = collection.orderBy("createdAt", "desc");
      const snapshot = await query.get();

      return snapshot.docs.map((doc) =>
        this.convertFirestoreDocToFavoriteRecipe(doc)
      );
    } catch (error) {
      console.error("Repository: 取得收藏食譜列表時發生錯誤:", error);
      throw new Error("無法取得收藏食譜列表");
    }
  }
}
