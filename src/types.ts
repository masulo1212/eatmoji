import type { Context } from "hono";

export type AppContext = Context<{ 
  Bindings: Env,
  Variables: {
    userId?: string
  }
}>;
export type HandleArgs = [AppContext];
