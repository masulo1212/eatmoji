import { z } from "zod";
import { FirestoreDateSchema, firestoreTimestampToDate } from "./diary";

// 用戶數據相關型別定義

/**
 * 用戶基本資訊
 */
export interface BasicInfo {
  age?: number;
  height?: number;
  currentWeight?: number;
  targetWeight?: number;
  initWeight?: number;
  gender?: string;
  goal?: string;
  activityLevel?: string;
  weightUnit?: string;
  heightUnit?: string;
  tdee?: number;
  bmr?: number;
}

export const BasicInfoSchema = z.object({
  age: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  currentWeight: z.coerce.number().optional(),
  targetWeight: z.coerce.number().optional(),
  initWeight: z.coerce.number().optional(),
  gender: z.string().optional(),
  goal: z.string().optional(),
  activityLevel: z.string().optional(),
  weightUnit: z.string().optional(),
  heightUnit: z.string().optional(),
  tdee: z.coerce.number().optional(),
  bmr: z.coerce.number().optional(),
});

/**
 * 營養目標
 */
export interface NutritionGoals {
  userTargetCalories?: number;
  bestTargetCalories?: number;
  userTargetProtein?: number;
  userTargetCarbs?: number;
  userTargetFat?: number;
}

export const NutritionGoalsSchema = z.object({
  userTargetCalories: z.coerce.number().optional(),
  bestTargetCalories: z.coerce.number().optional(),
  userTargetProtein: z.coerce.number().optional(),
  userTargetCarbs: z.coerce.number().optional(),
  userTargetFat: z.coerce.number().optional(),
});

/**
 * 數據洞察
 */
export interface DataInsights {
  totalChange?: number;
  weeklyAverageChange?: number;
  averageDailyCalories?: number;
  averageDailyProtein?: number;
  averageDailyCarbs?: number;
  averageDailyFat?: number;
  totalExerciseTimes?: number;
  averageExercisePerWeek?: number;
  averageDailySteps?: number;
  totalFoodTrackedDays?: number;
  weeksToGoal?: number;
  bestWeeksToGoal?: number;
}

export const DataInsightsSchema = z.object({
  totalChange: z.coerce.number().optional(),
  weeklyAverageChange: z.coerce.number().optional(),
  averageDailyCalories: z.coerce.number().optional(),
  averageDailyProtein: z.coerce.number().optional(),
  averageDailyCarbs: z.coerce.number().optional(),
  averageDailyFat: z.coerce.number().optional(),
  totalExerciseTimes: z.coerce.number().optional(),
  averageExercisePerWeek: z.coerce.number().optional(),
  averageDailySteps: z.coerce.number().optional(),
  totalFoodTrackedDays: z.coerce.number().optional(),
  weeksToGoal: z.coerce.number().optional(),
  bestWeeksToGoal: z.coerce.number().optional(),
});

/**
 * 飲食記錄
 */
export interface DietRecord {
  id?: string;
  date?: string;
  name?: string;
  image?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: any;
}

export const DietRecordSchema = z
  .object({
    id: z.string().optional(),
    date: z.string().optional(),
    name: z.string().optional(),
    image: z.union([z.string(), z.null()]).optional(),
    calories: z.coerce.number().optional(),
    protein: z.coerce.number().optional(),
    carbs: z.coerce.number().optional(),
    fat: z.coerce.number().optional(),
  })
  .passthrough();

/**
 * 運動記錄
 */
export interface ExerciseRecord {
  date?: string;
  steps?: number;
  totalCaloriesBurned?: number;
  exerciseList?: any[];
}

export const ExerciseRecordSchema = z.object({
  date: z.string().optional(),
  steps: z.coerce.number().optional(),
  totalCaloriesBurned: z.coerce.number().optional(),
  exerciseList: z.array(z.any()).optional(),
});

/**
 * 體重歷史
 */
export interface WeightHistoryRecord {
  date?: string;
  weight?: number;
  weightUnit?: string;
}

export const WeightHistoryRecordSchema = z.object({
  date: z.string().optional(),
  weight: z.coerce.number().optional(),
  weightUnit: z.string().optional(),
});

