import type { Context } from "hono";
import type { FirestoreClient } from "firebase-rest-firestore";
import type { IStorageService } from "./services/storageService";

export type AppContext = Context<{ 
  Bindings: Env,
  Variables: {
    userId?: string;
    firestoreClient?: FirestoreClient;
    storageService?: IStorageService;
  }
}>;
export type HandleArgs = [AppContext];
