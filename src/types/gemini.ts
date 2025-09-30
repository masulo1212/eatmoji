import { z } from "zod";

/**
 * 食材項目介面
 */
export interface IngredientItem {
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
 * 健康評估介面
 */
export interface HealthAssessment {
  score: number;
  pros?: string[];
  cons?: string[];
}

/**
 * 餐點分析結果介面
 */
export interface MealAnalysisResult {
  name: string;
  portions: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: IngredientItem[];
  health_assessment: HealthAssessment;
  error?: string;
}

/**
 * AI 響應介面 - 適配 @google/genai
 */
export interface AIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name: string;
          args: any;
        };
      }>;
    };
  }>;
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
}

/**
 * Function Call 定義
 */
export interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
}

/**
 * Tool Config 定義
 */
export interface ToolConfig {
  functionCallingConfig: {
    mode: "ANY" | "AUTO" | "NONE";
    allowedFunctionNames?: string[];
  };
}

/**
 * Generation Config 定義
 */
export interface GenerationConfig {
  tools: Array<{
    functionDeclarations: FunctionCall[];
  }>;
  toolConfig: ToolConfig;
}

/**
 * 支援的語言類型
 */
export type SupportedLanguage =
  | "zh_TW"
  | "zh_CN"
  | "en"
  | "ja"
  | "ko"
  | "vi"
  | "th"
  | "ms"
  | "id"
  | "fr"
  | "de"
  | "es"
  | "pt_BR";

/**
 * AddMeal 請求 Schema
 */
export const AddMealRequestSchema = z.object({
  input: z
    .string()
    .min(1, "請輸入餐點描述")
    .max(1000, "餐點描述過長，請限制在 1000 字元以內"),
  user_language: z.string().optional().default("zh_TW"),
});

export type AddMealRequest = z.infer<typeof AddMealRequestSchema>;

/**
 * AddMeal 回應 Schema
 */
export const AddMealResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      name: z.string(),
      portions: z.number(),
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

export type AddMealResponse = z.infer<typeof AddMealResponseSchema>;

/**
 * 餐點分析的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const addMealJsonSchema = {
  type: "object",
  description: "Structured data for meal text analysis results",
  properties: {
    name: {
      type: "string",
      description:
        "Meal name, should be concise without breakfast/lunch/dinner terms, verbs or adjectives, using the user's specified language",
    },
    portions: {
      type: "number",
      description: "Number of portions for the entire meal, default is 1",
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
      description: "Total carbohydrate content (grams)",
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
              "Ingredient name, using the user's specified language (not Chinese unless the user's language is Chinese)",
          },
          engName: {
            type: "string",
            description:
              "English ingredient name, preferably use singular form, but use plural if the ingredient's standard English expression is plural (like 'noodles', 'beans', 'oats'), without parenthetical annotations",
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
            description: "Carbohydrate content of this ingredient (grams)",
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
              "Unit of the ingredient (such as: portions, pieces, grams, etc.), using the user's specified language (not Chinese unless the user's language is Chinese)",
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
          description: "List of advantages, maximum 4 items, only nutrition-related",
          items: {
            type: "string",
          },
          maxItems: 4,
        },
        cons: {
          type: "array",
          description: "List of disadvantages, maximum 4 items, only nutrition-related",
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
      description: "Error message (used when unable to analyze text)",
    },
  },
  required: [
    "name",
    "portions",
    "calories",
    "protein",
    "carbs",
    "fat",
    "ingredients",
    "health_assessment",
  ],
};

/**
 * 食材分析結果介面 - 用於 AddIngredient API
 */
export interface AddIngredientResult {
  name: string;
  engName: string;
  amountValue: number;
  amountUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  error?: string;
}

/**
 * AddIngredient 請求 Schema
 */
export const AddIngredientRequestSchema = z.object({
  input: z
    .string()
    .min(1, "請輸入食材描述")
    .max(500, "食材描述過長，請限制在 500 字元以內"),
  user_language: z.string().optional().default("zh_TW"),
});

export type AddIngredientRequest = z.infer<typeof AddIngredientRequestSchema>;

/**
 * AddIngredient 回應 Schema
 */
export const AddIngredientResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      name: z.string(),
      engName: z.string(),
      amountValue: z.number(),
      amountUnit: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

export type AddIngredientResponse = z.infer<typeof AddIngredientResponseSchema>;

