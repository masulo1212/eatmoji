import { applyController } from "@asla/hono-decorator";
import { FirestoreClient } from "firebase-rest-firestore";
import { Context, Hono } from "hono";
import { FirestoreService, IFirestoreService } from "../../shared";
import { getFirestoreFromContext } from "../../utils/firebase";
import { WeightController } from "./weight.controller";
import { IWeightRepository, WeightRepository } from "./weight.repository";
import { IWeightService, WeightService } from "./weight.service";

/**
 * 依賴注入容器介面
 */
export interface WeightModuleDependencies {
  firestore: FirestoreClient;
}

/**
 * Weight Module 類別
 * 負責管理 Weight 模組的所有依賴和配置
 */
export class WeightModule {
  /**
   * 控制器清單
   */
  static controllers = [WeightController];

  /**
   * 服務提供者清單
   */
  static providers = [FirestoreService, WeightRepository, WeightService];

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
   * 建立 WeightRepository 實例
   * @param firestoreService Firestore 服務
   * @returns WeightRepository 實例
   */
  static createWeightRepository(
    firestoreService: IFirestoreService
  ): IWeightRepository {
    return new WeightRepository(firestoreService);
  }

  /**
   * 建立 WeightService 實例
   * @param repository WeightRepository 實例
   * @returns WeightService 實例
   */
  static createWeightService(repository: IWeightRepository): IWeightService {
    return new WeightService(repository);
  }

  /**
   * 建立 WeightController 實例
   * @param service WeightService 實例
   * @returns WeightController 實例
   */
  static createWeightController(service: IWeightService): WeightController {
    return new WeightController(service);
  }

  /**
   * 直接註冊 WeightModule 控制器到主應用程式
   * @param app 主 Hono 應用程式
   * @param dependencies 模組依賴
   */
  static register(app: Hono<any>, dependencies: WeightModuleDependencies): void {
    try {
      // 建立依賴鏈
      const firestoreService = this.createFirestoreService(
        dependencies.firestore
      );
      const repository = this.createWeightRepository(firestoreService);
      const service = this.createWeightService(repository);
      const controller = this.createWeightController(service);

      // 註冊依賴到容器
      this.registerDependency("firestoreService", firestoreService);
      this.registerDependency("weightRepository", repository);
      this.registerDependency("weightService", service);
      this.registerDependency("weightController", controller);

      // 使用 @asla/hono-decorator 套用控制器到主應用程式
      // Controller 中的 basePath: "/weight" 會自動處理路由前綴
      applyController(app, controller);

      console.log("✅ WeightModule 註冊到主應用程式成功");
    } catch (error) {
      console.error("❌ WeightModule 註冊失敗:", error);
      throw error;
    }
  }

  /**
   * 建立並返回 WeightModule 的子應用程式（向後兼容）
   * @param dependencies 模組依賴
   * @returns 包含 Weight 路由的 Hono 子應用程式
   * @deprecated 使用 register() 方法替代，直接註冊到主應用程式
   */
  static createSubApp(dependencies: WeightModuleDependencies): Hono {
    try {
      // 建立獨立的 Hono 子應用程式（無環境綁定）
      const weightApp = new Hono();
      this.register(weightApp, dependencies);
      return weightApp;
    } catch (error) {
      console.error("❌ WeightModule 子應用程式建立失敗:", error);
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
    this.createSubApp({ firestore });
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
      this.dependencies.has("weightRepository") &&
      this.dependencies.has("weightService") &&
      this.dependencies.has("weightController")
    );
  }
}
