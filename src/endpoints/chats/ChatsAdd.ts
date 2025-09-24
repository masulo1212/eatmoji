import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";
import { ChatReportResponseSchema, CreateChatReportSchema, StatusEnum } from "../../types/chat";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatsAdd endpoint - 添加新的聊天記錄
 * 對應 Flutter 的 addChat(ChatReport chatReport) 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatsAdd extends OpenAPIRoute {
  public schema = {
    tags: ["Chats"],
    summary: "添加新的聊天記錄",
    description: "為已驗證使用者添加新的聊天記錄，對應 Dart addChat(ChatReport chatReport) 方法",
    operationId: "chatsAdd",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateChatReportSchema.extend({
              id: z.string().describe("聊天記錄的唯一識別符"),
            }).openapi({
              description: "聊天報告資料",
              example: {
                id: "chat_12345",
                reportSummary: {
                  text: "健康報告摘要"
                },
                weightTrend: {
                  summaryText: "體重趨勢摘要",
                  totalChange: -2.5,
                  weeklyAverageChange: -0.5,
                  unit: "kg",
                  chartData: [
                    {
                      date: "2024-01-01",
                      weight: 70.5
                    }
                  ]
                },
                caloriesIntake: {
                  averageDailyCalories: 2000,
                  userTargetCalories: 1800,
                  unit: "kcal",
                  status: StatusEnum.GOOD
                },
                macrosBreakdown: {
                  nutrients: []
                },
                insights: {
                  items: []
                },
                actionPlan: {
                  actions: []
                },
                goalPrediction: {
                  text: "目標預測",
                  weeksToGoal: 8,
                  bestWeeksToGoal: 6,
                  averageDailyCalories: 1900,
                  bestTargetCalories: 1700
                },
                workoutEatingConsistency: {
                  totalExerciseTimes: 10,
                  averageExercisePerWeek: 2.5,
                  averageDailySteps: 8000,
                  totalFoodTrackedDays: 30,
                  summaryText: "運動飲食一致性摘要"
                },
                foodAnalysis: {
                  bestFoods: [],
                  worstFoods: [],
                  summaryText: "食物分析摘要"
                }
              }
            }),
          },
        },
        required: true,
      },
    },
    responses: {
      "201": {
        description: "成功創建聊天記錄",
        content: {
          "application/json": {
            schema: ChatReportResponseSchema.openapi({
              description: "創建的聊天記錄回應",
            }),
          },
        },
      },
      "400": {
        description: "請求參數錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "401": {
        description: "未授權 - 需要有效的 Firebase ID token",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "409": {
        description: "聊天記錄 ID 已存在",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
      "500": {
        description: "伺服器錯誤",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(false),
              errors: z.array(
                z.object({
                  code: z.number(),
                  message: z.string(),
                })
              ),
            }),
          },
        },
      },
    },
    security: [
      {
        Bearer: [],
      },
    ],
  };

  public async handle(c: AppContext) {
    try {
      // 從認證中間件獲取使用者 ID
      const userId = requireUserIdFromMiddleware(c);

      // 獲取並驗證請求資料
      const data = await this.getValidatedData<typeof this.schema>();
      const chatReportData = data.body;

      // 基本資料驗證
      if (!chatReportData.id || chatReportData.id.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "聊天記錄 ID 不能為空" }],
          },
          400
        );
      }

      if (!chatReportData.reportSummary?.text || chatReportData.reportSummary.text.trim() === "") {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "聊天報告摘要不能為空" }],
          },
          400
        );
      }

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const chatRepository = new FirestoreChatRepository(firestore);
      const chatService = new ChatService(chatRepository);
      const chatController = new ChatController(chatService);

      // 調用 Controller 層處理業務邏輯
      const response = await chatController.addChat(userId, chatReportData);

      // 檢查業務邏輯結果
      if (!response.success) {
        // 判斷錯誤類型
        let statusCode = 500;
        if (response.error?.includes("ID 已存在")) {
          statusCode = 409;
        } else if (response.error?.includes("不能為空") || response.error?.includes("無效")) {
          statusCode = 400;
        }

        return c.json(
          ChatController.toErrorResponse(response, statusCode),
          statusCode as 400 | 409 | 500
        );
      }

      // 返回成功響應 - 使用 201 Created 狀態碼
      return c.json(
        {
          success: true,
          result: response.result,
        },
        201
      );
    } catch (error) {
      console.error("Endpoint: ChatsAdd 處理錯誤:", error);

      // 處理認證錯誤
      if (
        error instanceof Error &&
        error.message ===
          "User ID not available in context. Ensure auth middleware is applied."
      ) {
        return c.json(
          {
            success: false,
            errors: [{ code: 401, message: "Authentication required" }],
          },
          401
        );
      }

      // 處理請求資料驗證錯誤
      if (error instanceof Error && error.message.includes("validation")) {
        return c.json(
          {
            success: false,
            errors: [{ code: 400, message: "請求資料格式錯誤" }],
          },
          400
        );
      }

      // 處理其他未預期錯誤
      return c.json(
        {
          success: false,
          errors: [{ code: 500, message: "Internal server error" }],
        },
        500
      );
    }
  }
}