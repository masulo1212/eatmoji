import type { Env } from "../bindings";
import { IGeminiService } from "../controllers/geminiController";
import {
  AnalyzeIngredientItem,
  ImageAnalysisResult,
  ImagePart,
  RecipeAnalysisResult,
  addRecipeJsonSchema,
  analyzeImagesJsonSchema,
} from "../types/analyze";
import {
  AIResponse,
  AddIngredientResult,
  AddRecipeIngredientResult,
  EditRecipeResult,
  GenerationConfig,
  IngredientItem,
  MealAnalysisResult,
  SupportedLanguage,
  TranslateIngredientResult,
  addIngredientJsonSchema,
  addMealJsonSchema,
  addRecipeIngredientJsonSchema,
  editRecipeJsonSchema,
  translateIngredientJsonSchema,
} from "../types/gemini";
import {
  createAnalyzePrompt,
  generateAddRecipePrompt,
} from "../utils/analyzePrompts";
import {
  createAddIngredientPrompt,
  createAddMealPrompt,
  createAddRecipeIngredientPrompt,
  createEditRecipePrompt,
  createTranslateIngredientPrompt,
} from "../utils/geminiPrompts";
import { arrayBufferToBase64, getImageMimeType } from "../utils/imageUtils";
import { TokenCacheManager } from "../utils/TokenCacheManager";

/**
 * Vertex AI 服務類
 * 使用 Google Cloud Vertex AI 進行餐點分析和圖片分析
 */
export class VertexAIService implements IGeminiService {
  /**
   * 分析餐點文字描述
   * @param userInput 用戶輸入的文字描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns 分析結果
   */
  async analyzeMealText(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<MealAnalysisResult> {
    // 準備提示詞
    const prompt = createAddMealPrompt(userInput, userLanguage);

    // 配置 function calling
    const generationConfig = this._createGenerationConfig();

    // 調用 Vertex AI API
    const result = await this._callVertexAI(
      env,
      prompt,
      generationConfig,
      "gemini-2.5-flash-lite"
    );

    const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
      ?.functionCall?.args;

    console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

    // 解析回應
    const analysisResult = this._parseAIResponse(result);

    if (Object.keys(analysisResult).length === 0) {
      throw new Error("Vertex AI 未能生成有效的分析結果");
    }

    return analysisResult;
  }

  /**
   * 分析食材文字描述 - VertexAIService 不支援此功能
   * @param userInput 用戶輸入的食材描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns 拋出未實現錯誤
   */
  async analyzeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<AddIngredientResult> {
    try {
      // 準備提示詞
      const prompt = createAddIngredientPrompt(userInput, userLanguage);

      // 配置 function calling
      const generationConfig = this._createIngredientGenerationConfig();

      // 調用 Vertex AI API
      const result = await this._callVertexAI(env, prompt, generationConfig);

      const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
        ?.functionCall?.args;

      console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

      // 解析回應
      const analysisResult = this._parseIngredientAIResponse(result);

      return analysisResult;
    } catch (error) {
      console.error("VertexAIService - 食材分析失敗:", error);
      throw new Error(`食材分析失敗: ${(error as Error).message}`);
    }
  }

  /**
   * 調用 Vertex AI API
   * 現在使用 TokenCacheManager 獲取快取的 Access Token，避免 524 超時問題
   */
  private async _callVertexAI(
    env: Env,
    prompt: string,
    generationConfig: GenerationConfig,
    model: string = "gemini-2.5-flash-lite",
    ctx?: ExecutionContext
  ): Promise<AIResponse> {
    // 使用 TokenCacheManager 獲取 Access Token（快取優化）
    const accessToken = await TokenCacheManager.getAccessToken(env);

    // 背景刷新 token（如果需要）
    if (ctx) {
      TokenCacheManager.scheduleTokenRefresh(env, ctx);
    }

    // 構建 Vertex AI API 端點
    const apiUrl = `https://${env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.VERTEX_AI_PROJECT_ID}/locations/${env.VERTEX_AI_LOCATION}/publishers/google/models/${model}:generateContent`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      tools: generationConfig.tools,
      toolConfig: generationConfig.toolConfig,
    };

    console.log("🤖 調用 Vertex AI API, 模型:", model);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Vertex AI API 調用失敗:", response.status, errorText);
        throw new Error(
          `Vertex AI API 調用失敗: ${response.status} ${errorText}`
        );
      }

