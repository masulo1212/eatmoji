import { fromHono } from "chanfana";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";
import { AddMeal } from "./AddMeal";
import { AnalyzeImages } from "./AnalyzeImages";
import { AddRecipe } from "./AddRecipe";
import { AddIngredient } from "./AddIngredient";
import { AddRecipeIngredient } from "./AddRecipeIngredient";
import { EditRecipe } from "./EditRecipe";
import { Chat } from "./Chat";
import { TranslateIngredient } from "./TranslateIngredient";
import type { Env } from "../../bindings";

// 創建 Gemini AI 相關的子路由
const app = new Hono<{ Bindings: Env }>();

// 應用認證中間件到所有 Gemini 路由
// 確保只有通過 Firebase 認證的用戶才能訪問 Gemini AI 功能
app.use("*", authMiddleware);

// 設置 OpenAPI 路由
const geminiRouter = fromHono(app, {
  schema: {
    info: {
      title: "Gemini AI API",
      version: "1.0.0",
      description: "基於 Google Gemini AI 的智能分析功能",
    },
  },
});

// 註冊 AddMeal endpoint
geminiRouter.post("/add-meal", AddMeal);

// 註冊 AnalyzeImages endpoint
geminiRouter.post("/analyze-images", AnalyzeImages);

// 註冊 AddRecipe endpoint
geminiRouter.post("/add-recipe", AddRecipe);

// 註冊 AddIngredient endpoint
geminiRouter.post("/add-ingredient", AddIngredient);

// 註冊 AddRecipeIngredient endpoint
geminiRouter.post("/add-recipe-ingredient", AddRecipeIngredient);

// 註冊 EditRecipe endpoint
geminiRouter.post("/edit-recipe", EditRecipe);

// 註冊 Chat endpoint
geminiRouter.post("/chat", Chat);

// 註冊 TranslateIngredient endpoint
geminiRouter.post("/translate-ingredient", TranslateIngredient);

// 匯出 router 供主應用使用
export { geminiRouter };