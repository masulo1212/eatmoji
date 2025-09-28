import { z } from 'zod';

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
  result: z.object({
    name: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    ingredients: z.array(z.object({
      name: z.string(),
      engName: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      amountValue: z.number(),
      amountUnit: z.string(),
    })),
    health_assessment: z.object({
      score: z.number(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
    }),
  }).optional(),
  error: z.string().optional(),
});

export type AnalyzeImagesResponse = z.infer<typeof AnalyzeImagesResponseSchema>;

/**
 * 圖片分析的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const analyzeImagesJsonSchema = {
  type: "object",
  description: "圖片分析結果的結構化數據",
  properties: {
    name: {
      type: "string",
      description: "餐點名稱，應簡潔不含早午晚餐詞語、動詞或形容詞，使用用戶指定的語言",
    },
    calories: {
      type: "number",
      description: "總熱量，必須等於 (protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "總蛋白質含量（克）",
    },
    carbs: {
      type: "number",
      description: "總碳水化合物含量（克）",
    },
    fat: {
      type: "number",
      description: "總脂肪含量（克）",
    },
    ingredients: {
      type: "array",
      description: "食材成分列表",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "食材名稱，使用用戶指定的語言（不是中文，除非用戶語言為中文）",
          },
          engName: {
            type: "string",
            description: "食材英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解",
          },
          calories: {
            type: "number",
            description: "該食材的熱量",
          },
          protein: {
            type: "number",
            description: "該食材的蛋白質含量（克）",
          },
          carbs: {
            type: "number",
            description: "該食材的碳水化合物含量（克）",
          },
          fat: {
            type: "number",
            description: "該食材的脂肪含量（克）",
          },
          amountValue: {
            type: "number",
            description: "食材的數量值",
          },
          amountUnit: {
            type: "string",
            description: "食材的單位（如：份、顆、克等），使用用戶指定的語言（不是中文，除非用戶語言為中文）",
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
      description: "健康評估",
      properties: {
        score: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "健康評分，1-10的整數，越高越健康",
        },
        pros: {
          type: "array",
          description: "優點列表，最多4條，僅針對營養相關",
          items: {
            type: "string",
          },
          maxItems: 4,
        },
        cons: {
          type: "array",
          description: "缺點列表，最多4條，僅針對營養相關",
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
      description: "錯誤訊息（當無法分析圖片時使用）",
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

// ========== Recipe 相關型別定義 ==========

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
  result: z.object({
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
    ingredients: z.array(z.object({
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
    })),
    steps: z.array(z.object({
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
    })),
    tags: z.array(z.string()),
    recipeHealthAssessment: z.object({
      score: z.number(),
      pros: z.object({
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
      }).optional(),
      cons: z.object({
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
      }).optional(),
    }),
  }).optional(),
  error: z.string().optional(),
});

export type AddRecipeResponse = z.infer<typeof AddRecipeResponseSchema>;

/**
 * 食譜創建的 JSON Schema (用於 Gemini AI Function Calling)
 */
