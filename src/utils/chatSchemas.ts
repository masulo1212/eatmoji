/**
 * 聊天功能相關的 JSON Schema 定義
 */
import type { StatusEnum, InsightTypeEnum } from "../types/chat";

// 狀態枚舉的定義
const statusEnum: string[] = [
  "EXCELLENT",
  "GOOD",
  "OK",
  "LOW",
  "HIGH",
  "SEVERELY_LOW",
  "SEVERELY_HIGH",
  "NEEDS_IMPROVEMENT",
  "GOOD_BUT_ATTENTION_NEEDED",
];

// 洞察類型枚舉的定義
const insightTypeEnum: string[] = ["highlight", "reminder"];

// 主要的健康報告 Schema
export const healthReportJsonSchema = {
  type: "object",
  description: "一份完整的、用於生成健康報告可視化介面的結構化 JSON 數據。",
  properties: {
    reportSummary: {
      type: "object",
      description: "用於在報告頂部顯示一個總結卡片(Card)。",
      properties: {
        text: {
          type: "string",
          description:
            "簡潔的2-3句話總結文字，直接點出最重要的結論（一個優點和一個最需改進的點）。禁止使用問候語、開場白（如「您好」、「歡迎」等），直接進入重點內容。",
        },
      },
      required: ["text"],
    },
    weightTrend: {
      type: "object",
      description: "包含繪製體重趨勢線圖所需的所有數據和文字。",
      properties: {
        summaryText: {
          type: "string",
          description: "過去一個月內對體重變化的簡短文字分析與建議",
        },
        totalChange: {
          type: "number",
          description: "使用insights.totalChange",
        },
        weeklyAverageChange: {
          type: "number",
          description: "使用insights.weeklyAverageChange",
        },
        unit: {
          type: "string",
          description:
            "體重單位，例如 'kg' 或 'lbs'，請依據basicInfo.weightUnit來決定。",
        },
        chartData: {
          type: "array",
          description:
            "一個數據點陣列，用於繪製體重趨勢線圖。請務必過濾掉資料中明顯的輸入錯誤。",
          items: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "用於繪製圖表的日期 (YYYY-MM-DD)。",
              },
              weight: { type: "number", description: "對應日期的體重數值。" },
            },
            required: ["date", "weight"],
          },
        },
      },
      required: [
        "summaryText",
        "totalChange",
        "weeklyAverageChange",
        "unit",
        "chartData",
      ],
    },
    caloriesIntake: {
      type: "object",
      description: "用於渲染熱量攝取儀表板(Gauge)或進度條的數據。",
      properties: {
        averageDailyCalories: {
          type: "number",
          description:
            "使用insights.averageDailyCalories，這是使用者每日平均攝取熱量。",
        },
        userTargetCalories: {
          type: "number",
          description:
            "使用nutritionGoals.userTargetCalories，這是使用者自訂的每日目標攝取熱量。",
        },
        unit: { type: "string", description: "熱量單位，預設為 '大卡'。" },
        status: {
          type: "string",
          enum: statusEnum,
          description: "熱量攝取狀況的評估狀態碼。",
        },
      },
      required: [
        "averageDailyCalories",
        "userTargetCalories",
        "unit",
        "status",
      ],
    },
    macrosBreakdown: {
      type: "object",
      description: "用於渲染三大營養素進度條的數據。",
      properties: {
        nutrients: {
          type: "array",
          description:
            "一個包含蛋白質、碳水化合物、脂肪三大營養素的陣列，用於生成三個進度條。",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: ["protein", "carbs", "fats"],
                description: "營養素名稱。",
              },
              actual: {
                type: "number",
                description:
                  "使用insights.averageDailyProtein（每日平均攝取蛋白質） 或 insights.averageDailyCarbs（每日平均攝取碳水化合物） 或 insights.averageDailyFat（每日平均攝取脂肪）",
              },
              target: {
                type: "number",
                description: "該營養素的每日目標攝取公克數。",
              },
              unit: {
                type: "string",
                description: "營養素單位，預設為 '克'。",
              },
              status: {
                type: "string",
                enum: statusEnum,
                description: "該營養素攝取狀況的評估狀態碼。",
              },
            },
            required: ["name", "actual", "target", "unit", "status"],
          },
          minItems: 3,
          maxItems: 3,
        },
      },
      required: ["nutrients"],
    },
    insights: {
      type: "object",
      description: "用於生成一個條列式的洞察卡片列表。",
      properties: {
        items: {
          type: "array",
          description:
            "一個洞察項目的陣列，每個項目都會在前端顯示為一個帶有圖示的列表項。請提供2-4個最關鍵的洞察。",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: insightTypeEnum,
                description:
                  "洞察項目的類型，'highlight' 代表正面肯定，'reminder' 代表溫和提醒。",
              },
              text: {
                type: "string",
                description: "單句的洞察內容，可以是肯定或提醒。",
              },
            },
            required: ["type", "text"],
          },
        },
      },
      required: ["items"],
    },
    actionPlan: {
      type: "object",
      description: "提供給使用者接下來可以執行的具體步驟。",
      properties: {
        actions: {
          type: "array",
          description:
            "一個包含 1-3 個具體行動建議的陣列，前端會將其渲染成一個可勾選的清單(Checklist)。",
          items: {
            type: "string",
            description: "一個具體的、可執行的行動建議項目。",
          },
          minItems: 1,
          maxItems: 3,
        },
      },
      required: ["actions"],
    },
    goalPrediction: {
      type: "object",
      description: "基於目前趨勢，預估達成目標體重所需的時間。",
      properties: {
        text: {
          type: "string",
          description:
            "預估文字描述。使用者的飲食目標是basicInfo.goal，請根據使用者的飲食與運動習慣是否健康、是否需修正，給予實際可行的語氣，如果使用者自定義的目標熱量合理，那就不需要推薦使用系統建議的熱量。使用者的實際每日攝取熱量是 insights.averageDailyCalories，使用者自定義的目標熱量是 nutritionGoals.userTargetCalories，系統建議的目標熱量是 nutritionGoals.bestTargetCalories",
        },
        weeksToGoal: {
          type: "integer",
          description: `使用insights.weeksToGoal`,
        },
        bestWeeksToGoal: {
          type: "integer",
          description: `使用insights.bestWeeksToGoal`,
        },
        averageDailyCalories: {
          type: "number",
          description:
            "每日熱量攝取值（實際平均值 insights.averageDailyCalories）",
        },
        bestTargetCalories: {
          type: "number",
          description:
            "建議每日熱量攝取值。使用者自定義的目標熱量是 nutritionGoals.userTargetCalories，系統建議的目標熱量是 nutritionGoals.bestTargetCalories，你需要從nutritionGoals.userTargetCalories和nutritionGoals.bestTargetCalories中選擇一個合理的目標熱量，如果使用者自定義的目標熱量合理，那就不需要推薦使用系統建議的熱量",
        },
      },
      required: [
        "text",
        "weeksToGoal",
        "averageDailyCalories",
        "bestTargetCalories",
        "bestWeeksToGoal",
      ],
    },
    workoutEatingConsistency: {
      type: "object",
      description:
        "分析使用者在指定期間內飲食記錄和運動的頻率與規律性，用來評估其飲食和運動習慣是否穩定。",
      properties: {
        totalExerciseTimes: {
          type: "integer",
          description: "總運動次數，使用 insights.totalExerciseTimes",
        },
        averageExercisePerWeek: {
          type: "number",
          description: "平均每週運動次數，使用 insights.averageExercisePerWeek",
        },
        averageDailySteps: {
          type: "number",
          description: "每日平均運動步數，使用 insights.averageDailySteps。",
        },
        totalFoodTrackedDays: {
          type: "integer",
          description: "總飲食紀錄天數，使用 insights.totalFoodTrackedDays。",
        },
        summaryText: {
          type: "string",
          description:
            "針對使用者的飲食和運動紀錄規律性所生成的自然語言總結，語氣應鼓勵性並指出優勢或需改善之處。",
        },
      },
      required: [
        "totalExerciseTimes",
        "averageExercisePerWeek",
        "averageDailySteps",
        "totalFoodTrackedDays",
        "summaryText",
      ],
    },
    foodAnalysis: {
      type: "object",
      description:
        "分析使用者飲食記錄中食物選擇的品質，提供最優和需改善的食物建議。",
      properties: {
        bestFoods: {
          type: "array",
          description: "營養價值高、符合用戶目標的優質食物選擇（2-3個）。若無飲食記錄則返回空陣列。",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "食物名稱",
              },
              highlights: {
                type: "array",
                description:
                  "2-3個簡短的營養重點，如「高蛋白」、「低脂」、「富含纖維」等",
                items: {
                  type: "string",
                },
                minItems: 2,
                maxItems: 3,
              },
              image: {
                type: "string",
                description:
                  "食物圖片，來自dietRecords的image欄位，沒有圖片網址就回傳 null",
              },
            },
            required: ["name", "highlights", "image"],
          },
          maxItems: 3,
        },
        worstFoods: {
          type: "array",
          description: "可改善的食物選擇（2-3個）。若無飲食記錄則返回空陣列。",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "食物名稱",
              },
              issues: {
                type: "array",
                description:
                  "2-3個簡短的問題重點，如「高鈉」、「高糖」、「低營養密度」等",
                items: {
                  type: "string",
                },
                minItems: 2,
                maxItems: 3,
              },
              image: {
                type: "string",
                description:
                  "食物圖片，來自dietRecords的image欄位，沒有圖片網址就回傳 null",
              },
            },
            required: ["name", "issues", "image"],
          },
          maxItems: 3,
        },
        summaryText: {
          type: "string",
          description:
            "整體飲食品質總結。若有飲食記錄，用鼓勵性語氣肯定好的選擇並溫和建議改善方向；若無飲食記錄，說明需要記錄飲食才能進行分析。",
        },
      },
      required: ["bestFoods", "worstFoods", "summaryText"],
    },
  },
  required: [
    "reportSummary",
    "weightTrend",
    "caloriesIntake",
    "macrosBreakdown",
    "insights",
    "actionPlan",
    "workoutEatingConsistency",
    "goalPrediction",
    "foodAnalysis",
  ],
};