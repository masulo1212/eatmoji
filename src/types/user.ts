import { z } from "zod";

// GoalType enum
export enum GoalType {
  LOSE_WEIGHT = "loseWeight",
  MAINTAIN = "maintain",
  GAIN_WEIGHT = "gainWeight",
}

// Zod schema for GoalType
export const GoalTypeSchema = z.nativeEnum(GoalType);

// RevenueCat EntitlementInfo interface and schema
export interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  latestPurchaseDate?: string;
  originalPurchaseDate?: string;
  expiresDate?: string;
  store: string;
  productIdentifier: string;
  isSandbox: boolean;
  unsubscribeDetectedAt?: string;
  billingIssueDetectedAt?: string;
}

export const EntitlementInfoSchema = z.object({
  identifier: z.string(),
  isActive: z.boolean(),
  willRenew: z.boolean(),
  periodType: z.string(),
  latestPurchaseDate: z.string().optional(),
  originalPurchaseDate: z.string().optional(),
  expiresDate: z.string().optional(),
  store: z.string(),
  productIdentifier: z.string(),
  isSandbox: z.boolean(),
  unsubscribeDetectedAt: z.string().optional(),
  billingIssueDetectedAt: z.string().optional(),
});

// RevenueCat Subscription interface and schema
export interface RevenueCatSubscription {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  latestPurchaseDate?: string;
  originalPurchaseDate?: string;
  expiresDate?: string;
  store: string;
  productIdentifier: string;
  isSandbox: boolean;
  unsubscribeDetectedAt?: string;
  billingIssueDetectedAt?: string;
}

export const RevenueCatSubscriptionSchema = z.object({
  identifier: z.string(),
  isActive: z.boolean(),
  willRenew: z.boolean(),
  periodType: z.string(),
  latestPurchaseDate: z.string().optional(),
  originalPurchaseDate: z.string().optional(),
  expiresDate: z.string().optional(),
  store: z.string(),
  productIdentifier: z.string(),
  isSandbox: z.boolean(),
  unsubscribeDetectedAt: z.string().optional(),
  billingIssueDetectedAt: z.string().optional(),
});

// Firestore Timestamp conversion helpers (reusing from diary.ts pattern)
export const firestoreTimestampToDate = (timestamp: any): Date => {
  // Handle null/undefined (for OpenAPI generation)
  if (timestamp === null || timestamp === undefined) {
    return new Date(); // Return current date as default for OpenAPI generation
  }

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's a Firestore Timestamp object
  if (
    timestamp._seconds !== undefined &&
    timestamp._nanoseconds !== undefined
  ) {
    return new Date(
      timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000
    );
  }

  // If it's a Firebase Timestamp object
  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }

  // If it's an ISO string
  if (typeof timestamp === "string") {
    // console.log("timestamp 是 string", timestamp);
    return new Date(timestamp);
  }

  // If it's a number (Unix timestamp)
  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  // For invalid formats, return current date instead of throwing error
  console.warn(
    `Invalid timestamp format: ${typeof timestamp}, using current date`
  );
  return new Date();
};

export const dateToFirestoreTimestamp = (date: Date) => {
  return {
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: (date.getTime() % 1000) * 1000000,
  };
};

// Zod schema for dates (handles Firestore Timestamps)
export const FirestoreDateSchema = z.any().transform((val) => {
  try {
    return firestoreTimestampToDate(val);
  } catch (error) {
    // If conversion fails during OpenAPI generation, return current date
    console.warn("Failed to convert timestamp, using current date:", error);
    return new Date();
  }
});

export const OptionalFirestoreDateSchema = z
  .any()
  .nullable()
  .optional()
  .transform((val) => {
    // console.log("OptionalFirestoreDateSchema", val);
    if (val === null || val === undefined) return undefined;
    try {
      return firestoreTimestampToDate(val);
    } catch (error) {
      // If conversion fails, return undefined for optional fields
      console.warn("Failed to convert optional timestamp:", error);
      return undefined;
    }
  });

// AppUser interface (類型與 Schema 保持一致，支持 null 值)
export interface AppUser {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  gender?: string | null;
  age?: number | null; // 儲存出生年份，例如 1998
  height?: number | null;
  initWeight?: number | null;
  targetWeight?: number | null;
  goal?: GoalType | null;

  // 偏好單位
  preferHeightUnit?: string | null;
  preferWeightUnit?: string | null;
  activityLevel?: string | null;
  weightSpeedPerWeek?: number | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetFat?: number | null;
  targetCarb?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  isRecipePublic: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  lastSyncAt?: Date;

  // 同步設備管理欄位
  primarySyncDevice?: string | null; // 主要同步設備 ID
  primarySyncPlatform?: string | null; // 主要同步平台 (ios/android)
  lastSyncPlatform?: string | null; // 最後同步的平台
  syncDeviceSwitchedAt?: Date; // 切換同步設備的時間
  deviceLanguage?: string | null;

