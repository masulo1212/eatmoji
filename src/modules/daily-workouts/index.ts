/**
 * DailyWorkout Module 入口檔案
 */

export { DailyWorkoutModule } from "./daily-workout.module";
export { DailyWorkoutController } from "./daily-workout.controller";
export { DailyWorkoutService } from "./daily-workout.service";
export type { IDailyWorkoutService } from "./daily-workout.service";
export { DailyWorkoutRepository } from "./daily-workout.repository";
export type { IDailyWorkoutRepository } from "./daily-workout.repository";

// 匯出類型和 DTO
export * from "./types/daily-workout.types";
export * from "./dtos";

// 保留 Endpoint 為向後兼容性（如果需要）
export { WorkoutsList } from "./endpoints/workouts-list";