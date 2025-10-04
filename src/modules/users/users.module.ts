import { applyController } from "@asla/hono-decorator";
import { FirestoreClient } from "firebase-rest-firestore";
import { Context, Hono } from "hono";
import { FirestoreService, IFirestoreService } from "../../shared";
import { getFirestoreFromContext } from "../../utils/firebase";
import { UserController } from "./users.controller";
import { IUserRepository, UserRepository } from "./users.repository";
import { IUserService, UserService } from "./users.service";

/**
 * 依賴注入容器介面
 */
export interface UserModuleDependencies {
  firestore: FirestoreClient;
}

/**
 * User Module 類別
 * 負責管理 User 模組的所有依賴和配置
 */
export class UserModule {
  /**
   * 控制器清單
   */
  static controllers = [UserController];

  /**
   * 服務提供者清單
   */
  static providers = [FirestoreService, UserRepository, UserService];

  /**
   * 手動依賴注入容器
   */
  private static dependencies: Map<string, any> = new Map();

  /**
   * 註冊依賴
   * @param key 依賴的鍵
   * @param instance 依賴的實例
   */
  static registerDependency<T>(key: string, instance: T): void {
    this.dependencies.set(key, instance);
  }

  /**
   * 取得依賴
   * @param key 依賴的鍵
   * @returns 依賴實例
   */
  static getDependency<T>(key: string): T {
    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(
        `Dependency '${key}' not found. Please register it first.`
      );
    }
    return dependency;
  }

  /**
   * 建立 FirestoreService 實例
   * @param firestore Firestore 客戶端
   * @returns FirestoreService 實例
   */
  static createFirestoreService(firestore: FirestoreClient): IFirestoreService {
    return new FirestoreService(firestore, {
      enableLogging: true,
      retryAttempts: 3,
      timeout: 10000,
    });
  }

  /**
   * 建立 UserRepository 實例
   * @param firestoreService Firestore 服務
   * @returns UserRepository 實例
   */
  static createUserRepository(
    firestoreService: IFirestoreService
  ): IUserRepository {
    return new UserRepository(firestoreService);
  }

  /**
   * 建立 UserService 實例
   * @param repository UserRepository 實例
   * @returns UserService 實例
   */
  static createUserService(repository: IUserRepository): IUserService {
    return new UserService(repository);
  }

  /**
   * 建立 UserController 實例
   * @param service UserService 實例
   * @returns UserController 實例
   */
  static createUserController(service: IUserService): UserController {
    return new UserController(service);
  }

  /**
   * 直接註冊 UserModule 控制器到主應用程式
   * @param app 主 Hono 應用程式
   * @param dependencies 模組依賴
   */
  static register(app: Hono<any>, dependencies: UserModuleDependencies): void {
    try {
      // 建立依賴鏈
      const firestoreService = this.createFirestoreService(
        dependencies.firestore
      );
      const repository = this.createUserRepository(firestoreService);
      const service = this.createUserService(repository);
      const controller = this.createUserController(service);

      // 註冊依賴到容器
      this.registerDependency("firestoreService", firestoreService);
      this.registerDependency("userRepository", repository);
      this.registerDependency("userService", service);
      this.registerDependency("userController", controller);

      // 使用 @asla/hono-decorator 套用控制器到主應用程式
      // Controller 中的 basePath: "/users" 會自動處理路由前綴
      applyController(app, controller);

      console.log("✅ UserModule 註冊到主應用程式成功");
    } catch (error) {
      console.error("❌ UserModule 註冊失敗:", error);
      throw error;
    }
  }

  /**
   * 建立並返回 UserModule 的子應用程式（向後兼容）
   * @param dependencies 模組依賴
   * @returns 包含 User 路由的 Hono 子應用程式
   * @deprecated 使用 register() 方法替代，直接註冊到主應用程式
   */
  static createSubApp(dependencies: UserModuleDependencies): Hono {
    try {
      // 建立獨立的 Hono 子應用程式（無環境綁定）
      const userApp = new Hono();
      this.register(userApp, dependencies);
      return userApp;
    } catch (error) {
      console.error("❌ UserModule 子應用程式建立失敗:", error);
      throw error;
    }
  }

  /**
   * 從 Hono Context 建立和註冊模組
   * 這是一個便利方法，用於自動從 context 取得 Firestore
   * @param app Hono 應用程式實例
   * @param context Hono Context (包含 Firestore)
   */
  static registerFromContext(app: Hono, context: Context): void {
    const firestore = getFirestoreFromContext(context);
    this.register(app, { firestore });
  }

  /**
   * 取得模組的所有控制器
   * @returns 控制器類別陣列
   */
  static getControllers() {
    return this.controllers;
  }

  /**
   * 取得模組的所有服務提供者
   * @returns 服務提供者類別陣列
   */
  static getProviders() {
    return this.providers;
  }

  /**
   * 清除所有註冊的依賴（主要用於測試）
   */
  static clearDependencies(): void {
    this.dependencies.clear();
  }

  /**
   * 檢查模組是否已正確初始化
   * @returns 是否已初始化
   */
  static isInitialized(): boolean {
    return (
      this.dependencies.has("firestoreService") &&
      this.dependencies.has("userRepository") &&
      this.dependencies.has("userService") &&
      this.dependencies.has("userController")
    );
  }
}