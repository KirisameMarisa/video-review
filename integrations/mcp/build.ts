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
        index: path.join(scriptDir, "index.ts"),
    },
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    target: ["node20"],
    sourcemap: false,
    tsconfig: path.join(scriptDir, "tsconfig.json"),
    external: [
        "@modelcontextprotocol/sdk",
        "zod",
        "dotenv",
    ],
    logLevel: "info",
});
