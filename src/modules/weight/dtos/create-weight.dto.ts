import { z } from "zod";

/**
 * 建立體重記錄的 DTO
 */
export class CreateWeightDto {
  /**
   * 體重值
   */
  weight: number;

  /**
   * 體重單位 (kg, lbs)
   */
  unit: string;

  /**
   * 資料來源 (manual, healthKit)
   */
  source?: string;

  /**
   * 記錄日期 ID (YYYY-MM-DD 格式)
   */
  dateId?: string;

  /**
   * 建立時間
   */
  createdAt?: Date;

  constructor(data: CreateWeightDto) {
    this.weight = data.weight;
    this.unit = data.unit;
    this.source = data.source || "manual";
    this.dateId = data.dateId;
    this.createdAt = data.createdAt;
  }
}

/**
 * Zod schema for CreateWeightDto validation
 */
export const CreateWeightDtoSchema = z.object({
  weight: z.number().positive("體重必須為正數"),
  unit: z.string().min(1, "單位不能為空"),
  source: z.string().default("manual").optional(),
  dateId: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateId 格式必須為 YYYY-MM-DD")
    .optional(),
  createdAt: z.date().optional(),
});

/**
 * Type for validated CreateWeightDto
 */
export type CreateWeightDtoType = z.infer<typeof CreateWeightDtoSchema>;