/**
 * 用戶數據
 */
export interface UserData {
  basicInfo?: BasicInfo;
  nutritionGoals?: NutritionGoals;
  insights?: DataInsights;
  dietRecords?: DietRecord[];
  exerciseRecords?: ExerciseRecord[];
  weightHistory?: WeightHistoryRecord[];
}

export const UserDataSchema = z.object({
  basicInfo: BasicInfoSchema.optional(),
  nutritionGoals: NutritionGoalsSchema.optional(),
  insights: DataInsightsSchema.optional(),
  dietRecords: z.array(DietRecordSchema).optional(),
  exerciseRecords: z.array(ExerciseRecordSchema).optional(),
  weightHistory: z.array(WeightHistoryRecordSchema).optional(),
});

/**
 * 聊天歷史
 */
export interface ChatHistory {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export const ChatHistorySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().optional(),
});

/**
 * 聊天數據
 */
export interface ChatData {
  userInput: string;
  userData: UserData;
  userLanguage: string;
  history: ChatHistory[];
  generateReport: boolean;
}

export const ChatDataSchema = z.object({
  userInput: z.string(),
  userData: UserDataSchema,
  userLanguage: z.string(),
  history: z.array(ChatHistorySchema),
  generateReport: z.boolean(),
});

/**
 * 生成配置介面
 */
export interface GenerationConfig {
  tools: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters: any;
    }>;
  }>;
  toolConfig: {
    functionCallingConfig: {
      mode: "ANY" | "AUTO" | "NONE";
      allowedFunctionNames?: string[];
    };
  };
}

/**
 * 健康報告結果介面
 */
export interface HealthReportResult {
  [key: string]: any;
}

/**
 * 聊天結果介面
 */
export interface ChatResult {
  text?: string;
  [key: string]: any;
}

/**
 * 流式響應塊介面
 */
export interface ResponseChunk {
  text: string;
}

// 健康狀態列舉
export enum StatusEnum {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  OK = "OK",
  LOW = "LOW",
  HIGH = "HIGH",
  SEVERELY_LOW = "SEVERELY_LOW",
  SEVERELY_HIGH = "SEVERELY_HIGH",
  NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
  GOOD_BUT_ATTENTION_NEEDED = "GOOD_BUT_ATTENTION_NEEDED",
}

export const StatusEnumSchema = z.nativeEnum(StatusEnum);

// 洞察類型列舉
export enum InsightTypeEnum {
  HIGHLIGHT = "highlight",
  REMINDER = "reminder",
}

export const InsightTypeEnumSchema = z.nativeEnum(InsightTypeEnum);

// 營養素類型列舉
export enum MacroNutrientType {
  PROTEIN = "protein",
  CARBS = "carbs",
  FATS = "fats",
}

export const MacroNutrientTypeSchema = z.nativeEnum(MacroNutrientType);

// 聊天訊息
export interface ChatMessage {
  content: string;
  role: string;
  createdAt: Date;
  chatId?: string;
  messageId?: string;
}

export const ChatMessageSchema = z.object({
  content: z.string(),
  role: z.string(),
  createdAt: FirestoreDateSchema,
  chatId: z.string().optional(),
  messageId: z.string().optional(),
});

// 報告摘要
export interface ReportSummary {
  text: string;
}

export const ReportSummarySchema = z.object({
  text: z.string(),
});

// 體重趨勢圖表數據
export interface WeightTrendChartData {
  date: string;
  weight: number;
}

export const WeightTrendChartDataSchema = z.object({
  date: z.string(),
  weight: z.number(),
});

// 體重趨勢
export interface WeightTrend {
  summaryText: string;
  totalChange: number;
  weeklyAverageChange: number;
  unit: string;
  chartData: WeightTrendChartData[];
}

export const WeightTrendSchema = z.object({
  summaryText: z.string(),
  totalChange: z.number(),
  weeklyAverageChange: z.number(),
  unit: z.string(),
  chartData: z.array(WeightTrendChartDataSchema),
});

// 卡路里攝取
export interface CaloriesIntake {
  averageDailyCalories: number;
  userTargetCalories: number;
  unit: string;
  status: StatusEnum;
}

