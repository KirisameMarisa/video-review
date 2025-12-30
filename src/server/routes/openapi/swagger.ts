import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";

export const swagger = new Hono();

swagger.get(
    "/",
    swaggerUI({
        url: "/api/openapi.json",
    }),
);
