import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(scriptDir, "dist");

if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true, force: true });
}

await build({
    entryPoints: {
        "main-local": path.join(scriptDir, "main-local.ts"),
        "main-lambda": path.join(scriptDir, "main-lambda.ts"),
    },
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    target: ["node20"],
    sourcemap: false,
    tsconfig: path.join(scriptDir, "tsconfig.json"),
    external: [
        "@prisma/client",
        "@aws-sdk/client-s3",
        "@aws-sdk/s3-request-presigner",
        "mime-types",
        "uuid",
    ],
    logLevel: "info",
});
