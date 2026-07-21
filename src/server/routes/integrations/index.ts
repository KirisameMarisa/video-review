import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { jiraRouter } from "@/server/routes/integrations/jira";


export const integrationsRouter = new Hono();

integrationsRouter.route("/jira", jiraRouter);