  // RevenueCat 整合屬性
  entitlements?: Record<string, EntitlementInfo> | null;
  subscriptions?: Record<string, RevenueCatSubscription> | null;
  activeSubscriptions?: string[] | null;
  allPurchasedProductIds?: string[] | null;
  managementUrl?: string | null;
  originalAppUserId?: string | null;
  revenueCatFirstSeen?: Date;
  revenueCatLastSeen?: Date;
  revenueCatOriginalPurchaseDate?: Date;
  revenueCatRequestDate?: Date;
}

// Main AppUser Zod schema for validation (用於讀取，包含 RevenueCat 欄位)
export const AppUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullish(),
  photoURL: z.string().url().nullish(),
  gender: z.string().nullish(),
  age: z.number().int().positive().nullish(),
  height: z.number().positive().nullish(),
  initWeight: z.number().positive().nullish(),
  targetWeight: z.number().positive().nullish(),
  goal: GoalTypeSchema.nullish(),

  // 偏好單位
  preferHeightUnit: z.string().nullish(),
  preferWeightUnit: z.string().nullish(),
  activityLevel: z.string().nullish(),
  weightSpeedPerWeek: z.number().positive().nullish(),
  targetCalories: z.number().positive().nullish(),
  targetProtein: z.number().positive().nullish(),
  targetFat: z.number().positive().nullish(),
  targetCarb: z.number().positive().nullish(),
  bmr: z.number().positive().nullish(),
  tdee: z.number().positive().nullish(),
  isRecipePublic: z.boolean().default(true),

  createdAt: OptionalFirestoreDateSchema,
  updatedAt: OptionalFirestoreDateSchema,
  lastLoginAt: OptionalFirestoreDateSchema,
  lastSyncAt: OptionalFirestoreDateSchema,

  // 同步設備管理欄位
  primarySyncDevice: z.string().nullish(),
  primarySyncPlatform: z.string().nullish(),
  lastSyncPlatform: z.string().nullish(),
  syncDeviceSwitchedAt: OptionalFirestoreDateSchema,
  deviceLanguage: z.string().nullish(),

  // RevenueCat 整合屬性 (僅用於讀取，不用於驗證寫入)
  entitlements: z.record(z.string(), EntitlementInfoSchema).nullish(),
  subscriptions: z.record(z.string(), RevenueCatSubscriptionSchema).nullish(),
  activeSubscriptions: z.array(z.string()).nullish(),
  allPurchasedProductIds: z.array(z.string()).nullish(),
  managementUrl: z.string().url().nullish(),
  originalAppUserId: z.string().nullish(),
  revenueCatFirstSeen: OptionalFirestoreDateSchema,
  revenueCatLastSeen: OptionalFirestoreDateSchema,
  revenueCatOriginalPurchaseDate: OptionalFirestoreDateSchema,
  revenueCatRequestDate: OptionalFirestoreDateSchema,
});

// 用於寫入的精簡 Schema (移除 RevenueCat 和時間戳欄位)
export const WriteUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullish(),
  photoURL: z.string().url().nullish(),
  gender: z.string().nullish(),
  age: z.number().int().positive().nullish(),
  height: z.number().positive().nullish(),
  initWeight: z.number().positive().nullish(),
  targetWeight: z.number().positive().nullish(),
  goal: GoalTypeSchema.nullish(),

  // 偏好單位
  preferHeightUnit: z.string().nullish(),
  preferWeightUnit: z.string().nullish(),
  activityLevel: z.string().nullish(),
  weightSpeedPerWeek: z.number().positive().nullish(),
  targetCalories: z.number().positive().nullish(),
  targetProtein: z.number().positive().nullish(),
  targetFat: z.number().positive().nullish(),
  targetCarb: z.number().positive().nullish(),
  bmr: z.number().positive().nullish(),
  tdee: z.number().positive().nullish(),
  isRecipePublic: z.boolean().default(true),

  // 同步設備管理欄位
  lastLoginAt: OptionalFirestoreDateSchema,
  lastSyncAt: OptionalFirestoreDateSchema,
  primarySyncDevice: z.string().nullish(),
  primarySyncPlatform: z.string().nullish(),
  lastSyncPlatform: z.string().nullish(),
  deviceLanguage: z.string().nullish(),
  syncDeviceSwitchedAt: OptionalFirestoreDateSchema,
});

// Schema for creating a new user (基於 WriteUserSchema，移除生成的欄位)
export const CreateUserSchema = WriteUserSchema.omit({
  // uid 在 endpoint 中處理，不需要在 body 中要求
})
  .partial()
  .extend({
    uid: z.string().optional(), // uid 是可選的，會在 endpoint 中設定
    email: z.string().email(), // email 是必須的
  });

// Schema for updating a user (基於 WriteUserSchema，所有欄位可選，移除不可更新欄位)
export const UpdateUserSchema = WriteUserSchema.omit({
  uid: true, // uid 不能更新
}).partial();

// Response schemas for API
export const UserResponseSchema = z.object({
  success: z.boolean(),
  result: AppUserSchema.optional(),
  error: z.string().optional(),
});

export const UserExistsResponseSchema = z.object({
  success: z.boolean(),
  result: z.boolean().optional(), // true if user exists, false if not
  error: z.string().optional(),
});
