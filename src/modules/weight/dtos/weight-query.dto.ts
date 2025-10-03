import { z } from "zod";

/**
 * 查詢體重記錄的 DTO
 */
export class WeightQueryDto {
  /**
   * 開始日期過濾條件 (YYYY-MM-DD 格式)
   */
  startDate?: string;

  constructor(data: WeightQueryDtoType | WeightQueryDto | { startDate?: string }) {
    this.startDate = data.startDate;
  }

  /**
   * 轉換為 Date 物件
   */
  getStartDateAsDate(): Date | undefined {
    if (!this.startDate) return undefined;
    return new Date(this.startDate);
  }
}

/**
 * Zod schema for WeightQueryDto validation
 */
export const WeightQueryDtoSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD")
    .optional()
    .describe("過濾此日期之後的體重記錄（包含此日期）"),
});

/**
 * Type for validated WeightQueryDto
 */
export type WeightQueryDtoType = z.infer<typeof WeightQueryDtoSchema>;