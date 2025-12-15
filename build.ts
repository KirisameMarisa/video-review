import { execSync } from "node:child_process";
import { mkdirSync, cpSync } from "fs";
import path from "path";
import fs from "fs";

const content = fs.readFileSync("package.json") as any;
const productName = JSON.parse(content).name
let outBase = process.env.VIDEO_REVIEW_BUILD_OUTPUT_DIR;
if (!outBase) {
    console.log("Since VIDEO_REVIEW_BUILD_OUTPUT_DIR is not set, output will be directed to ProjectRoot.");
    outBase = "./";
}

// Use the name in package.json
const outDir = path.join(outBase, productName);

// create output directories.
mkdirSync(outDir, { recursive: true });

// Next.js build
execSync("npm install", { stdio: "inherit" });
execSync("next build", { stdio: "inherit" });

// copy
cpSync("package.json",  path.join(outDir, "package.json"));
cpSync(".env",          path.join(outDir, ".env"));
cpSync("maintenance",   path.join(outDir, "maintenance"), { recursive: true });
cpSync(".next",         path.join(outDir, ".next"), { recursive: true });
cpSync("node_modules",  path.join(outDir, "node_modules"), { recursive: true });

console.log(`\nsuccess build: ${outDir}\n`);
