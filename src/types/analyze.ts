import { z } from "zod";

/**
 * 圖片分析結果介面
 */
export interface ImageAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: AnalyzeIngredientItem[];
  health_assessment: AnalyzeHealthAssessment;
  error?: string;
}

/**
 * 圖片分析食材項目介面
 */
export interface AnalyzeIngredientItem {
  name: string;
  engName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amountValue: number;
  amountUnit: string;
}

/**
 * 圖片分析健康評估介面
 */
export interface AnalyzeHealthAssessment {
  score: number;
  pros?: string[];
  cons?: string[];
}

/**
 * 圖片部分介面（用於 AI API）
 */
export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

/**
 * AnalyzeImages 請求 Schema
 */
export const AnalyzeImagesRequestSchema = z.object({
  user_language: z.string().optional().default("zh_TW"),
  user_input: z.string().optional(),
});

export type AnalyzeImagesRequest = z.infer<typeof AnalyzeImagesRequestSchema>;

/**
 * AnalyzeImages 回應 Schema
 */
export const AnalyzeImagesResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      name: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          engName: z.string(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          amountValue: z.number(),
          amountUnit: z.string(),
        })
      ),
      health_assessment: z.object({
        score: z.number(),
        pros: z.array(z.string()).optional(),
        cons: z.array(z.string()).optional(),
      }),
    })
    .optional(),
  error: z.string().optional(),
});

export type AnalyzeImagesResponse = z.infer<typeof AnalyzeImagesResponseSchema>;

/**
 * 圖片分析的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const analyzeImagesJsonSchema = {
  type: "object",
  description: "Structured data for image analysis results",
  properties: {
    name: {
      type: "string",
      description:
        "Meal name, should be concise without breakfast/lunch/dinner words, verbs or adjectives, use user's specified language",
    },
    calories: {
      type: "number",
      description: "Total calories, must equal (protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "Total protein content (grams)",
    },
    carbs: {
      type: "number",
      description: "Total carbohydrates content (grams)",
    },
    fat: {
      type: "number",
      description: "Total fat content (grams)",
    },
    ingredients: {
      type: "array",
      description: "List of ingredient components",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Ingredient name, use user's specified language (not Chinese unless user language is Chinese), concise without verbs or adjectives, no parenthetical notes, no comma supplements",
          },
          engName: {
            type: "string",
            description:
              "Ingredient English name, prefer singular form, but use plural if the standard English expression is plural (like 'noodles', 'beans', 'oats'), concise without verbs or adjectives, no parenthetical notes, no comma supplements",
          },
          calories: {
            type: "number",
            description: "Calories of this ingredient",
          },
          protein: {
            type: "number",
            description: "Protein content of this ingredient (grams)",
          },
          carbs: {
            type: "number",
            description: "Carbohydrates content of this ingredient (grams)",
          },
          fat: {
            type: "number",
            description: "Fat content of this ingredient (grams)",
          },
          amountValue: {
            type: "number",
            description: "Quantity value of the ingredient",
          },
          amountUnit: {
            type: "string",
            description:
              "Unit of the ingredient (e.g.: servings, pieces, grams, etc.), use user's specified language (not Chinese unless user language is Chinese)",
          },
        },
        required: [
          "name",
          "engName",
          "calories",
          "protein",
          "carbs",
          "fat",
          "amountValue",
          "amountUnit",
        ],
      },
    },
    health_assessment: {
      type: "object",
      description: "Health assessment",
      properties: {
        score: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Health score, integer from 1-10, higher is healthier",
        },
        pros: {
          type: "array",
          description: "Advantages list, maximum 4 items, nutrition-related only",
          items: {
            type: "string",
          },
          maxItems: 4,
        },
        cons: {
          type: "array",
          description: "Disadvantages list, maximum 4 items, nutrition-related only",
          items: {
            type: "string",
          },
          maxItems: 4,
        },
      },
      required: ["score"],
    },
    error: {
      type: "string",
      description: "Error message (used when unable to analyze images)",
    },
  },
  required: [
    "name",
    "calories",
    "protein",
    "carbs",
    "fat",
    "ingredients",
    "health_assessment",
  ],
};

/**
 * 多語言文字物件
 */
