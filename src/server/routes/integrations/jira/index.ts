import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { createRouter } from "@/server/routes/integrations/jira/create";

export const jiraRouter = new Hono();

jiraRouter.route("/create", createRouter);