export const addRecipeJsonSchema = {
  type: "object",
  description: "從食物圖片創建的完整食譜資料",
  properties: {
    name: {
      type: "object",
      description: "食譜名稱（多語言），簡潔不含動詞或裝飾詞",
      properties: {
        zh_TW: { type: "string", description: "繁體中文" },
        zh_CN: { type: "string", description: "简体中文" },
        en: { type: "string", description: "English 英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解" },
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
      required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
    },
    description: {
      type: "object",
      description: "食譜描述（多語言），1-2句簡短介紹",
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
      required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
    },
    calories: {
      type: "number",
      description: "總熱量，必須等於所有食材熱量的總和",
      minimum: 0,
    },
    protein: {
      type: "number",
      description: "總蛋白質含量（克）",
      minimum: 0,
    },
    carbs: {
      type: "number",
      description: "總碳水化合物含量（克）",
      minimum: 0,
    },
    fat: {
      type: "number",
      description: "總脂肪含量（克）",
      minimum: 0,
    },
    duration: {
      type: "integer",
      description: "預估烹飪時間（分鐘）",
      minimum: 1,
      maximum: 600,
    },
    difficulty: {
      type: "string",
      description: "難易度",
      enum: ["easy", "medium", "hard"],
    },
    servings: {
      type: "integer",
      description: "建議份量（人數）",
      minimum: 1,
      maximum: 30,
    },
    ingredients: {
      type: "array",
      description: "食材列表",
      items: {
        type: "object",
        description: "食譜食材",
        properties: {
          name: {
            type: "object",
            description: "食材名稱（多語言）",
            properties: {
              zh_TW: { type: "string", description: "繁體中文" },
              zh_CN: { type: "string", description: "简体中文" },
              en: { type: "string", description: "English 英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解" },
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
            required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
          },
          amountValue: {
            type: "number",
            description: "食材數量值",
            minimum: 0,
          },
          amountUnit: {
            type: "object",
            description: "食材單位（多語言）",
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
            required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
          },
          calories: {
            type: "number",
            description: "該食材的熱量，必須等於 (protein × 4) + (carbs × 4) + (fat × 9)",
            minimum: 0,
          },
          protein: {
            type: "number",
            description: "該食材的蛋白質含量（克）",
            minimum: 0,
          },
          carbs: {
            type: "number",
            description: "該食材的碳水化合物含量（克）",
            minimum: 0,
          },
          fat: {
            type: "number",
            description: "該食材的脂肪含量（克）",
            minimum: 0,
          },
          imageUrl: {
            type: "string",
            description: "食材圖片的URL（可選，由AI生成）",
            format: "uri",
          },
          imageData: {
            type: "string",
            description: "食材圖片的base64數據（備用，當URL不可用時使用）",
          },
        },
        required: ["name", "amountValue", "amountUnit", "calories", "protein", "carbs", "fat"],
      },
      minItems: 1,
    },
    steps: {
      type: "array",
      description: "製作步驟列表",
      items: {
        type: "object",
        description: "食譜製作步驟",
        properties: {
          order: {
            type: "integer",
            description: "步驟順序",
            minimum: 1,
          },
          stepDescription: {
            type: "object",
            description: "步驟描述（多語言）",
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
            required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
          },
        },
        required: ["order", "stepDescription"],
      },
      minItems: 1,
    },
    tags: {
      type: "array",
      description: "食譜標籤",
      items: {
        type: "string",
        enum: [
          // 餐別分類
          "breakfast", "lunch", "dinner", "dessert", "beverage",
          // 飲食偏好
          "vegan", "vegetarian", "highProtein", "keto", "mediterranean", "lowGi", "lowCarb", "lowFat",
          // 料理形式
          "soup", "salad", "snack", "bento", "hotPot", "friedFood", "grilled", "noodles", "mainCourse",
          // 地區風味
          "taiwanese", "chinese", "japanese", "korean", "vietnam", "italian", "american", "indian", "mexican", "france", "malaysia", "singapore", "german", "spanish", "thai", "brazilian",
        ],
      },
    },
    recipeHealthAssessment: {
      type: "object",
      description: "食譜健康評估（多語言）",
      properties: {
        score: {
          type: "integer",
          description: "健康評分（1-10），越高越健康",
          minimum: 1,
          maximum: 10,
        },
        pros: {
          type: "object",
          description: "優點列表（多語言），最多4條，僅針對營養相關",
          properties: {
            zh_TW: { type: "array", items: { type: "string" }, maxItems: 4, description: "繁體中文" },
            zh_CN: { type: "array", items: { type: "string" }, maxItems: 4, description: "简体中文" },
            en: { type: "array", items: { type: "string" }, maxItems: 4, description: "English" },
            ja: { type: "array", items: { type: "string" }, maxItems: 4, description: "日本語" },
            ko: { type: "array", items: { type: "string" }, maxItems: 4, description: "한국어" },
            vi: { type: "array", items: { type: "string" }, maxItems: 4, description: "Tiếng Việt" },
            th: { type: "array", items: { type: "string" }, maxItems: 4, description: "ภาษาไทย" },
            ms: { type: "array", items: { type: "string" }, maxItems: 4, description: "Bahasa Melayu" },
            id: { type: "array", items: { type: "string" }, maxItems: 4, description: "Bahasa Indonesia" },
            fr: { type: "array", items: { type: "string" }, maxItems: 4, description: "Français" },
            de: { type: "array", items: { type: "string" }, maxItems: 4, description: "Deutsch" },
            es: { type: "array", items: { type: "string" }, maxItems: 4, description: "Español" },
            pt_BR: { type: "array", items: { type: "string" }, maxItems: 4, description: "Português (Brasil)" },
          },
          required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
        },
        cons: {
          type: "object",
          description: "缺點列表（多語言），最多4條，僅針對營養相關",
          properties: {
            zh_TW: { type: "array", items: { type: "string" }, maxItems: 4, description: "繁體中文" },
            zh_CN: { type: "array", items: { type: "string" }, maxItems: 4, description: "简体中文" },
            en: { type: "array", items: { type: "string" }, maxItems: 4, description: "English" },
            ja: { type: "array", items: { type: "string" }, maxItems: 4, description: "日本語" },
            ko: { type: "array", items: { type: "string" }, maxItems: 4, description: "한국어" },
            vi: { type: "array", items: { type: "string" }, maxItems: 4, description: "Tiếng Việt" },
            th: { type: "array", items: { type: "string" }, maxItems: 4, description: "ภาษาไทย" },
            ms: { type: "array", items: { type: "string" }, maxItems: 4, description: "Bahasa Melayu" },
            id: { type: "array", items: { type: "string" }, maxItems: 4, description: "Bahasa Indonesia" },
            fr: { type: "array", items: { type: "string" }, maxItems: 4, description: "Français" },
            de: { type: "array", items: { type: "string" }, maxItems: 4, description: "Deutsch" },
            es: { type: "array", items: { type: "string" }, maxItems: 4, description: "Español" },
            pt_BR: { type: "array", items: { type: "string" }, maxItems: 4, description: "Português (Brasil)" },
          },
          required: ["zh_TW", "zh_CN", "en", "ja", "ko", "vi", "th", "ms", "id", "fr", "de", "es", "pt_BR"],
        },
      },
      required: ["score"],
    },
    error: {
      type: "string",
      description: "錯誤訊息（當無法分析圖片時使用）",
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