/**
 * 多語言物件介面
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
 * 食譜食材分析結果介面 - 用於 AddRecipeIngredient API（多語言版本）
 */
export interface AddRecipeIngredientResult {
  name: MultiLanguageText;
  amountValue: number;
  amountUnit: MultiLanguageText;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  error?: string;
}

/**
 * AddRecipeIngredient 請求 Schema
 */
export const AddRecipeIngredientRequestSchema = z.object({
  input: z.string().min(1, "請輸入食材描述"),
  user_language: z.string().optional().default("zh_TW"),
});

export type AddRecipeIngredientRequest = z.infer<
  typeof AddRecipeIngredientRequestSchema
>;

/**
 * AddRecipeIngredient 回應 Schema
 */
export const AddRecipeIngredientResponseSchema = z.object({
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
    })
    .optional(),
  error: z.string().optional(),
});

export type AddRecipeIngredientResponse = z.infer<
  typeof AddRecipeIngredientResponseSchema
>;

/**
 * 食譜食材分析的 JSON Schema (用於 Gemini AI Function Calling) - 多語言版本
 */
export const addRecipeIngredientJsonSchema = {
  type: "object",
  description: "Analyze user-described ingredients, providing nutritional information and multi-language translations",
  properties: {
    name: {
      type: "object",
      description:
        "Multi-language translations of the food name, concise without verbs or decorative words, no parenthetical annotations, no comma supplements",
      properties: {
        zh_TW: { type: "string", description: "Traditional Chinese name" },
        zh_CN: { type: "string", description: "Simplified Chinese name" },
        en: {
          type: "string",
          description:
            "English name, prefer singular form, but use plural if the ingredient's standard English expression is plural (like 'noodles', 'beans', 'oats'), concise without verbs or decorative words, no parenthetical annotations, no comma supplements",
        },
        ja: { type: "string", description: "Japanese name" },
        ko: { type: "string", description: "Korean name" },
        vi: { type: "string", description: "Vietnamese name" },
        th: { type: "string", description: "Thai name" },
        ms: { type: "string", description: "Malay name" },
        id: { type: "string", description: "Indonesian name" },
        fr: { type: "string", description: "French name" },
        de: { type: "string", description: "German name" },
        es: { type: "string", description: "Spanish name" },
        pt_BR: { type: "string", description: "Portuguese name" },
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
      description: "Ingredient amount value, must be a positive number",
    },
    amountUnit: {
      type: "object",
      description: "Multi-language translations of ingredient amount unit",
      properties: {
        zh_TW: { type: "string", description: "Traditional Chinese unit" },
        zh_CN: { type: "string", description: "Simplified Chinese unit" },
        en: { type: "string", description: "English unit" },
        ja: { type: "string", description: "Japanese unit" },
        ko: { type: "string", description: "Korean unit" },
        vi: { type: "string", description: "Vietnamese unit" },
        th: { type: "string", description: "Thai unit" },
        ms: { type: "string", description: "Malay unit" },
        id: { type: "string", description: "Indonesian unit" },
        fr: { type: "string", description: "French unit" },
        de: { type: "string", description: "German unit" },
        es: { type: "string", description: "Spanish unit" },
        pt_BR: { type: "string", description: "Portuguese unit" },
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
        "Total calories (kcal), must be strictly calculated using the formula: (protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "Protein content (grams), must be non-negative",
    },
    carbs: {
      type: "number",
      description: "Carbohydrate content (grams), must be non-negative",
    },
    fat: {
      type: "number",
      description: "Fat content (grams), must be non-negative",
    },
    error: {
      type: "string",
      description: "Error message when unable to identify as food",
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
};

/**
 * 食材分析的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const addIngredientJsonSchema = {
  type: "object",
  description: "Analyze the ingredient described by the user, providing nutritional information and portion estimation",
  properties: {
    name: {
      type: "string",
      description:
        "Food name, respond in the specified language, concise without verbs or decorative words, no parenthetical notes, no comma supplements",
    },
    engName: {
      type: "string",
      description:
        "English food name, preferably use singular form, but use plural if the standard English expression for the ingredient is plural (e.g. 'noodles', 'beans', 'oats'), concise without verbs or decorative words, no parenthetical notes, no comma supplements",
    },
    amountValue: {
      type: "number",
      description: "Ingredient portion value, must be a positive number",
    },
    amountUnit: {
      type: "string",
      description: "Ingredient portion unit, such as: g, ml, pieces, slices, etc., respond in the specified language",
    },
    calories: {
      type: "number",
      description:
        "Total calories (kcal), must be calculated strictly according to the formula: (protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "Protein content (grams), must be non-negative",
    },
    carbs: {
      type: "number",
      description: "Carbohydrate content (grams), must be non-negative",
    },
    fat: {
      type: "number",
      description: "Fat content (grams), must be non-negative",
    },
    error: {
      type: "string",
      description: "Error message when unable to identify as food",
    },
  },
  required: [
    "name",
    "engName",
    "amountValue",
    "amountUnit",
    "calories",
    "protein",
    "carbs",
    "fat",
  ],
};

/**
 * 食譜步驟介面
 */
export interface RecipeStep {
  order: number;
  stepDescription: MultiLanguageText;
}

/**
 * 編輯食譜結果介面
 */
export interface EditRecipeResult {
  name: MultiLanguageText;
  description: MultiLanguageText;
  steps: RecipeStep[];
  error?: string;
}

/**
 * EditRecipe 請求 Schema
 */
export const EditRecipeRequestSchema = z.object({
  name: z.string().min(1, "食譜名稱不能為空"),
  description: z.string().min(1, "食譜描述不能為空"),
  step_texts: z.string().min(1, "步驟列表不能為空"),
  user_language: z.string().optional().default("zh_TW"),
});

export type EditRecipeRequest = z.infer<typeof EditRecipeRequestSchema>;

/**
 * EditRecipe 回應 Schema
 */
export const EditRecipeResponseSchema = z.object({
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
    })
    .optional(),
  error: z.string().optional(),
});

export type EditRecipeResponse = z.infer<typeof EditRecipeResponseSchema>;

/**
 * 翻譯食材結果介面
 */
export interface TranslateIngredientResult {
  original: string;
  english: string;
  error?: string;
}

/**
 * TranslateIngredient 請求 Schema
 */
export const TranslateIngredientRequestSchema = z.object({
  input: z
    .string()
    .min(1, "請輸入食材名稱")
    .max(200, "食材名稱過長，請限制在 200 字元以內"),
  user_language: z.string().optional().default("zh_TW"),
});

export type TranslateIngredientRequest = z.infer<typeof TranslateIngredientRequestSchema>;

/**
 * TranslateIngredient 回應 Schema
 */
export const TranslateIngredientResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      original: z.string(),
      english: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export type TranslateIngredientResponse = z.infer<typeof TranslateIngredientResponseSchema>;

/**
 * 翻譯食材的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const translateIngredientJsonSchema = {
  type: "object",
  description: "將任何語言的食材名稱翻譯成簡短的英文名稱",
  properties: {
    original: {
      type: "string",
      description: "原始食材名稱",
    },
    english: {
      type: "string",
      description: "英文食材名稱，必須是簡短的通用名稱，不含括號註解、逗號補充或其他裝飾詞語。例如：'chicken'、'rice'、'tomato'",
    },
    error: {
      type: "string",
      description: "當無法識別為食材時的錯誤訊息",
    },
  },
  required: ["original", "english"],
};

/**
 * 編輯食譜的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const editRecipeJsonSchema = {
  type: "object",
  description: "編輯食譜並提供多語言翻譯",
  properties: {
    name: {
      type: "object",
      description: "食譜名稱的多語言翻譯",
      properties: {
        zh_TW: { type: "string", description: "繁體中文" },
        zh_CN: { type: "string", description: "简体中文" },
        en: { type: "string", description: "English" },
        ja: { type: "string", description: "日本語" },
        ko: { type: "string", description: "한국어" },
        vi: { type: "string", description: "Tiếng Việt" },
        th: { type: "string", description: "ภaษาไทย" },
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
      description: "食譜描述的多語言翻譯",
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
    steps: {
      type: "array",
      description: "製作步驟列表，包含多語言翻譯",
      items: {
        type: "object",
        properties: {
          order: {
            type: "number",
            description: "步驟順序，從1開始的正整數",
            minimum: 1,
          },
          stepDescription: {
            type: "object",
            description: "步驟描述的多語言翻譯",
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
    error: {
      type: "string",
      description: "當步驟與食譜無關或其他錯誤時的錯誤訊息",
    },
  },
  required: ["name", "description", "steps"],
};