export interface MultiLanguageText {
  zh_TW: string;
  zh_CN: string;
  en: string;
  ja: string;
  ko: string;
  vi: string;
  th: string;
  ms: string;
  id: string;
  fr: string;
  de: string;
  es: string;
  pt_BR: string;
}

/**
 * 多語言字串陣列物件
 */
export interface MultiLanguageArray {
  zh_TW: string[];
  zh_CN: string[];
  en: string[];
  ja: string[];
  ko: string[];
  vi: string[];
  th: string[];
  ms: string[];
  id: string[];
  fr: string[];
  de: string[];
  es: string[];
  pt_BR: string[];
}

/**
 * 食譜食材介面
 */
export interface RecipeIngredient {
  name: MultiLanguageText;
  amountValue: number;
  amountUnit: MultiLanguageText;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  imageData?: string;
}

/**
 * 食譜製作步驟介面
 */
export interface RecipeStep {
  order: number;
  stepDescription: MultiLanguageText;
}

/**
 * 食譜健康評估介面
 */
export interface RecipeHealthAssessment {
  score: number;
  pros?: MultiLanguageArray;
  cons?: MultiLanguageArray;
}

/**
 * 食譜標籤類型
 */
export type RecipeTag =
  // 餐別分類
  | "breakfast"
  | "lunch"
  | "dinner"
  | "dessert"
  | "beverage"
  // 飲食偏好
  | "vegan"
  | "vegetarian"
  | "highProtein"
  | "keto"
  | "mediterranean"
  | "lowGi"
  | "lowCarb"
  | "lowFat"
  // 料理形式
  | "soup"
  | "salad"
  | "snack"
  | "bento"
  | "hotPot"
  | "friedFood"
  | "grilled"
  | "noodles"
  | "mainCourse"
  // 地區風味
  | "taiwanese"
  | "chinese"
  | "japanese"
  | "korean"
  | "vietnam"
  | "italian"
  | "american"
  | "indian"
  | "mexican"
  | "france"
  | "malaysia"
  | "singapore"
  | "german"
  | "spanish"
  | "thai"
  | "brazilian";

/**
 * 食譜難度類型
 */
export type RecipeDifficulty = "easy" | "medium" | "hard";

/**
 * 完整食譜介面
 */
export interface Recipe {
  name: MultiLanguageText;
  description: MultiLanguageText;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  duration: number;
  difficulty: RecipeDifficulty;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: RecipeTag[];
  recipeHealthAssessment: RecipeHealthAssessment;
}

/**
 * 食譜分析結果介面
 */
export interface RecipeAnalysisResult {
  name: MultiLanguageText;
  description: MultiLanguageText;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  duration: number;
  difficulty: RecipeDifficulty;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: RecipeTag[];
  recipeHealthAssessment: RecipeHealthAssessment;
  error?: string;
}

/**
 * AddRecipe 請求 Schema
 */
export const AddRecipeRequestSchema = z.object({
  user_language: z.string().optional().default("zh_TW"),
  user_input: z.string().optional(),
});

export type AddRecipeRequest = z.infer<typeof AddRecipeRequestSchema>;

/**
 * AddRecipe 回應 Schema
 */
