import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { loginRouter } from "@/server/routes/auth/login";
import { verifyRouter } from "@/server/routes/auth/verify";

export const authRouter = new Hono();

authRouter.route("/login", loginRouter);
authRouter.route("/verify", verifyRouter);