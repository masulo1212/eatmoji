import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { requireUserIdFromMiddleware } from "../../middleware/auth";
import { AppContext } from "../../types";

// 導入分層架構
import { ChatController } from "../../controllers/chatController";
import { FirestoreChatRepository } from "../../repositories/chatRepository";
import { ChatService } from "../../services/chatService";
import { getFirestoreFromContext } from "../../utils/firebase";

/**
 * ChatsLatest endpoint - 獲取最新的聊天記錄
 * 對應 Flutter 的 getLatestChat() 方法
 *
 * 職責：
 * - OpenAPI schema 定義
 * - HTTP 請求/響應處理
 * - 調用 Controller 層
 * - 錯誤響應格式化
 */
export class ChatsLatest extends OpenAPIRoute {
  public schema = {
    tags: ["Chats"],
    summary: "獲取最新的聊天記錄",
    description: "獲取已驗證使用者最新的聊天記錄，按創建時間降序排列，對應 Dart getLatestChat() 方法",
    operationId: "chatsLatest",
    request: {
      // 這個端點不需要任何請求參數，只需要認證
    },
    responses: {
      "200": {
        description: "成功獲取最新聊天記錄（可能為 null）",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean().default(true),
              result: z.union([
                z.object({
                  id: z.string(),
                  reportSummary: z.object({
                    text: z.string(),
                  }),
                  weightTrend: z.object({
                    summaryText: z.string(),
                    totalChange: z.number(),
                    weeklyAverageChange: z.number(),
                    unit: z.string(),
                    chartData: z.array(z.object({
                      date: z.string(),
                      weight: z.number(),
                    })),
                  }),
                  caloriesIntake: z.object({
                    averageDailyCalories: z.number(),
                    userTargetCalories: z.number(),
                    unit: z.string(),
                    status: z.string(),
                  }),
                  macrosBreakdown: z.object({
                    nutrients: z.array(z.any()),
                  }),
                  insights: z.object({
                    items: z.array(z.any()),
                  }),
                  actionPlan: z.object({
                    actions: z.array(z.string()),
                  }),
                  goalPrediction: z.object({
                    text: z.string(),
                    weeksToGoal: z.number(),
                    bestWeeksToGoal: z.number(),
                    averageDailyCalories: z.number(),
                    bestTargetCalories: z.number(),
                  }),
                  workoutEatingConsistency: z.object({
                    totalExerciseTimes: z.number(),
                    averageExercisePerWeek: z.number(),
                    averageDailySteps: z.number(),
                    totalFoodTrackedDays: z.number(),
                    summaryText: z.string(),
                  }),
                  foodAnalysis: z.object({
                    bestFoods: z.array(z.any()),
                    worstFoods: z.array(z.any()),
                    summaryText: z.string(),
                  }),
                  createdAt: z.string(),
                }).describe("聊天記錄物件"),
                z.null().describe("沒有聊天記錄")
              ]).optional(),
              error: z.string().optional(),
            }).openapi({
              description: "最新聊天記錄回應",
              example: {
                success: true,
                result: {
                  id: "chat_12345",
                  reportSummary: {
                    text: "本週健康報告摘要"
                  },
                  weightTrend: {
                    summaryText: "體重呈下降趨勢",
                    totalChange: -1.5,
                    weeklyAverageChange: -0.3,
                    unit: "kg",
                    chartData: [
                      {
                        date: "2024-01-01",
                        weight: 70.0
                      }
                    ]
                  },
                  caloriesIntake: {
                    averageDailyCalories: 2000,
                    userTargetCalories: 1800,
                    unit: "kcal",
                    status: "GOOD"
                  },
                  macrosBreakdown: {
                    nutrients: []
                  },
                  insights: {
                    items: []
                  },
                  actionPlan: {
                    actions: ["保持良好的飲食習慣"]
                  },
                  goalPrediction: {
                    text: "預計8週達到目標體重",
                    weeksToGoal: 8,
                    bestWeeksToGoal: 6,
                    averageDailyCalories: 1900,
                    bestTargetCalories: 1700
                  },
                  workoutEatingConsistency: {
                    totalExerciseTimes: 12,
                    averageExercisePerWeek: 3,
                    averageDailySteps: 8500,
                    totalFoodTrackedDays: 28,
                    summaryText: "運動和飲食紀錄良好"
                  },
                  foodAnalysis: {
                    bestFoods: [],
                    worstFoods: [],
                    summaryText: "整體飲食均衡"
                  },
                  createdAt: "2024-01-01T10:00:00.000Z"
                }
              }
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

      // 初始化分層架構
      const firestore = getFirestoreFromContext(c);
      const chatRepository = new FirestoreChatRepository(firestore);
      const chatService = new ChatService(chatRepository);
      const chatController = new ChatController(chatService);

      // 調用 Controller 層處理業務邏輯
      const response = await chatController.getLatestChat(userId);

      // 檢查業務邏輯結果
      if (!response.success) {
        return c.json(
          ChatController.toErrorResponse(response, 500),
          500
        );
      }

      // 返回成功響應
      // 即使 result 是 null 也是正常的業務結果（表示沒有聊天記錄）
      return c.json({
        success: true,
        result: response.result,
      });
    } catch (error) {
      console.error("Endpoint: ChatsLatest 處理錯誤:", error);

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