export const AddRecipeResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      name: z.object({
        zh_TW: z.string(),
        zh_CN: z.string(),
        en: z.string(),
        ja: z.string(),
        ko: z.string(),
        vi: z.string(),
        th: z.string(),
        ms: z.string(),
        id: z.string(),
        fr: z.string(),
        de: z.string(),
        es: z.string(),
        pt_BR: z.string(),
      }),
      description: z.object({
        zh_TW: z.string(),
        zh_CN: z.string(),
        en: z.string(),
        ja: z.string(),
        ko: z.string(),
        vi: z.string(),
        th: z.string(),
        ms: z.string(),
        id: z.string(),
        fr: z.string(),
        de: z.string(),
        es: z.string(),
        pt_BR: z.string(),
      }),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      duration: z.number(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      servings: z.number(),
      ingredients: z.array(
        z.object({
          name: z.object({
            zh_TW: z.string(),
            zh_CN: z.string(),
            en: z.string(),
            ja: z.string(),
            ko: z.string(),
            vi: z.string(),
            th: z.string(),
            ms: z.string(),
            id: z.string(),
            fr: z.string(),
            de: z.string(),
            es: z.string(),
            pt_BR: z.string(),
          }),
          amountValue: z.number(),
          amountUnit: z.object({
            zh_TW: z.string(),
            zh_CN: z.string(),
            en: z.string(),
            ja: z.string(),
            ko: z.string(),
            vi: z.string(),
            th: z.string(),
            ms: z.string(),
            id: z.string(),
            fr: z.string(),
            de: z.string(),
            es: z.string(),
            pt_BR: z.string(),
          }),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          imageUrl: z.string().optional(),
          imageData: z.string().optional(),
        })
      ),
      steps: z.array(
        z.object({
          order: z.number(),
          stepDescription: z.object({
            zh_TW: z.string(),
            zh_CN: z.string(),
            en: z.string(),
            ja: z.string(),
            ko: z.string(),
            vi: z.string(),
            th: z.string(),
            ms: z.string(),
            id: z.string(),
            fr: z.string(),
            de: z.string(),
            es: z.string(),
            pt_BR: z.string(),
          }),
        })
      ),
      tags: z.array(z.string()),
      recipeHealthAssessment: z.object({
        score: z.number(),
        pros: z
          .object({
            zh_TW: z.array(z.string()),
            zh_CN: z.array(z.string()),
            en: z.array(z.string()),
            ja: z.array(z.string()),
            ko: z.array(z.string()),
            vi: z.array(z.string()),
            th: z.array(z.string()),
            ms: z.array(z.string()),
            id: z.array(z.string()),
            fr: z.array(z.string()),
            de: z.array(z.string()),
            es: z.array(z.string()),
            pt_BR: z.array(z.string()),
          })
          .optional(),
        cons: z
          .object({
            zh_TW: z.array(z.string()),
            zh_CN: z.array(z.string()),
            en: z.array(z.string()),
            ja: z.array(z.string()),
            ko: z.array(z.string()),
            vi: z.array(z.string()),
            th: z.array(z.string()),
            ms: z.array(z.string()),
            id: z.array(z.string()),
            fr: z.array(z.string()),
            de: z.array(z.string()),
            es: z.array(z.string()),
            pt_BR: z.array(z.string()),
          })
          .optional(),
      }),
    })
    .optional(),
  error: z.string().optional(),
});

export type AddRecipeResponse = z.infer<typeof AddRecipeResponseSchema>;

