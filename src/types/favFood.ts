import { z } from "zod";
import { 
  HealthAssessment, 
  HealthAssessmentSchema, 
  Ingredient, 
  IngredientSchema,
  firestoreTimestampToDate,
  FirestoreDateSchema,
  DiarySchema
} from "./diary";

/**
 * FoodEntry interface - 收藏食物條目
 * 完全對應 Flutter FoodEntry 模型的所有屬性
 */
export interface FoodEntry {
  id?: string;
  name: string;
  brand?: string;
  originalImgs?: string[];
  stickerImg?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthAssessment?: HealthAssessment;
  ingredients?: Ingredient[];
  portions: number;
  userId: string;
  isPublic: boolean;
  version: number;
  importedCount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main FoodEntry Zod schema for validation
 */
export const FoodEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  brand: z.string().optional(),
  originalImgs: z.array(z.string()).optional(),
  stickerImg: z.string().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  healthAssessment: HealthAssessmentSchema.optional(),
  ingredients: z.array(IngredientSchema).optional(),
  portions: z.number(),
  userId: z.string(),
  isPublic: z.boolean().default(false),
  version: z.number().default(1),
  importedCount: z.number().default(0),
  description: z.string().optional(),
  createdAt: FirestoreDateSchema,
  updatedAt: FirestoreDateSchema,
});

/**
 * Schema for creating a new FoodEntry (excludes generated fields)
 */
export const CreateFoodEntrySchema = FoodEntrySchema.omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Schema for updating a FoodEntry (all fields optional except id)
 */
export const UpdateFoodEntrySchema = FoodEntrySchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

/**
 * Schema for creating FoodEntry from Diary
 * 對應 Flutter addFoodEntry({required Diary diary}) 方法
 * 直接使用 DiarySchema，API 請求體就是 diary 對象本身
 */
export const CreateFoodEntryFromDiarySchema = DiarySchema;

/**
 * Response schemas for API
 */
export const FoodEntryResponseSchema = z.object({
  success: z.boolean(),
  result: FoodEntrySchema.optional(),
  error: z.string().optional(),
});

export const FoodEntryListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(FoodEntrySchema).optional(),
  error: z.string().optional(),
});

/**
 * 將 Firestore 文件轉換為 FoodEntry 物件的輔助函數
 * @param doc Firestore 文件
 * @returns 經過適當類型轉換的 FoodEntry 物件
 */
export const convertFirestoreDocToFoodEntry = (doc: any): FoodEntry => {
  const data = doc.data();

  return {
    id: doc.id,
    name: data.name,
    brand: data.brand,
    originalImgs: data.originalImgs || [],
    stickerImg: data.stickerImg,
    calories: data.calories || 0,
    protein: data.protein || 0,
    carbs: data.carbs || 0,
    fat: data.fat || 0,
    healthAssessment: data.healthAssessment,
    ingredients: data.ingredients || [],
    portions: data.portions || 1,
    userId: data.userId,
    isPublic: data.isPublic || false,
    version: data.version || 1,
    importedCount: data.importedCount || 0,
    description: data.description,
    createdAt: firestoreTimestampToDate(data.createdAt),
    updatedAt: firestoreTimestampToDate(data.updatedAt),
  };
};