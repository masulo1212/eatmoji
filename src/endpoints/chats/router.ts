import { Hono } from "hono";
import { fromHono } from "chanfana";
import { authMiddleware } from "../../middleware/auth";
import { ChatsHasAny } from "./ChatsHasAny";
import { ChatsAdd } from "./ChatsAdd";
import { ChatsLatest } from "./ChatsLatest";
import { ChatsCount } from "./ChatsCount";
import { ChatMessages } from "./ChatMessages";
import { ChatMessageAdd } from "./ChatMessageAdd";

// 建立 chats 子路由器
export const chatsRouter = fromHono(new Hono());

// 套用認證中間件到所有 chats 路由
// 所有 chat 操作都需要使用者身份驗證
chatsRouter.use("/*", authMiddleware);

// GET /chats/has-any - 檢查使用者是否有任何聊天記錄
// 對應 Dart hasAnyChats() 方法
chatsRouter.get("/has-any", ChatsHasAny);

// GET /chats/latest - 獲取最新的聊天記錄
// 對應 Dart getLatestChat() 方法
chatsRouter.get("/latest", ChatsLatest);

// GET /chats/count - 獲取聊天記錄總數
// 對應 Dart getTotalChatCount() 方法
chatsRouter.get("/count", ChatsCount);

// POST /chats - 添加新的聊天記錄
// 對應 Dart addChat(ChatReport chatReport) 方法
chatsRouter.post("/", ChatsAdd);

// GET /chats/:chatId/messages - 獲取指定聊天的所有訊息
// 對應 Dart getChatMessages(String chatId) 方法
chatsRouter.get("/:chatId/messages", ChatMessages);

// POST /chats/:chatId/messages - 發送訊息到指定聊天
// 對應 Dart sendMessage(ChatMessage msg) 方法
chatsRouter.post("/:chatId/messages", ChatMessageAdd);

// 未來的端點規劃：
// chatsRouter.get("/:chatId", ChatRead);           // 獲取單一聊天記錄詳細資訊
// chatsRouter.put("/:chatId", ChatUpdate);         // 更新聊天記錄
// chatsRouter.delete("/:chatId", ChatDelete);      // 軟刪除聊天記錄
// chatsRouter.get("/", ChatsList);                 // 獲取聊天記錄列表（分頁）
// chatsRouter.get("/summary", ChatsSummary);       // 獲取聊天統計摘要
// chatsRouter.post("/initialize", ChatsInitialize); // 初始化聊天數據（複合端點）