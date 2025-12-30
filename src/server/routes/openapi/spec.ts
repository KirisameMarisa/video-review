import { Hono } from "hono";
import { openapiDocument } from "./document";

export const openapiSpec = new Hono();

openapiSpec.get("/openapi.json", (c) => {
    return c.json(openapiDocument);
});
