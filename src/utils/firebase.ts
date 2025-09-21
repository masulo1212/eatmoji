import {
  FirestoreClient,
  createFirestoreClient,
  type FirestoreConfig,
} from "firebase-rest-firestore";
import { AppContext } from "../types";
import { 
  FirebaseStorageService, 
  FirebaseStorageConfig, 
  IStorageService 
} from "../services/storageService";

/**
 * Initialize Firestore client with proper configuration
 * @param env Environment variables containing Firebase credentials
 * @returns FirestoreClient instance
 */
export function initializeFirestore(env: any): FirestoreClient {
  if (
    !env.FIREBASE_PROJECT_ID ||
    !env.FIREBASE_CLIENT_EMAIL ||
    !env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "Missing Firebase configuration. Please check environment variables."
    );
  }

  const config: FirestoreConfig = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix escaped newlines
  };

  return createFirestoreClient(config);
}

/**
 * Initialize Firebase Storage service with proper configuration
 * @param env Environment variables containing Firebase credentials
 * @returns FirebaseStorageService instance
 */
export function initializeStorage(env: any): IStorageService {
  if (
    !env.FIREBASE_PROJECT_ID ||
    !env.FIREBASE_CLIENT_EMAIL ||
    !env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "Missing Firebase configuration for Storage. Please check environment variables."
    );
  }

  const config: FirebaseStorageConfig = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix escaped newlines
    bucketName: env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.appspot.com`,
  };

  return new FirebaseStorageService(config);
}

/**
 * Get Firestore client from Hono context with caching
 * @param c Hono context containing environment variables
 * @returns FirestoreClient instance (cached if available)
 */
export function getFirestoreFromContext(c: AppContext): FirestoreClient {
  // 檢查是否已經快取了 Firestore client
  const cached = c.get('firestoreClient') as FirestoreClient | undefined;
  if (cached) {
    return cached;
  }

  // 建立新的 Firestore client 並快取
  const firestore = initializeFirestore(c.env);
  c.set('firestoreClient', firestore);
  return firestore;
}

/**
 * Get Firebase Storage service from Hono context with caching
 * @param c Hono context containing environment variables
 * @returns IStorageService instance (cached if available)
 */
export function getStorageFromContext(c: AppContext): IStorageService {
  // 檢查是否已經快取了 Storage service
  const cached = c.get('storageService') as IStorageService | undefined;
  if (cached) {
    return cached;
  }

  // 建立新的 Storage service 並快取
  const storage = initializeStorage(c.env);
  c.set('storageService', storage);
  return storage;
}
