import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { WorkoutsList } from "./WorkoutsList";
import { WorkoutByDate } from "./WorkoutByDate";
import { AddExercise } from "./AddExercise";
import { DeleteExercise } from "./DeleteExercise";
import { UpdateDailyWorkout } from "./UpdateDailyWorkout";

// 建立 daily-workouts 子路由器
export const dailyWorkoutsRouter = fromHono(new Hono());

// 套用認證中間件到所有 daily-workouts 路由
// 所有運動操作都需要使用者身份驗證
dailyWorkoutsRouter.use("/*", authMiddleware);

// GET /daily-workouts - 獲取運動列表
dailyWorkoutsRouter.get("/", WorkoutsList);

// GET /daily-workouts/{date} - 獲取指定日期的運動記錄
dailyWorkoutsRouter.get("/:date", WorkoutByDate);

// PUT /daily-workouts/{date} - 更新完整的每日運動記錄
dailyWorkoutsRouter.put("/:date", UpdateDailyWorkout);

// POST /daily-workouts/{date}/exercises - 新增手動運動
dailyWorkoutsRouter.post("/:date/exercises", AddExercise);

// DELETE /daily-workouts/{date}/exercises/{exerciseId} - 刪除運動
dailyWorkoutsRouter.delete("/:date/exercises/:exerciseId", DeleteExercise);