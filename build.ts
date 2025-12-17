import { execSync, exec } from "node:child_process";
import { mkdirSync, cpSync, rmSync } from "fs";
import path from "path";
import fs from "fs";
import { getApiDocs } from "@/lib/swagger";

const content = fs.readFileSync("package.json") as any;
const productName = JSON.parse(content).name
let outBase = process.env.VIDEO_REVIEW_BUILD_OUTPUT_DIR;
if (!outBase) {
    console.log("Since VIDEO_REVIEW_BUILD_OUTPUT_DIR is not set, output will be directed to ProjectRoot.");
    outBase = "./";
}

const main = async () => {
    // Use the name in package.json
    const outDir = path.join(outBase, productName);

    // create output directories.
    mkdirSync("public", { recursive: true });
    mkdirSync(outDir, { recursive: true });
    if(outBase === "./") {
        rmSync(path.join(outDir, "node_modules"), { recursive:true, force: true });
    }

    // create swagger file and build 
    execSync("npm install", { stdio: "inherit" });
    fs.writeFileSync("./public/swagger.json", JSON.stringify(await getApiDocs(), null, 2));
    execSync("next build", { stdio: "inherit" });

    // copy
    cpSync("package.json", path.join(outDir, "package.json"));
    cpSync(".env", path.join(outDir, ".env"));
    cpSync("maintenance", path.join(outDir, "maintenance"), { recursive: true });
    cpSync(".next", path.join(outDir, ".next"), { recursive: true });
    cpSync("node_modules", path.join(outDir, "node_modules"), { recursive: true });
    cpSync("public", path.join(outDir, "public"), { recursive: true });

    console.log(`\nsuccess build: ${outDir}\n`);
};

main();