      const result = (await response.json()) as AIResponse;
      console.log("✅ Vertex AI API 調用成功");
      return result;
    } catch (error) {
      console.error("❌ Vertex AI API 調用失敗:", error);
      throw error;
    }
  }

  /**
   * 創建 AI 生成配置
   */
  private _createGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "analyze_meal_text",
              description: "分析餐點文字描述並返回營養資訊和健康評估",
              parameters: addMealJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["analyze_meal_text"],
        },
      },
    };
  }

  /**
   * 解析 AI 回應（與 GeminiService 相同的邏輯）
   */
  private _parseAIResponse(result: AIResponse): MealAnalysisResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "analyze_meal_text") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "analyze_meal_text"
          ) {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessResult(responseObject);
  }

  /**
   * 從文字回應中解析 JSON
   */
  private _parseJsonFromText(result: AIResponse): Record<string, any> {
    const candidate = result.candidates?.[0];
    if (!candidate?.content?.parts) return {};

    for (const part of candidate.content.parts) {
      if (part.text) {
        console.log("找到文字格式，嘗試解析 JSON");
        try {
          let jsonText = part.text.trim();

          // 移除 markdown 代碼塊標記
          if (jsonText.startsWith("```json")) {
            jsonText = jsonText
              .replace(/^```json\s*/, "")
              .replace(/\s*```$/, "");
          } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          const parsed = JSON.parse(jsonText);
          console.log("成功從文字解析 JSON");
          return parsed;
        } catch (parseError) {
          console.log("從文字解析 JSON 失敗:", (parseError as Error).message);
        }
      }
    }

    return {};
  }

  /**
   * 驗證和處理結果（與 GeminiService 相同的邏輯）
   */
  private _validateAndProcessResult(responseObject: any): MealAnalysisResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的分析結果",
      } as MealAnalysisResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as MealAnalysisResult;
    }

    // 驗證必要欄位
    if (!this._validateAddMealResult(responseObject)) {
      return { error: "API 回應格式不正確" } as MealAnalysisResult;
    }

    // 校正每個食材的熱量
    if (
      responseObject.ingredients &&
      Array.isArray(responseObject.ingredients)
    ) {
      responseObject.ingredients = responseObject.ingredients.map(
        (ingredient: IngredientItem): IngredientItem => {
          const calculatedCalories =
            ingredient.protein * 4 + ingredient.carbs * 4 + ingredient.fat * 9;
          const calorieDifference = Math.abs(
            ingredient.calories - calculatedCalories
          );

          if (calorieDifference > 5) {
            // 允許 5 卡路里的誤差
            console.warn(
              `食材 ${ingredient.name} 熱量計算不符合公式，自動修正:`,
              {
                原始: ingredient.calories,
                計算: calculatedCalories,
              }
            );
            ingredient.calories = Math.round(calculatedCalories);
          }

          return ingredient;
        }
      );
    }

    // 計算所有食材的總營養素
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    if (
      responseObject.ingredients &&
      Array.isArray(responseObject.ingredients)
    ) {
      responseObject.ingredients.forEach((ingredient: IngredientItem) => {
        totalCalories += ingredient.calories || 0;
        totalProtein += ingredient.protein || 0;
        totalCarbs += ingredient.carbs || 0;
        totalFat += ingredient.fat || 0;
      });
    }

    // 替換最外層的營養素數據
    const originalOuterCalories = responseObject.calories;
    responseObject.calories = Math.round(totalCalories);
    responseObject.protein = Math.round(totalProtein * 10) / 10; // 保留一位小數
    responseObject.carbs = Math.round(totalCarbs * 10) / 10;
    responseObject.fat = Math.round(totalFat * 10) / 10;

    console.log("營養素總計算結果:", {
      原始外層熱量: originalOuterCalories,
      修正後外層熱量: responseObject.calories,
      總蛋白質: responseObject.protein,
      總碳水: responseObject.carbs,
      總脂肪: responseObject.fat,
    });

    return responseObject as MealAnalysisResult;
  }

  /**
   * 驗證餐點分析結果格式
   */
  private _validateAddMealResult(result: any): boolean {
    const requiredFields = [
      "name",
      "portions",
      "calories",
      "protein",
      "carbs",
      "fat",
      "ingredients",
      "health_assessment",
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位是否為數字
    const numericFields = ["portions", "calories", "protein", "carbs", "fat"];
    for (const field of numericFields) {
      if (typeof result[field] !== "number" || isNaN(result[field])) {
        console.error(`欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof result.name !== "string" || result.name.trim() === "") {
      console.error("餐點名稱必須為非空字串");
      return false;
    }

    // 檢查食材陣列
    if (!Array.isArray(result.ingredients)) {
      console.error("ingredients 必須為陣列");
      return false;
    }

    // 驗證每個食材的格式
    for (let i = 0; i < result.ingredients.length; i++) {
      const ingredient = result.ingredients[i];
      if (!this._validateIngredientItem(ingredient, i)) {
        return false;
      }
    }

    // 檢查健康評估
    if (
      !result.health_assessment ||
      typeof result.health_assessment !== "object"
    ) {
      console.error("health_assessment 必須為物件");
      return false;
    }

    if (
      typeof result.health_assessment.score !== "number" ||
      result.health_assessment.score < 1 ||
      result.health_assessment.score > 10
    ) {
      console.error("health_assessment.score 必須為 1-10 的數字");
      return false;
    }

    return true;
  }

  /**
   * 驗證單個食材項目
   */
  private _validateIngredientItem(ingredient: any, index: number): boolean {
    const requiredFields = [
      "name",
      "engName",
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
      "amountUnit",
    ];

    for (const field of requiredFields) {
      if (!(field in ingredient)) {
        console.error(`食材 ${index} 缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
    ];
    for (const field of numericFields) {
      if (typeof ingredient[field] !== "number" || isNaN(ingredient[field])) {
        console.error(`食材 ${index} 的欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof ingredient.name !== "string" || ingredient.name.trim() === "") {
      console.error(`食材 ${index} 的名稱必須為非空字串`);
      return false;
    }

    if (
      typeof ingredient.engName !== "string" ||
      ingredient.engName.trim() === ""
    ) {
      console.error(`食材 ${index} 的英文名稱必須為非空字串`);
      return false;
    }

    if (
      typeof ingredient.amountUnit !== "string" ||
      ingredient.amountUnit.trim() === ""
    ) {
      console.error(`食材 ${index} 的單位必須為非空字串`);
      return false;
    }

    return true;
  }

  /**
   * 分析食譜食材文字描述 - 多語言版本
   * @param userInput 用戶輸入的食材描述
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns 分析結果
   */
  async analyzeRecipeIngredient(
    userInput: string,
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<AddRecipeIngredientResult> {
    try {
      console.log("VertexAIService - 開始分析食譜食材");

      // 準備提示詞
      const prompt = createAddRecipeIngredientPrompt(userInput, userLanguage);

      // 配置 function calling
      const generationConfig = this._createRecipeIngredientGenerationConfig();

      // 調用 Vertex AI API
      const result = await this._callVertexAI(env, prompt, generationConfig);

      const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
        ?.functionCall?.args;

      console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

      // 解析回應
      const analysisResult = this._parseRecipeIngredientAIResponse(result);

      return analysisResult;
    } catch (error) {
      console.error("VertexAIService - 食譜食材分析失敗:", error);
      throw new Error(`食譜食材分析失敗: ${(error as Error).message}`);
    }
  }

  /**
   * 分析圖片內容
   * @param imageFiles 圖片文件數組
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @param userInput 用戶額外輸入
   * @returns 分析結果
   */
  async analyzeImages(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput: string | null = null
  ): Promise<ImageAnalysisResult> {
    // 準備提示詞
    const prompt = createAnalyzePrompt(userLanguage, userInput);

    // 處理圖片數據
    const imageParts = await this._processImageFiles(imageFiles);

    // 配置 function calling
    const generationConfig = this._createImageAnalysisGenerationConfig();

    // 調用 Vertex AI API
    const result = await this._callVertexAIWithImages(
      env,
      prompt,
      imageParts,
      generationConfig,
      "gemini-2.5-flash-lite"
    );

    const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
      ?.functionCall?.args;

    console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

    // 解析回應
    const analysisResult = this._parseImageAnalysisResponse(result);

    if (Object.keys(analysisResult).length === 0) {
      throw new Error("Vertex AI 未能生成有效的分析結果");
    }

    return analysisResult;
  }

  /**
   * 從圖片創建食譜
   * @param imageFiles 圖片文件列表
   * @param userLanguage 使用者語言
   * @param env 環境變數
   * @param userInput 用戶額外輸入
   * @returns 分析結果
   */
  async createRecipeFromImages(
    imageFiles: File[],
    userLanguage: SupportedLanguage,
    env: Env,
    userInput: string | null = null
  ): Promise<RecipeAnalysisResult> {
    // 準備提示詞
    const prompt: string = generateAddRecipePrompt(userLanguage, userInput);

    // 處理圖片
    const imageParts: ImagePart[] = await this._processImageFiles(imageFiles);

    // 配置 function calling
    const generationConfig: GenerationConfig =
      this._createRecipeGenerationConfig();

    // 調用 Vertex AI API （使用 gemini-2.5-flash）
    const result: AIResponse = await this._callVertexAIWithImages(
      env,
      prompt,
      imageParts,
      generationConfig,
      "gemini-2.5-flash-lite"
    );

    const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
      ?.functionCall?.args;

    console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

    // 解析回應
    const analysisResult: RecipeAnalysisResult =
      this._parseRecipeAnalysisResponse(result);

    if (Object.keys(analysisResult).length === 0) {
      throw new Error("Vertex AI 未能生成有效的分析結果");
    }

    return analysisResult;
  }

  /**
   * 處理圖片文件，轉換為 AI 可用格式
   * @param imageFiles 圖片檔案陣列
   * @returns 處理後的圖片部分陣列
   */
  private async _processImageFiles(imageFiles: File[]): Promise<ImagePart[]> {
    const imageParts: ImagePart[] = [];

    for (const file of imageFiles) {
      const buffer: ArrayBuffer = await file.arrayBuffer();
      const base64Data: string = arrayBufferToBase64(buffer);
      const mimeType: string = file.type || getImageMimeType(buffer);

      imageParts.push({
        inlineData: { data: base64Data, mimeType: mimeType },
      });
    }

    return imageParts;
  }

  /**
   * 調用 Vertex AI API（圖片 + 文字輸入）
   * 現在使用 TokenCacheManager 獲取快取的 Access Token，避免 524 超時問題
   */
  private async _callVertexAIWithImages(
    env: Env,
    prompt: string,
    imageParts: ImagePart[],
    generationConfig: GenerationConfig,
    model: string = "gemini-2.5-flash-lite",
    ctx?: ExecutionContext
  ): Promise<AIResponse> {
    // 使用 TokenCacheManager 獲取 Access Token（快取優化）
    const accessToken = await TokenCacheManager.getAccessToken(env);

    // 背景刷新 token（如果需要）
    if (ctx) {
      TokenCacheManager.scheduleTokenRefresh(env, ctx);
    }

    // 構建 Vertex AI API 端點
    const apiUrl = `https://${env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.VERTEX_AI_PROJECT_ID}/locations/${env.VERTEX_AI_LOCATION}/publishers/google/models/${model}:generateContent`;

    // 構建內容，包含文字和圖片
    const parts = [{ text: prompt }, ...imageParts];

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      tools: generationConfig.tools,
      toolConfig: generationConfig.toolConfig,
    };

    console.log("🤖 調用 Vertex AI API (帶圖片), 模型:", model);
    console.log("📝 請求內容:", {
      prompt長度: prompt.length,
      圖片數量: imageParts.length,
      工具配置: generationConfig.tools?.length || 0,
    });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Vertex AI API 調用失敗:", response.status, errorText);
        throw new Error(
          `Vertex AI API 調用失敗: ${response.status} ${errorText}`
        );
      }

      const result = (await response.json()) as AIResponse;
      console.log("✅ Vertex AI API 調用成功");
      return result;
    } catch (error) {
      console.error("❌ Vertex AI API 調用失敗:", error);
      throw error;
    }
  }

  /**
   * 創建圖片分析生成配置
   */
  private _createImageAnalysisGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "analyze_food_image",
              description: "分析食物圖片並返回營養資訊和健康評估",
              parameters: analyzeImagesJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["analyze_food_image"],
        },
      },
    };
  }

  /**
   * 創建食譜 AI 生成配置
   */
  private _createRecipeGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "create_recipe",
              description: "從食物圖片創建完整食譜，包含多語言翻譯和營養分析",
              parameters: addRecipeJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["create_recipe"],
        },
      },
    };
  }

  /**
   * 解析圖片分析 AI 回應
   */
  private _parseImageAnalysisResponse(result: AIResponse): ImageAnalysisResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "analyze_food_image") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "analyze_food_image"
          ) {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessImageAnalysisResult(responseObject);
  }

  /**
   * 解析食譜 AI 回應
   */
  private _parseRecipeAnalysisResponse(
    result: AIResponse
  ): RecipeAnalysisResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "create_recipe") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall && part.functionCall.name === "create_recipe") {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessRecipeAnalysisResult(responseObject);
  }

  /**
   * 驗證和處理圖片分析結果
   */
  private _validateAndProcessImageAnalysisResult(
    responseObject: any
  ): ImageAnalysisResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的分析結果",
      } as ImageAnalysisResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as ImageAnalysisResult;
    }

    // 驗證必要欄位
    if (!this._validateImageAnalysisResult(responseObject)) {
      return { error: "API 回應格式不正確" } as ImageAnalysisResult;
    }

    // 校正每個食材的熱量
    if (
      responseObject.ingredients &&
      Array.isArray(responseObject.ingredients)
    ) {
      responseObject.ingredients = responseObject.ingredients.map(
        (ingredient: AnalyzeIngredientItem): AnalyzeIngredientItem => {
          const calculatedCalories =
            ingredient.protein * 4 + ingredient.carbs * 4 + ingredient.fat * 9;
          const calorieDifference = Math.abs(
            ingredient.calories - calculatedCalories
          );

          if (calorieDifference > 5) {
            // 允許 5 卡路里的誤差
            console.warn(
              `食材 ${ingredient.name} 熱量計算不符合公式，自動修正:`,
              {
                原始: ingredient.calories,
                計算: calculatedCalories,
              }
            );
            ingredient.calories = Math.round(calculatedCalories);
          }

          return ingredient;
        }
      );
    }

    // 計算所有食材的總營養素
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    if (
      responseObject.ingredients &&
      Array.isArray(responseObject.ingredients)
    ) {
      responseObject.ingredients.forEach(
        (ingredient: AnalyzeIngredientItem) => {
          totalCalories += ingredient.calories || 0;
          totalProtein += ingredient.protein || 0;
          totalCarbs += ingredient.carbs || 0;
          totalFat += ingredient.fat || 0;
        }
      );
    }

    // 替換最外層的營養素數據
    const originalOuterCalories = responseObject.calories;
    responseObject.calories = Math.round(totalCalories);
    responseObject.protein = Math.round(totalProtein * 10) / 10; // 保留一位小數
    responseObject.carbs = Math.round(totalCarbs * 10) / 10;
    responseObject.fat = Math.round(totalFat * 10) / 10;

    console.log("營養素總計算結果:", {
      原始外層熱量: originalOuterCalories,
      修正後外層熱量: responseObject.calories,
      總蛋白質: responseObject.protein,
      總碳水: responseObject.carbs,
      總脂肪: responseObject.fat,
    });

    return responseObject as ImageAnalysisResult;
  }

  /**
   * 驗證和處理食譜結果
   */
  private _validateAndProcessRecipeAnalysisResult(
    responseObject: any
  ): RecipeAnalysisResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的分析結果",
      } as RecipeAnalysisResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as RecipeAnalysisResult;
    }

    // 驗證必要欄位
    if (!this._validateRecipeAnalysisResult(responseObject)) {
      return { error: "API 回應格式不正確" } as RecipeAnalysisResult;
    }

    // 校正每個食材的熱量
    if (
      responseObject.ingredients &&
      Array.isArray(responseObject.ingredients)
    ) {
      for (const ingredient of responseObject.ingredients) {
        this._correctRecipeIngredientCalories(ingredient);
      }
    }

    // 計算並校正總營養素
    this._calculateAndCorrectTotalNutrition(responseObject);

    return responseObject as RecipeAnalysisResult;
  }

  /**
   * 驗證圖片分析結果格式
   */
  private _validateImageAnalysisResult(result: any): boolean {
    const requiredFields = [
      "name",
      "calories",
      "protein",
      "carbs",
      "fat",
      "ingredients",
      "health_assessment",
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位是否為數字
    const numericFields = ["calories", "protein", "carbs", "fat"];
    for (const field of numericFields) {
      if (typeof result[field] !== "number" || isNaN(result[field])) {
        console.error(`欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof result.name !== "string" || result.name.trim() === "") {
      console.error("餐點名稱必須為非空字串");
      return false;
    }

    // 檢查食材陣列
    if (!Array.isArray(result.ingredients)) {
      console.error("ingredients 必須為陣列");
      return false;
    }

    // 驗證每個食材的格式
    for (let i = 0; i < result.ingredients.length; i++) {
      const ingredient = result.ingredients[i];
      if (!this._validateAnalyzeIngredientItem(ingredient, i)) {
        return false;
      }
    }

    // 檢查健康評估
    if (
      !result.health_assessment ||
      typeof result.health_assessment !== "object"
    ) {
      console.error("health_assessment 必須為物件");
      return false;
    }

    if (
      typeof result.health_assessment.score !== "number" ||
      result.health_assessment.score < 1 ||
      result.health_assessment.score > 10
    ) {
      console.error("health_assessment.score 必須為 1-10 的數字");
      return false;
    }

    return true;
  }

  /**
   * 驗證圖片分析食材項目
   */
  private _validateAnalyzeIngredientItem(
    ingredient: any,
    index: number
  ): boolean {
    const requiredFields = [
      "name",
      "engName",
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
      "amountUnit",
    ];

    for (const field of requiredFields) {
      if (!(field in ingredient)) {
        console.error(`食材 ${index} 缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
    ];
    for (const field of numericFields) {
      if (typeof ingredient[field] !== "number" || isNaN(ingredient[field])) {
        console.error(`食材 ${index} 的欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof ingredient.name !== "string" || ingredient.name.trim() === "") {
      console.error(`食材 ${index} 的名稱必須為非空字串`);
      return false;
    }

    if (
      typeof ingredient.engName !== "string" ||
      ingredient.engName.trim() === ""
    ) {
      console.error(`食材 ${index} 的英文名稱必須為非空字串`);
      return false;
    }

    if (
      typeof ingredient.amountUnit !== "string" ||
      ingredient.amountUnit.trim() === ""
    ) {
      console.error(`食材 ${index} 的單位必須為非空字串`);
      return false;
    }

    return true;
  }

  /**
   * 驗證食譜結果格式
   */
  private _validateRecipeAnalysisResult(result: any): boolean {
    const requiredFields: string[] = [
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
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields: string[] = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "duration",
      "servings",
    ];
    for (const field of numericFields) {
      if (typeof result[field] !== "number" || isNaN(result[field])) {
        console.error(`欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查陣列欄位
    if (!Array.isArray(result.ingredients)) {
      console.error("ingredients 必須為陣列");
      return false;
    }

    if (!Array.isArray(result.steps)) {
      console.error("steps 必須為陣列");
      return false;
    }

    // 驗證每個食材
    for (const ingredient of result.ingredients) {
      if (!this._validateRecipeIngredientItem(ingredient)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 驗證食譜食材項目
   */
  private _validateRecipeIngredientItem(ingredient: any): boolean {
    const requiredFields: string[] = [
      "name",
      "amountValue",
      "amountUnit",
      "calories",
      "protein",
      "carbs",
      "fat",
    ];

    for (const field of requiredFields) {
      if (!(field in ingredient)) {
        console.error(`食材缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields: string[] = [
      "amountValue",
      "calories",
      "protein",
      "carbs",
      "fat",
    ];
    for (const field of numericFields) {
      if (typeof ingredient[field] !== "number" || isNaN(ingredient[field])) {
        console.error(`食材欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    return true;
  }

  /**
   * 校正食譜食材熱量
   */
  private _correctRecipeIngredientCalories(ingredient: any): void {
    if (!ingredient.protein || !ingredient.carbs || !ingredient.fat) {
      return;
    }

    const calculatedCalories: number =
      ingredient.protein * 4 + ingredient.carbs * 4 + ingredient.fat * 9;

    const calorieDifference: number = Math.abs(
      ingredient.calories - calculatedCalories
    );

    if (calorieDifference > 5) {
      // 允許 5 卡路里的誤差
      console.warn(
        `校正食材 ${ingredient.name?.zh_TW || ingredient.name} 的熱量:`,
        {
          原始: ingredient.calories,
          計算: calculatedCalories,
          蛋白質: ingredient.protein,
          碳水: ingredient.carbs,
          脂肪: ingredient.fat,
        }
      );
      ingredient.calories = Math.round(calculatedCalories);
    }
  }

  /**
   * 計算並校正總營養素
   */
  private _calculateAndCorrectTotalNutrition(recipe: any): void {
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      return;
    }

    // 計算所有食材的營養素總和
    let totalCalories: number = 0;
    let totalProtein: number = 0;
    let totalCarbs: number = 0;
    let totalFat: number = 0;

    for (const ingredient of recipe.ingredients) {
      totalCalories += ingredient.calories || 0;
      totalProtein += ingredient.protein || 0;
      totalCarbs += ingredient.carbs || 0;
      totalFat += ingredient.fat || 0;
    }

    console.log("計算總營養素:", {
      總熱量: totalCalories,
      總蛋白質: totalProtein,
      總碳水: totalCarbs,
      總脂肪: totalFat,
    });

    // 替換最外層的營養素數據
    recipe.calories = Math.round(totalCalories);
    recipe.protein = Math.round(totalProtein * 10) / 10; // 保留一位小數
    recipe.carbs = Math.round(totalCarbs * 10) / 10;
    recipe.fat = Math.round(totalFat * 10) / 10;

    console.log("更新後的總營養素:", {
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    });
  }

  /**
   * 創建食材分析的 AI 生成配置
   */
  private _createIngredientGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "analyze_ingredient",
              description: "分析使用者描述的食材，提供營養資訊和份量估算",
              parameters: addIngredientJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["analyze_ingredient"],
        },
      },
    };
  }

  /**
   * 創建食譜食材分析的 AI 生成配置
   */
  private _createRecipeIngredientGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "analyze_recipe_ingredient",
              description: "分析使用者描述的食譜食材，提供營養資訊和多語言翻譯",
              parameters: addRecipeIngredientJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["analyze_recipe_ingredient"],
        },
      },
    };
  }

  /**
   * 編輯食譜
   * @param name 食譜名稱
   * @param description 食譜描述
   * @param stepTexts 步驟文字陣列
   * @param userLanguage 用戶語言
   * @param env 環境變數
   * @returns 編輯結果
   */
  async editRecipe(
    name: string,
    description: string,
    stepTexts: string[],
    userLanguage: SupportedLanguage,
    env: Env
  ): Promise<EditRecipeResult> {
    try {
      console.log("VertexAIService - 開始編輯食譜");

      // 生成提示詞
      const prompt = createEditRecipePrompt(
        name,
        description,
        stepTexts,
        userLanguage
      );

      // 配置 function calling
      const generationConfig = this._createEditRecipeGenerationConfig();

      // 調用 Vertex AI API
      const result = await this._callVertexAI(env, prompt, generationConfig);

      const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
        ?.functionCall?.args;

      console.log("Vertex AI API 完整回應:", JSON.stringify(res, null, 2));

      // 解析回應
      const parsedResult = this._parseEditRecipeAIResponse(result);

      return parsedResult;
    } catch (error) {
      console.error("VertexAIService - 編輯食譜失敗:", error);
      throw new Error(`食譜編輯失敗: ${(error as Error).message}`);
    }
  }

  /**
   * 創建編輯食譜的 AI 生成配置
   */
  private _createEditRecipeGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "edit_recipe",
              description: "編輯和翻譯食譜內容，提供多語言版本",
              parameters: editRecipeJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["edit_recipe"],
        },
      },
    };
  }

  /**
   * 解析編輯食譜的 AI 回應
   */
  private _parseEditRecipeAIResponse(result: AIResponse): EditRecipeResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "edit_recipe") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall && part.functionCall.name === "edit_recipe") {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessEditRecipeResult(responseObject);
  }

  /**
   * 驗證和處理編輯食譜結果
   */
  private _validateAndProcessEditRecipeResult(
    responseObject: any
  ): EditRecipeResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return { error: "Vertex AI 未能生成有效的分析結果" } as EditRecipeResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as EditRecipeResult;
    }

    // 驗證必要欄位
    if (!this._validateEditRecipeResult(responseObject)) {
      return { error: "API 回應格式不正確" } as EditRecipeResult;
    }

    return responseObject as EditRecipeResult;
  }

  /**
   * 驗證編輯食譜結果格式
   */
  private _validateEditRecipeResult(result: any): boolean {
    const requiredFields: string[] = ["name", "description", "steps"];

    // 檢查必要的頂層欄位
    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查 name 和 description 是否為多語言物件
    if (!result.name || typeof result.name !== "object") {
      console.error("name 必須為多語言物件");
      return false;
    }

    if (!result.description || typeof result.description !== "object") {
      console.error("description 必須為多語言物件");
      return false;
    }

    // 檢查 steps 是否為陣列
    if (!Array.isArray(result.steps)) {
      console.error("steps 必須為陣列");
      return false;
    }

    return true;
  }

  /**
   * 解析食材分析的 AI 回應
   */
  private _parseIngredientAIResponse(result: AIResponse): AddIngredientResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "analyze_ingredient") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "analyze_ingredient"
          ) {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessIngredientResult(responseObject);
  }

  /**
   * 解析食譜食材分析的 AI 回應
   */
  private _parseRecipeIngredientAIResponse(
    result: AIResponse
  ): AddRecipeIngredientResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall (新版): ${call.name}`);
        if (call.name === "analyze_recipe_ingredient") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "analyze_recipe_ingredient"
          ) {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // console.log("解析結果鍵值:", Object.keys(responseObject));
    // console.log("解析結果內容:", JSON.stringify(responseObject, null, 2));

    // 驗證和處理結果
    return this._validateAndProcessRecipeIngredientResult(responseObject);
  }

  /**
   * 驗證和處理食材分析結果
   */
  private _validateAndProcessIngredientResult(
    responseObject: any
  ): AddIngredientResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的分析結果",
      } as AddIngredientResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as AddIngredientResult;
    }

    // 驗證必要欄位
    if (!this._validateIngredientResult(responseObject)) {
      return { error: "API 回應格式不正確" } as AddIngredientResult;
    }

    // 驗證熱量計算
    const calculatedCalories: number =
      responseObject.protein * 4 +
      responseObject.carbs * 4 +
      responseObject.fat * 9;
    const calorieDifference: number = Math.abs(
      responseObject.calories - calculatedCalories
    );

    if (calorieDifference > 5) {
      // 允許 5 卡路里的誤差
      console.warn("熱量計算不符合公式，自動修正:", {
        原始: responseObject.calories,
        計算: calculatedCalories,
      });
      responseObject.calories = Math.round(calculatedCalories);
    }

    return responseObject as AddIngredientResult;
  }

  /**
   * 驗證和處理食譜食材分析結果
   */
  private _validateAndProcessRecipeIngredientResult(
    responseObject: any
  ): AddRecipeIngredientResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的分析結果",
      } as AddRecipeIngredientResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as AddRecipeIngredientResult;
    }

    // 驗證必要欄位
    if (!this._validateRecipeIngredientResult(responseObject)) {
      return { error: "API 回應格式不正確" } as AddRecipeIngredientResult;
    }

    return responseObject as AddRecipeIngredientResult;
  }

  /**
   * 驗證食材結果格式
   */
  private _validateIngredientResult(result: any): boolean {
    const requiredFields: string[] = [
      "name",
      "engName",
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
      "amountUnit",
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields: string[] = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
    ];
    for (const field of numericFields) {
      if (typeof result[field] !== "number" || isNaN(result[field])) {
        console.error(`欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof result.name !== "string" || result.name.trim() === "") {
      console.error("name 必須為非空字串");
      return false;
    }

    if (typeof result.engName !== "string" || result.engName.trim() === "") {
      console.error("engName 必須為非空字串");
      return false;
    }

    if (
      typeof result.amountUnit !== "string" ||
      result.amountUnit.trim() === ""
    ) {
      console.error("amountUnit 必須為非空字串");
      return false;
    }

    return true;
  }

  /**
   * 驗證食譜食材結果格式
   */
  private _validateRecipeIngredientResult(result: any): boolean {
    const requiredFields: string[] = [
      "name",
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
      "amountUnit",
    ];

    // 檢查必要的頂層欄位
    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查數值欄位
    const numericFields: string[] = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "amountValue",
    ];
    for (const field of numericFields) {
      if (typeof result[field] !== "number" || isNaN(result[field])) {
        console.error(`欄位 ${field} 必須為有效數字`);
        return false;
      }
    }

    // 檢查 name 欄位（多語言物件）
    if (!result.name || typeof result.name !== "object") {
      console.error("name 必須為多語言物件");
      return false;
    }

    // 檢查單位欄位（多語言物件）
    if (!result.amountUnit || typeof result.amountUnit !== "object") {
      console.error("amountUnit 必須為多語言物件");
      return false;
    }

    return true;
  }

  /**
   * 翻譯食材名稱
   * @param userInput 用戶輸入的食材名稱（任何語言）
   * @param env 環境變數
   * @returns 翻譯結果
   */
  async translateIngredient(
    userInput: string,
    env: Env
  ): Promise<TranslateIngredientResult> {
    try {
      console.log("VertexAIService - 開始翻譯食材:", userInput);

      // 準備提示詞
      const prompt = createTranslateIngredientPrompt(userInput);

      // 配置 function calling
      const generationConfig =
        this._createTranslateIngredientGenerationConfig();

      // 調用 Vertex AI API（使用 gemini-2.5-flash-lite 快速回應）
      const result = await this._callVertexAI(
        env,
        prompt,
        generationConfig,
        "gemini-2.5-flash-lite"
      );

      const res: any = (result as any)?.candidates?.[0]?.content?.parts?.[0]
        ?.functionCall?.args;

      console.log("Vertex AI API 翻譯回應:", JSON.stringify(res, null, 2));

      // 解析回應
      const translationResult =
        this._parseTranslateIngredientAIResponse(result);

      console.log("VertexAIService - 翻譯完成:", translationResult);

      return translationResult;
    } catch (error) {
      console.error("VertexAIService - 翻譯食材失敗:", error);
      throw new Error(`翻譯食材失敗: ${(error as Error).message}`);
    }
  }

  /**
   * 創建翻譯食材的 AI 生成配置
   */
  private _createTranslateIngredientGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "translate_ingredient",
              description: "將任何語言的食材名稱翻譯成簡短的英文名稱",
              parameters: translateIngredientJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["translate_ingredient"],
        },
      },
    };
  }

  /**
   * 解析翻譯食材的 AI 回應
   */
  private _parseTranslateIngredientAIResponse(
    result: AIResponse
  ): TranslateIngredientResult {
    let responseObject: any = {};

    // 優先處理 function calling 回應（新版 API 結構）
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call && call.name) {
        if (call.name === "translate_ingredient") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 備用：檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "translate_ingredient"
          ) {
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }
    }

    // 如果仍然沒有找到，嘗試從文字中解析 JSON
    if (Object.keys(responseObject).length === 0) {
      console.log("未找到 functionCall 或 args 為空，嘗試從文字解析 JSON");
      responseObject = this._parseJsonFromText(result);
    }

    // 驗證和處理結果
    return this._validateAndProcessTranslateIngredientResult(responseObject);
  }

  /**
   * 驗證和處理翻譯食材結果
   */
  private _validateAndProcessTranslateIngredientResult(
    responseObject: any
  ): TranslateIngredientResult {
    // 檢查是否為空物件
    if (Object.keys(responseObject).length === 0) {
      return {
        error: "Vertex AI 未能生成有效的翻譯結果",
      } as TranslateIngredientResult;
    }

    // 檢查是否為錯誤回應
    if (responseObject.error) {
      return { error: responseObject.error } as TranslateIngredientResult;
    }

    // 驗證必要欄位
    if (!this._validateTranslateIngredientResult(responseObject)) {
      return { error: "API 回應格式不正確" } as TranslateIngredientResult;
    }

    return responseObject as TranslateIngredientResult;
  }

  /**
   * 驗證翻譯結果格式
   */
  private _validateTranslateIngredientResult(result: any): boolean {
    const requiredFields: string[] = ["original", "english"];

    for (const field of requiredFields) {
      if (!(field in result)) {
        console.error(`缺少必要欄位: ${field}`);
        return false;
      }
    }

    // 檢查字串欄位
    if (typeof result.original !== "string" || result.original.trim() === "") {
      console.error("original 必須為非空字串");
      return false;
    }

    if (typeof result.english !== "string" || result.english.trim() === "") {
      console.error("english 必須為非空字串");
      return false;
    }

    return true;
  }
}