/**
 * 食譜創建的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const addRecipeJsonSchema = {
  type: "object",
  description: "Complete recipe data created from food images",
  properties: {
    name: {
      type: "object",
      description:
        "Recipe name (multi-language), concise without verbs or decorative words, no parenthetical notes, no comma supplements",
      properties: {
        zh_TW: { type: "string", description: "繁體中文" },
        zh_CN: { type: "string", description: "简体中文" },
        en: {
          type: "string",
          description:
            "English 英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'）",
        },
        ja: { type: "string", description: "日本語" },
        ko: { type: "string", description: "한국어" },
        vi: { type: "string", description: "Tiếng Việt" },
        th: { type: "string", description: "ภาษาไทย" },
        ms: { type: "string", description: "Bahasa Melayu" },
        id: { type: "string", description: "Bahasa Indonesia" },
        fr: { type: "string", description: "Français" },
        de: { type: "string", description: "Deutsch" },
        es: { type: "string", description: "Español" },
        pt_BR: { type: "string", description: "Português (Brasil)" },
      },
      required: [
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
      ],
    },
    description: {
      type: "object",
      description: "Recipe description (multi-language), 1-2 sentences brief introduction",
      properties: {
        zh_TW: { type: "string", description: "繁體中文" },
        zh_CN: { type: "string", description: "简体中文" },
        en: { type: "string", description: "English" },
        ja: { type: "string", description: "日本語" },
        ko: { type: "string", description: "한국어" },
        vi: { type: "string", description: "Tiếng Việt" },
        th: { type: "string", description: "ภาษาไทย" },
        ms: { type: "string", description: "Bahasa Melayu" },
        id: { type: "string", description: "Bahasa Indonesia" },
        fr: { type: "string", description: "Français" },
        de: { type: "string", description: "Deutsch" },
        es: { type: "string", description: "Español" },
        pt_BR: { type: "string", description: "Português (Brasil)" },
      },
      required: [
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
      ],
    },
    calories: {
      type: "number",
      description: "Total calories, must equal the sum of all ingredient calories",
      minimum: 0,
    },
    protein: {
      type: "number",
      description: "Total protein content (grams)",
      minimum: 0,
    },
    carbs: {
      type: "number",
      description: "Total carbohydrate content (grams)",
      minimum: 0,
    },
    fat: {
      type: "number",
      description: "Total fat content (grams)",
      minimum: 0,
    },
    duration: {
      type: "integer",
      description: "Estimated cooking time (minutes)",
      minimum: 1,
      maximum: 600,
    },
    difficulty: {
      type: "string",
      description: "Difficulty level",
      enum: ["easy", "medium", "hard"],
    },
    servings: {
      type: "integer",
      description: "Recommended servings (number of people)",
      minimum: 1,
      maximum: 30,
    },
    ingredients: {
      type: "array",
      description: "Ingredients list",
      items: {
        type: "object",
        description: "Recipe ingredient",
        properties: {
          name: {
            type: "object",
            description:
              "Ingredient name (multi-language), concise without verbs or decorative words, no parenthetical notes, no comma supplements",
            properties: {
              zh_TW: { type: "string", description: "繁體中文" },
              zh_CN: { type: "string", description: "简体中文" },
              en: {
                type: "string",
                description:
                  "English 英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'）",
              },
              ja: { type: "string", description: "日本語" },
              ko: { type: "string", description: "한국어" },
              vi: { type: "string", description: "Tiếng Việt" },
              th: { type: "string", description: "ภาษาไทย" },
              ms: { type: "string", description: "Bahasa Melayu" },
              id: { type: "string", description: "Bahasa Indonesia" },
              fr: { type: "string", description: "Français" },
              de: { type: "string", description: "Deutsch" },
              es: { type: "string", description: "Español" },
              pt_BR: { type: "string", description: "Português (Brasil)" },
            },
            required: [
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
            ],
          },
          amountValue: {
            type: "number",
            description: "Ingredient quantity value",
            minimum: 0,
          },
          amountUnit: {
            type: "object",
            description: "Ingredient unit (multi-language)",
            properties: {
              zh_TW: { type: "string", description: "繁體中文" },
              zh_CN: { type: "string", description: "简体中文" },
              en: { type: "string", description: "English" },
              ja: { type: "string", description: "日本語" },
              ko: { type: "string", description: "한국어" },
              vi: { type: "string", description: "Tiếng Việt" },
              th: { type: "string", description: "ภาษาไทย" },
              ms: { type: "string", description: "Bahasa Melayu" },
              id: { type: "string", description: "Bahasa Indonesia" },
              fr: { type: "string", description: "Français" },
              de: { type: "string", description: "Deutsch" },
              es: { type: "string", description: "Español" },
              pt_BR: { type: "string", description: "Português (Brasil)" },
            },
            required: [
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
            ],
          },
          calories: {
            type: "number",
            description:
              "Calories for this ingredient, must equal (protein × 4) + (carbs × 4) + (fat × 9)",
            minimum: 0,
          },
          protein: {
            type: "number",
            description: "Protein content of this ingredient (grams)",
            minimum: 0,
          },
          carbs: {
            type: "number",
            description: "Carbohydrate content of this ingredient (grams)",
            minimum: 0,
          },
          fat: {
            type: "number",
            description: "Fat content of this ingredient (grams)",
            minimum: 0,
          },
          imageUrl: {
            type: "string",
            description: "Ingredient image URL (optional, generated by AI)",
            format: "uri",
          },
          imageData: {
            type: "string",
            description: "Ingredient image base64 data (backup, used when URL is unavailable)",
          },
        },
        required: [
          "name",
          "amountValue",
          "amountUnit",
          "calories",
          "protein",
          "carbs",
          "fat",
        ],
      },
      minItems: 1,
    },
    steps: {
      type: "array",
      description: "Cooking steps list",
      items: {
        type: "object",
        description: "Recipe cooking step",
        properties: {
          order: {
            type: "integer",
            description: "Step order",
            minimum: 1,
          },
          stepDescription: {
            type: "object",
            description: "Step description (multi-language)",
            properties: {
              zh_TW: { type: "string", description: "繁體中文" },
              zh_CN: { type: "string", description: "简体中文" },
              en: { type: "string", description: "English" },
              ja: { type: "string", description: "日本語" },
              ko: { type: "string", description: "한국어" },
              vi: { type: "string", description: "Tiếng Việt" },
              th: { type: "string", description: "ภาษาไทย" },
              ms: { type: "string", description: "Bahasa Melayu" },
              id: { type: "string", description: "Bahasa Indonesia" },
              fr: { type: "string", description: "Français" },
              de: { type: "string", description: "Deutsch" },
              es: { type: "string", description: "Español" },
              pt_BR: { type: "string", description: "Português (Brasil)" },
            },
            required: [
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
            ],
          },
        },
        required: ["order", "stepDescription"],
      },
      minItems: 1,
    },
    tags: {
      type: "array",
      description: "Recipe tags",
      items: {
        type: "string",
        enum: [
          // 餐別分類
          "breakfast",
          "lunch",
          "dinner",
          "dessert",
          "beverage",
          // 飲食偏好
          "vegan",
          "vegetarian",
          "highProtein",
          "keto",
          "mediterranean",
          "lowGi",
          "lowCarb",
          "lowFat",
          // 料理形式
          "soup",
          "salad",
          "snack",
          "bento",
          "hotPot",
          "friedFood",
          "grilled",
          "noodles",
          "mainCourse",
          // 地區風味
          "taiwanese",
          "chinese",
          "japanese",
          "korean",
          "vietnam",
          "italian",
          "american",
          "indian",
          "mexican",
          "france",
          "malaysia",
          "singapore",
          "german",
          "spanish",
          "thai",
          "brazilian",
        ],
      },
    },
    recipeHealthAssessment: {
      type: "object",
      description: "Recipe health assessment (multi-language)",
      properties: {
        score: {
          type: "integer",
          description: "Health score (1-10), higher is healthier",
          minimum: 1,
          maximum: 10,
        },
        pros: {
          type: "object",
          description: "Advantages list (multi-language), maximum 4 items, nutrition-related only",
          properties: {
            zh_TW: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "繁體中文",
            },
            zh_CN: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "简体中文",
            },
            en: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "English",
            },
            ja: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "日本語",
            },
            ko: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "한국어",
            },
            vi: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Tiếng Việt",
            },
            th: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "ภาษาไทย",
            },
            ms: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Bahasa Melayu",
            },
            id: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Bahasa Indonesia",
            },
            fr: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Français",
            },
            de: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Deutsch",
            },
            es: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Español",
            },
            pt_BR: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Português (Brasil)",
            },
          },
          required: [
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
          ],
        },
        cons: {
          type: "object",
          description: "Disadvantages list (multi-language), maximum 4 items, nutrition-related only",
          properties: {
            zh_TW: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "繁體中文",
            },
            zh_CN: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "简体中文",
            },
            en: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "English",
            },
            ja: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "日本語",
            },
            ko: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "한국어",
            },
            vi: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Tiếng Việt",
            },
            th: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "ภาษาไทย",
            },
            ms: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Bahasa Melayu",
            },
            id: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Bahasa Indonesia",
            },
            fr: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Français",
            },
            de: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Deutsch",
            },
            es: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Español",
            },
            pt_BR: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Português (Brasil)",
            },
          },
          required: [
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
          ],
        },
      },
      required: ["score"],
    },
    error: {
      type: "string",
      description: "Error message (used when unable to analyze images)",
    },
  },
  required: [
    "name",
    "description",
    "calories",
    "protein",
    "carbs",
    "fat",
    "duration",
    "difficulty",
    "servings",
    "ingredients",
    "steps",
    "tags",
    "recipeHealthAssessment",
  ],
};