export const CaloriesIntakeSchema = z.object({
  averageDailyCalories: z.number(),
  userTargetCalories: z.number(),
  unit: z.string(),
  status: StatusEnumSchema,
});

// 宏量營養素
export interface MacroNutrient {
  name: MacroNutrientType;
  actual: number;
  target: number;
  unit: string;
  status: StatusEnum;
}

export const MacroNutrientSchema = z.object({
  name: MacroNutrientTypeSchema,
  actual: z.number(),
  target: z.number(),
  unit: z.string(),
  status: StatusEnumSchema,
});

// 宏量營養素分解
export interface MacrosBreakdown {
  nutrients: MacroNutrient[];
}

export const MacrosBreakdownSchema = z.object({
  nutrients: z.array(MacroNutrientSchema),
});

// 洞察項目
export interface InsightItem {
  type: InsightTypeEnum;
  text: string;
}

export const InsightItemSchema = z.object({
  type: InsightTypeEnumSchema,
  text: z.string(),
});

// 洞察集合
export interface Insights {
  items: InsightItem[];
}

export const InsightsSchema = z.object({
  items: z.array(InsightItemSchema),
});

// 行動計劃
export interface ActionPlan {
  actions: string[];
}

export const ActionPlanSchema = z.object({
  actions: z.array(z.string()),
});

// 目標預測
export interface GoalPrediction {
  text: string;
  weeksToGoal: number;
  bestWeeksToGoal: number;
  averageDailyCalories: number;
  bestTargetCalories: number;
}

export const GoalPredictionSchema = z.object({
  text: z.string(),
  weeksToGoal: z.number(),
  bestWeeksToGoal: z.number(),
  averageDailyCalories: z.number(),
  bestTargetCalories: z.number(),
});

// 運動飲食一致性
export interface WorkoutEatingConsistency {
  totalExerciseTimes: number;
  averageExercisePerWeek: number;
  averageDailySteps: number;
  totalFoodTrackedDays: number;
  summaryText: string;
}

export const WorkoutEatingConsistencySchema = z.object({
  totalExerciseTimes: z.number(),
  averageExercisePerWeek: z.number(),
  averageDailySteps: z.number(),
  totalFoodTrackedDays: z.number(),
  summaryText: z.string(),
});

// 食物項目
export interface FoodItem {
  name: string;
  highlights: string[];
  image?: string;
}

export const FoodItemSchema = z.object({
  name: z.string(),
  highlights: z.array(z.string()),
  image: z.string().optional(),
});

// 問題食物項目
export interface ProblemFoodItem {
  name: string;
  issues: string[];
  image?: string;
}

export const ProblemFoodItemSchema = z.object({
  name: z.string(),
  issues: z.array(z.string()),
  image: z.string().optional(),
});

// 食物分析
export interface FoodAnalysis {
  bestFoods: FoodItem[];
  worstFoods: ProblemFoodItem[];
  summaryText: string;
}

export const FoodAnalysisSchema = z.object({
  bestFoods: z.array(FoodItemSchema),
  worstFoods: z.array(ProblemFoodItemSchema),
  summaryText: z.string(),
});

// 聊天報告 - 主要的複合數據結構
export interface ChatReport {
  reportSummary: ReportSummary;
  weightTrend: WeightTrend;
  caloriesIntake: CaloriesIntake;
  macrosBreakdown: MacrosBreakdown;
  insights: Insights;
  actionPlan: ActionPlan;
  goalPrediction: GoalPrediction;
  workoutEatingConsistency: WorkoutEatingConsistency;
  foodAnalysis: FoodAnalysis;
  id: string;
  createdAt: Date;
}

export const ChatReportSchema = z.object({
  reportSummary: ReportSummarySchema,
  weightTrend: WeightTrendSchema,
  caloriesIntake: CaloriesIntakeSchema,
  macrosBreakdown: MacrosBreakdownSchema,
  insights: InsightsSchema,
  actionPlan: ActionPlanSchema,
  goalPrediction: GoalPredictionSchema,
  workoutEatingConsistency: WorkoutEatingConsistencySchema,
  foodAnalysis: FoodAnalysisSchema,
  id: z.string(),
  createdAt: FirestoreDateSchema,
});

