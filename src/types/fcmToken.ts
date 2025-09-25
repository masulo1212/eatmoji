import { z } from "zod";
import { FirestoreDateSchema, firestoreTimestampToDate } from "./diary";

// FCM 通知類型 enum
export enum NotificationType {
  MEAL_REMINDER = "meal_reminder", // 飲食記錄提醒
  PROMOTION = "promotion", // 動態優惠推播
  GENERAL = "general", // 一般通知
  UNKNOWN = "unknown", // 未知類型
}

// Zod schema for NotificationType
export const NotificationTypeSchema = z.nativeEnum(NotificationType);

// 飲食提醒通知模板（13種語言）
export interface NotificationTemplate {
  title: string;
  body: string;
}

export const NotificationTemplates: Record<string, NotificationTemplate> = {
  en: {
    title: "Eatmoji",
    body: "Don't forget to log your meals and exercise today!",
  },
  zh_TW: { title: "Eatmoji", body: "記得記錄今天的飲食與運動哦！" },
  zh_CN: { title: "Eatmoji", body: "记得记录今天的饮食与运动哦！" },
  ja: {
    title: "Eatmoji",
    body: "今日の食事と運動を記録することを忘れないでください！",
  },
  ko: {
    title: "Eatmoji",
    body: "오늘의 식사와 운동을 기록하는 것을 잊지 마세요！",
  },
  vi: {
    title: "Eatmoji",
    body: "Đừng quên ghi lại bữa ăn và tập thể dục hôm nay!",
  },
  th: {
    title: "Eatmoji",
    body: "อย่าลืมบันทึกอาหารและการออกกำลังกายของวันนี้!",
  },
  ms: {
    title: "Eatmoji",
    body: "Jangan lupa catat makanan dan senaman hari ini!",
  },
  id: {
    title: "Eatmoji",
    body: "Jangan lupa catat makanan dan olahraga hari ini!",
  },
  fr: {
    title: "Eatmoji",
    body: "N'oubliez pas d'enregistrer vos repas et exercices aujourd'hui !",
  },
  de: {
    title: "Eatmoji",
    body: "Vergiss nicht, deine Mahlzeiten und Übungen heute zu protokollieren!",
  },
  es: {
    title: "Eatmoji",
    body: "¡No olvides registrar tus comidas y ejercicios de hoy!",
  },
  "pt-br": {
    title: "Eatmoji",
    body: "Não esqueça de registrar suas refeições e exercícios hoje!",
  },
};

// FCM Token 資料結構
export interface FcmTokenData {
  token: string;
  deviceId: string;
  platform: string;
  language: string;
  appVersion: string;
  lastActive: Date;
  createdAt: Date;
}

// Zod schema for NotificationTemplate
export const NotificationTemplateSchema = z.object({
  title: z.string(),
  body: z.string(),
});

// Zod schema for FcmTokenData
export const FcmTokenDataSchema = z.object({
  token: z.string().min(1, "FCM Token 不能為空"),
  deviceId: z.string().min(1, "設備 ID 不能為空"),
  platform: z.enum(["ios", "android"], {
    errorMap: () => ({ message: "平台必須為 ios 或 android" }),
  }),
  language: z.string().default("en"),
  appVersion: z.string().default("1.0.0"),
  lastActive: FirestoreDateSchema,
  createdAt: FirestoreDateSchema,
});

// Schema for creating/updating FCM Token
export const CreateFcmTokenSchema = z.object({
  token: z.string().min(1, "FCM Token 不能為空"),
  deviceId: z.string().min(1, "設備 ID 不能為空"),
  platform: z.enum(["ios", "android"], {
    errorMap: () => ({ message: "平台必須為 ios 或 android" }),
  }),
  language: z.string().default("en"),
  appVersion: z.string().default("1.0.0"),
});



// Response schemas
export const FcmTokenResponseSchema = z.object({
  success: z.boolean(),
  result: FcmTokenDataSchema.optional(),
  error: z.string().optional(),
});

export const FcmTokenListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(FcmTokenDataSchema).optional(),
  error: z.string().optional(),
});


export const FcmTokenDeleteResponseSchema = z.object({
  success: z.boolean(),
  result: z
    .object({
      deletedCount: z.number().describe("刪除的 Token 數量"),
    })
    .optional(),
  error: z.string().optional(),
});

// API 請求/響應介面
export interface CreateFcmTokenRequest {
  token: string;
  deviceId: string;
  platform: "ios" | "android";
  language?: string;
  appVersion?: string;
}



// API 響應格式
export interface ApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

export interface FcmTokenListResponse extends ApiResponse<FcmTokenData[]> {}
export interface DeleteTokensResponse
  extends ApiResponse<{ deletedCount: number }> {}

// 工具函式：根據語言獲取飲食提醒模板
export function getMealReminderTemplate(
  language: string
): NotificationTemplate {
  return NotificationTemplates[language] || NotificationTemplates["en"];
}

// 工具函式：將 FcmTokenData 轉換為 Firestore 格式
// export function fcmTokenDataToFirestore(data: FcmTokenData): any {
//   return {
//     token: data.token,
//     deviceId: data.deviceId,
//     platform: data.platform,
//     language: data.language,
//     appVersion: data.appVersion,
//     lastActive: data.lastActive,
//     createdAt: data.createdAt,
//   };
// }

// 工具函式：從 Firestore 資料轉換為 FcmTokenData
export function fcmTokenDataFromFirestore(data: any): FcmTokenData {
  return {
    token: data.token || "",
    deviceId: data.deviceId || "",
    platform: data.platform || "",
    language: data.language || "en",
    appVersion: data.appVersion || "1.0.0",
    lastActive: firestoreTimestampToDate(data.lastActive),
    createdAt: firestoreTimestampToDate(data.createdAt),
  };
}

// 工具函式：檢查 Token 是否在指定天數內活躍
export function isTokenActive(
  tokenData: FcmTokenData,
  activePeriodDays: number = 7
): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - activePeriodDays);
  return tokenData.lastActive >= cutoffDate;
}

// 工具函式：檢查 Token 是否已過期（預設 30 天）
export function isTokenExpired(
  tokenData: FcmTokenData,
  expiredPeriodDays: number = 30
): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - expiredPeriodDays);
  return tokenData.lastActive < cutoffDate;
}
