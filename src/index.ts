import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { tasksRouter } from "./endpoints/tasks/router";
import { diariesRouter } from "./endpoints/diaries/router";
import { chatsRouter } from "./endpoints/chats/router";
import { dailyWorkoutsRouter } from "./endpoints/daily-workouts/router";
import { favFoodsRouter } from "./endpoints/favFoods/router";
import { recipesRouter } from "./endpoints/recipes/router";
import { weightRouter } from "./endpoints/weight/router";
import { usersRouter } from "./endpoints/users/router";
import { fcmTokensRouter } from "./endpoints/fcm-tokens/router";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();
const IS_DEV = process.env.NODE_ENV !== "production";
console.log(IS_DEV);
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

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: IS_DEV ? "/" : undefined,
  schema: {
    info: {
      title: "Eatmoji API",
      version: "2.0.0",
      description: "Eatmoji API Documentation",
    },
  },
});

// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register Diaries Sub router
openapi.route("/diaries", diariesRouter);

// Register Chats Sub router
openapi.route("/chats", chatsRouter);

// Register Daily Workouts Sub router
openapi.route("/daily-workouts", dailyWorkoutsRouter);

// Register FavFoods Sub router
openapi.route("/fav-foods", favFoodsRouter);

// Register Recipes Sub router
openapi.route("/recipes", recipesRouter);

// Register Weight Sub router
openapi.route("/weight", weightRouter);

// Register Users Sub router
openapi.route("/users", usersRouter);

// Register FCM Tokens Sub router
openapi.route("/fcm-tokens", fcmTokensRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Export the Hono app
export default app;
