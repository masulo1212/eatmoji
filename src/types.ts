import type { Context } from "hono";
import type { FirestoreClient } from "firebase-rest-firestore";
import type { IStorageService } from "./services/storageService";
import type { IFirestoreService } from "./shared/services/firestore.service";
import type { Env } from "./bindings";

export type AppContext = Context<{ 
  Bindings: Env,
  Variables: {
    userId?: string;
    firestoreClient?: FirestoreClient;
    storageService?: IStorageService;
    firestoreService?: IFirestoreService;
    workoutController?: any;
  }
}>;
export type HandleArgs = [AppContext];
