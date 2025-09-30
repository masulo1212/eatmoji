import type { Env } from "../bindings";
import type {
  ChatData,
  ChatResult,
  GenerationConfig,
  HealthReportResult,
  ResponseChunk,
} from "../types/chat";
import { checkDietRecords, createChatPrompt } from "../utils/chatPrompts";
import { healthReportJsonSchema } from "../utils/chatSchemas";

/**
 * AI 聊天功能服務
 * 處理與 Google Gemini AI 的交互和聊天邏輯
 */
export class AIChatService {
  /**
   * 處理聊天請求
   * @param chatData 聊天數據
   * @param env 環境變數
   * @returns 聊天結果或串流
   */
  async processChat(
    chatData: ChatData,
    env: Env
  ): Promise<HealthReportResult | ReadableStream<Uint8Array>> {
    const { userInput, userData, userLanguage, history, generateReport } =
      chatData;

    // 檢查是否有飲食記錄
    const hasDietRecords = checkDietRecords(userData);
    // console.log("飲食記錄檢查結果:", {
    //   hasDietRecords,
    //   userDataKeys: Object.keys(userData),
    //   generateReport,
    //   userData,
    // });

    // 創建提示詞
    const prompt: string = createChatPrompt(
      userInput,
      userData,
      userLanguage,
      history,
      generateReport
    );

    // 如果不是生成報告模式，使用串流
    if (!generateReport) {
      return this._processStreamingChat(prompt, env);
    }

    // 報告模式使用非串流方式（需要完整結構化數據）
    const generationConfig: GenerationConfig =
      this._createReportGenerationConfig();
    const result = await this._callGeminiAPI(
      env,
      prompt,
      generationConfig,
      "gemini-2.5-flash-lite"
    );

    return this._handleReportResponse(result);
  }

