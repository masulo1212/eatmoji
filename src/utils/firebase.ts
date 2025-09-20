import {
  FirestoreClient,
  createFirestoreClient,
  type FirestoreConfig,
} from "firebase-rest-firestore";
import { AppContext } from "../types";

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
 * Get Firestore client from Hono context
 * @param c Hono context containing environment variables
 * @returns FirestoreClient instance
 */
export function getFirestoreFromContext(c: AppContext): FirestoreClient {
  return initializeFirestore(c.env);
}
