import { z } from "zod";
import { TaskStatus, TaskStatusSchema, FirestoreDateSchema, OptionalFirestoreDateSchema } from "./diary";

// Recipe Tag enum - 對應 Dart RecipeTag
export enum RecipeTag {
  // mealType 餐別分類
  BREAKFAST = "breakfast",
  LUNCH = "lunch", 
  DINNER = "dinner",
  DESSERT = "dessert",
  BEVERAGE = "beverage",

  // dietType 飲食偏好
  VEGAN = "vegan",
  VEGETARIAN = "vegetarian",
  HIGH_PROTEIN = "highProtein",
  KETO = "keto",
  MEDITERRANEAN = "mediterranean",
  LOW_GI = "lowGi",
  LOW_CARB = "lowCarb", 
  LOW_FAT = "lowFat",

  // dishType 料理形式
  SOUP = "soup",
  SALAD = "salad",
  SNACK = "snack",
  BENTO = "bento",
  HOT_POT = "hotPot",
  FRIED_FOOD = "friedFood",
  GRILLED = "grilled",
  NOODLES = "noodles",
  MAIN_COURSE = "mainCourse",

  // cuisine 地區風味
  TAIWANESE = "taiwanese",
  CHINESE = "chinese",
  JAPANESE = "japanese", 
  KOREAN = "korean",
  VIETNAM = "vietnam",
  ITALIAN = "italian",
  AMERICAN = "american",
  INDIAN = "indian",
  MEXICAN = "mexican",
  FRANCE = "france",
  MALAYSIA = "malaysia",
  SINGAPORE = "singapore",
  GERMAN = "german",
  SPANISH = "spanish",
  THAI = "thai",
  BRAZILIAN = "brazilian",
}

// Zod schema for RecipeTag
export const RecipeTagSchema = z.nativeEnum(RecipeTag);

// RecipeHealthAssessment interface and schema
export interface RecipeHealthAssessment {
  score: number;
  pros: Record<string, string[]>;
  cons: Record<string, string[]>;
}

export const RecipeHealthAssessmentSchema = z.object({
  score: z.number(),
  pros: z.record(z.string(), z.array(z.string())).default({}),
  cons: z.record(z.string(), z.array(z.string())).default({}),
});

// RecipeStep interface and schema
export interface RecipeStep {
  order: number;
  stepDescription: Record<string, string>;
  status: TaskStatus;
}

export const RecipeStepSchema = z.object({
  order: z.number(),
  stepDescription: z.record(z.string(), z.string()).default({}),
  status: TaskStatusSchema.default(TaskStatus.DONE),
});

// RecipeIngredient interface and schema
export interface RecipeIngredient {
  name: Record<string, string>;
  amountValue: number;
  amountUnit: Record<string, string>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: TaskStatus;
  imageUrl?: string | null;
}

export const RecipeIngredientSchema = z.object({
  name: z.record(z.string(), z.string()).default({}),
  amountValue: z.number().default(0),
  amountUnit: z.record(z.string(), z.string()).default({}),
  calories: z.number().default(0),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
  status: TaskStatusSchema.default(TaskStatus.DONE),
  imageUrl: z.string().nullable().optional(),
});

// Recipe interface
export interface Recipe {
  id?: string;
  name: Record<string, string>;
  description: Record<string, string>;
  authorId?: string;
  imgUrl?: string;
  isPublic: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  duration: number;
  difficulty: string;
  servings: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  recipeHealthAssessment?: RecipeHealthAssessment;
  steps: RecipeStep[];
  stepsImg: string[];
  status: TaskStatus;
  progress: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Main Recipe Zod schema for validation
export const RecipeSchema = z.object({
  id: z.string().optional(),
  name: z.record(z.string(), z.string()).default({}),
  description: z.record(z.string(), z.string()).default({}),
  authorId: z.string().optional(),
  imgUrl: z.string().optional(),
  isPublic: z.boolean().default(true),
  calories: z.number().default(0),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
  duration: z.number().default(0),
  difficulty: z.string().default("easy"),
  servings: z.number().default(1),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(RecipeIngredientSchema).default([]),
  recipeHealthAssessment: RecipeHealthAssessmentSchema.optional(),
  steps: z.array(RecipeStepSchema).default([]),
  stepsImg: z.array(z.string()).default([]),
  status: TaskStatusSchema.default(TaskStatus.DONE),
  progress: z.number().default(0),
  isDeleted: z.boolean().default(false),
  deletedAt: OptionalFirestoreDateSchema,
  createdAt: FirestoreDateSchema,
  updatedAt: FirestoreDateSchema,
});

// Schema for creating a new recipe (excludes generated fields)
export const CreateRecipeSchema = RecipeSchema.omit({
  authorId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(), // 前端必須提供 ID
});

// Schema for updating a recipe (most fields optional, but some required)
export const UpdateRecipeSchema = RecipeSchema.partial().extend({
  id: z.string(), // ID 必須存在
  updatedAt: FirestoreDateSchema, // 更新時間會被設定
});

// Request schema for recipe creation with images
export const CreateRecipeWithImagesSchema = z.object({
  recipe: CreateRecipeSchema,
  mainImage: z.string().optional(), // base64 or URL
  stepImages: z.array(z.string()).optional(), // base64 or URLs
  ingredientImages: z.record(z.string(), z.string()).optional(), // ingredient index -> base64 or URL
});

// Request schema for recipe update with images 
export const UpdateRecipeWithImagesSchema = z.object({
  recipe: UpdateRecipeSchema,
  mainImage: z.string().optional(), // base64 or URL
  stepImages: z.array(z.string()).optional(), // base64 or URLs  
  ingredientImages: z.record(z.string(), z.string()).optional(), // ingredient index -> base64 or URL
});

// Response schemas for API
export const RecipeResponseSchema = z.object({
  success: z.boolean(),
  result: RecipeSchema.optional(),
  error: z.string().optional(),
});

export const RecipeListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(RecipeSchema).optional(),
  error: z.string().optional(),
});

// Favorite Recipe schemas (stored in user's subcollection)
export interface FavoriteRecipe extends Recipe {
  favoritedAt: Date; // 收藏時間
}

export const FavoriteRecipeSchema = RecipeSchema.extend({
  favoritedAt: FirestoreDateSchema,
});

export const FavoriteRecipeListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(FavoriteRecipeSchema).optional(),
  error: z.string().optional(),
});