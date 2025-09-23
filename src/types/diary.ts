import { z } from "zod";

// TaskStatus enum
export enum TaskStatus {
  UPLOADING = "uploading",
  ANALYZING = "analyzing",
  DONE = "done",
  FAILED = "failed",
}

// Zod schema for TaskStatus
export const TaskStatusSchema = z.nativeEnum(TaskStatus);

// HealthAssessment interface and schema
export interface HealthAssessment {
  score: number;
  pros: any[];
  cons: any[];
}

export const HealthAssessmentSchema = z.object({
  score: z.number(),
  pros: z.array(z.any()).default([]),
  cons: z.array(z.any()).default([]),
});

// Ingredient interface and schema
export interface Ingredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amountValue: number;
  amountUnit: string;
  status: TaskStatus;
  imageUrl?: string | null;
}

export const IngredientSchema = z.object({
  name: z.string(),
  calories: z.number().default(0),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
  amountValue: z.number().default(0),
  amountUnit: z.string(),
  status: TaskStatusSchema.default(TaskStatus.DONE),
  imageUrl: z.string().nullable().optional(),
});

// Diary interface
export interface Diary {
  id?: string;
  userId?: string;
  name: string;
  brand?: string;
  originalImgs?: string[] | null;
  stickerImg?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthAssessment?: HealthAssessment;
  ingredients?: Ingredient[];
  portions: number;
  sourceId?: string | null;
  source?: string | null;
  status: TaskStatus;
  progress?: number;
  error?: string | null;
  diaryDate: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

// Firestore Timestamp conversion helpers
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

export const OptionalFirestoreDateSchema = z
  .any()
  .nullable()
  .optional()
  .transform((val) => {
    if (val === null || val === undefined) return undefined;
    try {
      return firestoreTimestampToDate(val);
    } catch (error) {
      // If conversion fails, return undefined for optional fields
      console.warn("Failed to convert optional timestamp:", error);
      return undefined;
    }
  });

// Main Diary Zod schema for validation
export const DiarySchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  brand: z.string().optional(),
  originalImgs: z.array(z.string()).nullable().optional(),
  stickerImg: z.string().nullable().optional(),
  calories: z.number().default(0),
  protein: z.number().default(0),
  carbs: z.number().default(0),
  fat: z.number().default(0),
  healthAssessment: HealthAssessmentSchema.optional(),
  ingredients: z.array(IngredientSchema).optional(),
  portions: z.number().default(1),
  sourceId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: TaskStatusSchema.default(TaskStatus.DONE),
  progress: z.number().optional(),
  error: z.string().nullable().optional(),
  diaryDate: FirestoreDateSchema,
  createdAt: FirestoreDateSchema,
  updatedAt: FirestoreDateSchema,
  isDeleted: z.boolean().default(false),
  deletedAt: OptionalFirestoreDateSchema,
});

// Schema for creating a new diary (excludes generated fields)
export const CreateDiarySchema = DiarySchema.omit({
  // id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating a diary (all fields optional)
// export const UpdateDiarySchema = DiarySchema.partial();

// Response schemas for API
export const DiaryResponseSchema = z.object({
  success: z.boolean(),
  result: DiarySchema.optional(),
  error: z.string().optional(),
});

export const DiaryListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(DiarySchema).optional(),
  error: z.string().optional(),
});
