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
  description: "餐點文字分析結果的結構化數據",
  properties: {
    name: {
      type: "string",
      description:
        "餐點名稱，應簡潔不含早午晚餐詞語、動詞或形容詞，使用用戶指定的語言",
    },
    portions: {
      type: "number",
      description: "整份餐點的份數，預設為 1",
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
            description:
              "食材名稱，使用用戶指定的語言（不是中文，除非用戶語言為中文）",
          },
          engName: {
            type: "string",
            description:
              "食材英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解",
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
            description:
              "食材的單位（如：份、顆、克等），使用用戶指定的語言（不是中文，除非用戶語言為中文）",
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
      description: "錯誤訊息（當無法分析文字時使用）",
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
  description: "分析使用者描述的食材，提供營養資訊和多語言翻譯",
  properties: {
    name: {
      type: "object",
      description: "食物名稱的多語言翻譯",
      properties: {
        zh_TW: { type: "string", description: "繁體中文名稱" },
        zh_CN: { type: "string", description: "簡體中文名稱" },
        en: {
          type: "string",
          description:
            "英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解",
        },
        ja: { type: "string", description: "日文名稱" },
        ko: { type: "string", description: "韓文名稱" },
        vi: { type: "string", description: "越南文名稱" },
        th: { type: "string", description: "泰文名稱" },
        ms: { type: "string", description: "馬來文名稱" },
        id: { type: "string", description: "印尼文名稱" },
        fr: { type: "string", description: "法文名稱" },
        de: { type: "string", description: "德文名稱" },
        es: { type: "string", description: "西班牙文名稱" },
        pt_BR: { type: "string", description: "葡萄牙文名稱" },
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
      description: "食材份量數值，必須為正數",
    },
    amountUnit: {
      type: "object",
      description: "食材份量單位的多語言翻譯",
      properties: {
        zh_TW: { type: "string", description: "繁體中文單位" },
        zh_CN: { type: "string", description: "簡體中文單位" },
        en: { type: "string", description: "英文單位" },
        ja: { type: "string", description: "日文單位" },
        ko: { type: "string", description: "韓文單位" },
        vi: { type: "string", description: "越南文單位" },
        th: { type: "string", description: "泰文單位" },
        ms: { type: "string", description: "馬來文單位" },
        id: { type: "string", description: "印尼文單位" },
        fr: { type: "string", description: "法文單位" },
        de: { type: "string", description: "德文單位" },
        es: { type: "string", description: "西班牙文單位" },
        pt_BR: { type: "string", description: "葡萄牙文單位" },
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
        "總熱量（kcal），必須嚴格按照公式計算：(protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "蛋白質含量（克），必須為非負數",
    },
    carbs: {
      type: "number",
      description: "碳水化合物含量（克），必須為非負數",
    },
    fat: {
      type: "number",
      description: "脂肪含量（克），必須為非負數",
    },
    error: {
      type: "string",
      description: "當無法辨識為食物時的錯誤訊息",
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
  description: "分析使用者描述的食材，提供營養資訊和份量估算",
  properties: {
    name: {
      type: "string",
      description: "食物名稱，使用指定語言回應",
    },
    engName: {
      type: "string",
      description:
        "食物英文名稱，優先使用單數形式，但若該食材的標準英文表達為複數則使用複數（如 'noodles', 'beans', 'oats'），不含括號註解",
    },
    amountValue: {
      type: "number",
      description: "食材份量數值，必須為正數",
    },
    amountUnit: {
      type: "string",
      description: "食材份量單位，如：g、ml、個、片等，使用指定語言回應",
    },
    calories: {
      type: "number",
      description:
        "總熱量（kcal），必須嚴格按照公式計算：(protein × 4) + (carbs × 4) + (fat × 9)",
    },
    protein: {
      type: "number",
      description: "蛋白質含量（克），必須為非負數",
    },
    carbs: {
      type: "number",
      description: "碳水化合物含量（克），必須為非負數",
    },
    fat: {
      type: "number",
      description: "脂肪含量（克），必須為非負數",
    },
    error: {
      type: "string",
      description: "當無法辨識為食物時的錯誤訊息",
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
