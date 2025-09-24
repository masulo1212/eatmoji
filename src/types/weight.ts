import { z } from "zod";

// DataSource enum - 對應前端的 DataSource
export enum DataSource {
  HEALTH_KIT = "healthKit",
  MANUAL = "manual",
}

// Zod schema for DataSource
export const DataSourceSchema = z.nativeEnum(DataSource);

// WeightEntry interface - 與前端完全一致
export interface WeightEntry {
  dateId: string; // 格式: "2024-01-15"
  weight: number;
  unit: string;
  source: string;
  createdAt: Date;
}

// Firestore Timestamp 轉換函數 - 與 diary.ts 一致
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

// Main WeightEntry Zod schema for validation
export const WeightEntrySchema = z.object({
  dateId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateId 格式必須為 YYYY-MM-DD"),
  weight: z.number().positive("體重必須為正數"),
  unit: z.string().min(1, "單位不能為空"),
  source: z.string().default("manual"),
  createdAt: FirestoreDateSchema,
});

// Schema for creating a new weight entry (excludes generated fields)
export const CreateWeightEntrySchema = WeightEntrySchema.omit({
  // Allow dateId to be provided or generated from createdAt
}).extend({
  dateId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateId 格式必須為 YYYY-MM-DD").optional(),
});

// Schema for updating weight entry (all fields optional except dateId)
export const UpdateWeightEntrySchema = WeightEntrySchema.partial().extend({
  dateId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateId 格式必須為 YYYY-MM-DD"),
});

// Response schemas for API
export const WeightEntryResponseSchema = z.object({
  success: z.boolean(),
  result: WeightEntrySchema.optional(),
  error: z.string().optional(),
});

export const WeightEntryListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(WeightEntrySchema).optional(),
  error: z.string().optional(),
});

// Query parameters for getWeight
export const WeightQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD")
    .optional()
    .describe("過濾此日期之後的體重記錄（包含此日期）"),
});