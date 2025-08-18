import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { tasksRouter } from "./endpoints/tasks/router";
import { getEnvContext } from "./utils/utils";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();
const { env } = getEnvContext();
const IS_DEV = env.NODE_ENV !== "production";
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

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Export the Hono app
export default app;