// 創建聊天報告的 Schema (排除自動生成的欄位)
export const CreateChatReportSchema = ChatReportSchema.omit({
  id: true,
  createdAt: true,
});

// 聊天訊息的創建 Schema
export const CreateChatMessageSchema = ChatMessageSchema.omit({
  createdAt: true,
});

// API 響應 Schemas
export const ChatReportResponseSchema = z.object({
  success: z.boolean(),
  result: ChatReportSchema.optional(),
  error: z.string().optional(),
});

export const ChatReportListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(ChatReportSchema).optional(),
  error: z.string().optional(),
});

export const ChatMessageResponseSchema = z.object({
  success: z.boolean(),
  result: ChatMessageSchema.optional(),
  error: z.string().optional(),
});

export const ChatMessageListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(ChatMessageSchema).optional(),
  error: z.string().optional(),
});

export const BooleanResponseSchema = z.object({
  success: z.boolean(),
  result: z.boolean().optional(),
  error: z.string().optional(),
});

export const NumberResponseSchema = z.object({
  success: z.boolean(),
  result: z.number().optional(),
  error: z.string().optional(),
});

// Chat API Request/Response Schemas
export const ChatRequestSchema = z.object({
  input: z.string().optional(),
  userData: UserDataSchema,
  user_language: z.string().default("zh_TW"),
  historyJson: z.string().default("[]"),
  generateReport: z.boolean().default(false),
});

export const HealthReportResultSchema = z.object({
  reportSummary: ReportSummarySchema,
  weightTrend: WeightTrendSchema,
  caloriesIntake: CaloriesIntakeSchema,
  macrosBreakdown: MacrosBreakdownSchema,
  insights: InsightsSchema,
  actionPlan: ActionPlanSchema,
  goalPrediction: GoalPredictionSchema,
  workoutEatingConsistency: WorkoutEatingConsistencySchema,
  foodAnalysis: FoodAnalysisSchema,
});

export const ChatResponseSchema = z.object({
  success: z.boolean(),
  result: HealthReportResultSchema.optional(),
  error: z.string().optional(),
});

// 輔助函數：將 Firestore 文件轉換為 ChatMessage
export const convertFirestoreDocToChatMessage = (doc: any): ChatMessage => {
  const data = doc.data();
  return {
    messageId: doc.id,
    content: data.content || "",
    role: data.role || "user",
    createdAt: firestoreTimestampToDate(data.createdAt),
    chatId: data.chatId,
  };
};

// 輔助函數：將 Firestore 文件轉換為 ChatReport
export const convertFirestoreDocToChatReport = (doc: any): ChatReport => {
  const data = doc.data();
  return {
    id: doc.id,
    reportSummary: data.reportSummary || { text: "" },
    weightTrend: data.weightTrend || {
      summaryText: "",
      totalChange: 0,
      weeklyAverageChange: 0,
      unit: "kg",
      chartData: [],
    },
    caloriesIntake: data.caloriesIntake || {
      averageDailyCalories: 0,
      userTargetCalories: 0,
      unit: "kcal",
      status: StatusEnum.OK,
    },
    macrosBreakdown: data.macrosBreakdown || { nutrients: [] },
    insights: data.insights || { items: [] },
    actionPlan: data.actionPlan || { actions: [] },
    goalPrediction: data.goalPrediction || {
      text: "",
      weeksToGoal: 0,
      bestWeeksToGoal: 0,
      averageDailyCalories: 0,
      bestTargetCalories: 0,
    },
    workoutEatingConsistency: data.workoutEatingConsistency || {
      totalExerciseTimes: 0,
      averageExercisePerWeek: 0,
      averageDailySteps: 0,
      totalFoodTrackedDays: 0,
      summaryText: "",
    },
    foodAnalysis: data.foodAnalysis || {
      bestFoods: [],
      worstFoods: [],
      summaryText: "",
    },
    createdAt: firestoreTimestampToDate(data.createdAt),
  };
};