  /**
   * 處理串流聊天請求
   * @param prompt 提示詞
   * @param env 環境變數
   * @returns 串流回應
   */
  private async _processStreamingChat(
    prompt: string,
    env: Env
  ): Promise<ReadableStream<Uint8Array>> {
    const service = this;
    // 創建 ReadableStream 來處理串流回應
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // 使用串流方法
          const response = await service._callGeminiStreamAPI(
            env,
            prompt,
            "gemini-2.5-flash-lite"
          );

          for await (const chunk of response) {
            const chunkText: string | undefined = (chunk as ResponseChunk).text;

            if (chunkText) {
              // 發送 SSE 格式的數據
              const data: string = `data: ${JSON.stringify({
                text: chunkText,
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          }
          // 發送結束標記
          const endData: string = `data: ${JSON.stringify({ done: true })}\n\n`;
          controller.enqueue(new TextEncoder().encode(endData));
          controller.close();
        } catch (error) {
          console.error("串流處理錯誤:", error);
          const errorData: string = `data: ${JSON.stringify({
            error: (error as Error).message,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });
  }

  /**
   * 調用 Gemini AI API（非串流模式）
   */
  private async _callGeminiAPI(
    env: Env,
    prompt: string,
    generationConfig: GenerationConfig,
    model: string = "gemini-2.5-flash"
  ): Promise<any> {
    if (!env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY 環境變數未設定");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

    console.log(`🤖 調用 Google GenAI API, 模型: ${model}`);
    console.log("📝 請求內容長度:", JSON.stringify(requestBody).length);

    try {
      const response = await fetch(`${apiUrl}?key=${env.GOOGLE_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ AI API 調用失敗:", response.status, errorText);
        throw new Error(`AI API 調用失敗: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ AI API 調用成功");
      return result;
    } catch (error) {
      console.error("❌ AI API 調用失敗:", error);
      throw error;
    }
  }

  /**
   * 調用 Gemini AI API（串流模式）
   */
  private async _callGeminiStreamAPI(
    env: Env,
    prompt: string,
    model: string = "gemini-2.5-flash"
  ): Promise<any> {
    if (!env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY 環境變數未設定");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    console.log(`🤖 調用 Google GenAI 串流 API, 模型: ${model}`);
    console.log("📝 串流請求內容長度:", JSON.stringify(requestBody).length);

    try {
      const response = await fetch(`${apiUrl}?key=${env.GOOGLE_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ AI 串流 API 調用失敗:", response.status, errorText);
        throw new Error(
          `AI 串流 API 調用失敗: ${response.status} ${errorText}`
        );
      }

      if (!response.body) {
        throw new Error("回應中沒有 body");
      }

      console.log("✅ AI 串流 API 調用成功");

      // 返回一個 async generator 來處理串流數據
      return this._parseStreamResponse(response.body);
    } catch (error) {
      console.error("❌ AI 串流 API 調用失敗:", error);
      throw error;
    }
  }

  /**
   * 解析串流回應
   */
  private async *_parseStreamResponse(
    body: ReadableStream<Uint8Array>
  ): AsyncGenerator<ResponseChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 處理最後剩餘的緩衝區內容
          if (buffer.trim()) {
            yield* this._processJsonBuffer(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 嘗試從緩衝區中提取完整的 JSON 對象
        const { processedObjects, remainingBuffer } =
          this._extractJsonObjects(buffer);
        buffer = remainingBuffer;

        // 處理提取到的 JSON 對象
        for (const jsonObj of processedObjects) {
          yield* this._processJsonBuffer(jsonObj);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 從緩衝區中提取完整的 JSON 對象
   */
  private _extractJsonObjects(buffer: string): {
    processedObjects: string[];
    remainingBuffer: string;
  } {
    const processedObjects: string[] = [];
    let remainingBuffer = buffer;
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let objectStart = -1;

    for (let i = 0; i < remainingBuffer.length; i++) {
      const char = remainingBuffer[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          if (braceCount === 0) {
            objectStart = i;
          }
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0 && objectStart !== -1) {
            // 找到完整的 JSON 對象
            const jsonObject = remainingBuffer.substring(objectStart, i + 1);
            processedObjects.push(jsonObject);
            remainingBuffer = remainingBuffer.substring(i + 1);
            i = -1; // 重置循環
            objectStart = -1;
          }
        }
      }
    }

    return { processedObjects, remainingBuffer };
  }

  /**
   * 處理 JSON 緩衝區並提取文字內容
   */
  private *_processJsonBuffer(jsonBuffer: string): Generator<ResponseChunk> {
    try {
      const trimmed = jsonBuffer.trim();
      if (!trimmed) return;

      const parsed = JSON.parse(trimmed);

      // 提取文字內容
      if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
        const parts = parsed.candidates[0].content.parts;
        for (const part of parts) {
          if (part.text) {
            yield { text: part.text };
          }
        }
      }
    } catch (parseError) {
      console.error(
        "解析串流 JSON 失敗:",
        parseError,
        "JSON 內容:",
        jsonBuffer
      );
    }
  }

  /**
   * 創建報告生成配置
   * @returns 生成配置
   */
  private _createReportGenerationConfig(): GenerationConfig {
    return {
      tools: [
        {
          functionDeclarations: [
            {
              name: "generate_visual_health_report",
              description:
                "Generate structured JSON data for health report visualization based on user health data.",
              parameters: healthReportJsonSchema,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["generate_visual_health_report"],
        },
      },
    };
  }

  /**
   * 處理純文字回應（問答模式）
   * @param result AI 回應
   * @returns 聊天結果
   */
  private _handlePlainTextResponse(result: any): ChatResult {
    const candidate = result.candidates?.[0];
    const plainText: string =
      candidate?.content?.parts?.[0]?.text?.trim() || "AI 回應失敗";

    return { text: plainText };
  }

  /**
   * 處理報告回應（報告生成模式）
   * @param result AI 回應
   * @returns 健康報告結果
   */
  private _handleReportResponse(result: any): HealthReportResult {
    // console.log("AI API 完整回應:", JSON.stringify(result, null, 2));

    let responseObject: any = {};
    const functionCalls = result.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      // 處理 function calling 回應
      const call = functionCalls[0];
      if (call && call.name) {
        // console.log(`找到 functionCall: ${call.name}`);
        if (call.name === "generate_visual_health_report") {
          responseObject = call.args || {};
        }
      }
    } else {
      // 檢查舊版 API 結構
      const candidate = result.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.functionCall &&
            part.functionCall.name === "generate_visual_health_report"
          ) {
            // console.log(`找到 functionCall (舊版): ${part.functionCall.name}`);
            responseObject = part.functionCall.args || {};
            break;
          }
        }
      }

      // 如果還是沒找到，嘗試從文字中解析 JSON
      if (Object.keys(responseObject).length === 0) {
        console.log("未找到 functionCall，嘗試從文字解析");
        responseObject = this._parseJsonFromText(result);
      }
    }

    // console.log("回應對象鍵值:", Object.keys(responseObject));

    if (Object.keys(responseObject).length === 0) {
      throw new Error("AI 未能生成有效的 JSON 報告");
    }

    return responseObject as HealthReportResult;
  }

  /**
   * 從文字回應中解析 JSON
   * @param result AI回應結果
   * @returns 解析的物件
   */
  private _parseJsonFromText(result: any): Record<string, any> {
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
}
