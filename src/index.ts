import { ApiException } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "./bindings";
import { UserModule } from "./modules/users";
import { WeightModule } from "./modules/weight";
import { ConfigModule } from "./modules/config";
import { DailyWorkoutModule } from "./modules/daily-workouts";
import { initializeFirestore } from "./utils/firebase";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();
const IS_DEV = process.env.NODE_ENV !== "production";
console.log(IS_DEV);

// 不需要額外的路由處理，@Post() 和 @Get() 會自動處理路徑匹配

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode
    );
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500
  );
});

// // Setup OpenAPI registry
// const openapi = fromHono(app, {
//   docs_url: IS_DEV ? "/" : undefined,
//   schema: {
//     info: {
//       title: "Eatmoji API",
//       version: "2.0.0",
//       description: "Eatmoji API Documentation",
//     },
//   },
// });

// // Register Tasks Sub router
// openapi.route("/tasks", tasksRouter);

// // Register Diaries Sub router
// openapi.route("/diaries", diariesRouter);

// // Register Chats Sub router
// openapi.route("/chats", chatsRouter);

// // Register Daily Workouts Sub router
// openapi.route("/daily-workouts", dailyWorkoutsRouter);

// // Register FavFoods Sub router
// openapi.route("/fav-foods", favFoodsRouter);

// // Register Recipes Sub router
// openapi.route("/recipes", recipesRouter);

// // Register Users Sub router
// openapi.route("/users", usersRouter);

// // Register FCM Tokens Sub router
// openapi.route("/fcm-tokens", fcmTokensRouter);

// // Register Images Sub router
// openapi.route("/images", imagesRouter);

// // Register Gemini AI Sub router
// openapi.route("/gemini", geminiRouter);

// // Register Email Sub router
// openapi.route("/email", emailRouter);

// // Register Config Sub router
// openapi.route("/config", configRouter);

// // Register other endpoints
// openapi.post("/dummy/:slug", DummyEndpoint);

// 模組管理器 - 管理所有 NestJS 風格的模組
class ModuleManager {
  private static initialized = false;

  static async initializeModules(
    app: Hono<{ Bindings: Env }>,
    env: any
  ): Promise<void> {
    if (this.initialized) return;

    console.log("🚀 正在初始化所有模組...");

    try {
      const firestore = initializeFirestore(env);

      // 註冊 WeightModule 到主應用程式
      // Controller 的 basePath: "/weight" 會自動處理路由前綴
      WeightModule.register(app, { firestore });
      console.log("✅ WeightModule 註冊完成");

      // 註冊 UserModule 到主應用程式
      // Controller 的 basePath: "/users" 會自動處理路由前綴
      UserModule.register(app, { firestore });
      console.log("✅ UserModule 註冊完成");

      // 註冊 ConfigModule 到主應用程式
      // 處理配置相關的 API 端點：/config/*
      ConfigModule.register(app, { firestore });
      console.log("✅ ConfigModule 註冊完成");

      // 註冊 DailyWorkoutModule 到主應用程式
      // 處理每日運動相關的 API 端點：/daily-workouts/*
      DailyWorkoutModule.register(app, { firestore });
      console.log("✅ DailyWorkoutModule 註冊完成");

      // 未來在這裡新增其他模組
      // DiaryModule.register(app, { firestore });
      // ChatModule.register(app, { firestore });

      this.initialized = true;
      console.log("✅ 所有模組註冊完成");
    } catch (error) {
      console.error("❌ 模組初始化失敗:", error);
      throw error;
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

// 建立初始化函數，在模組導出之前調用
async function initializeApp() {
  // 使用假的環境變數進行初始化
  // 實際的 Firestore 會在第一次請求時建立
  const dummyEnv = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "dummy",
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "dummy",
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "dummy",
  };

  try {
    await ModuleManager.initializeModules(app, dummyEnv);
  } catch (error) {
    console.error("應用程式初始化失敗，將使用延遲初始化:", error);
  }
}

// 模組初始化中間件（僅用於延遲初始化）
app.use("*", async (c, next) => {
  // 如果尚未初始化，嘗試使用實際環境變數初始化
  if (!ModuleManager.isInitialized()) {
    try {
      await ModuleManager.initializeModules(app, c.env);
    } catch (error) {
      console.error("❌ 延遲模組初始化失敗:", error);
      return c.json({ error: "模組初始化失敗" }, 500);
    }
  }

  await next();
});

// 嘗試立即初始化
initializeApp().catch(console.error);

// 模組路由現在由 Controller 的 basePath 自動處理
// WeightController 的 @Controller({ basePath: "/weight" }) 會自動註冊路由

// Export the Hono app
export default app;
