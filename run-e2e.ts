import { execSync } from "node:child_process";

function run(cmd: string): void {
    execSync(cmd, {
        stdio: "inherit",
        env: process.env,
    });
}

// Orchestrates the end-to-end smoke run: reset + seed the test DB, build the
// app, then hand off to Playwright (which starts `next start` via its webServer
// config and drives a real browser through login → review page).
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing. Load .env.test before running e2e.");
    }

    const target = process.argv[2];
    const testTarget = target ? ` ${target}` : "";

    console.log("[e2e] resetting and seeding test database...");
    run("npx prisma migrate reset --force --skip-seed --skip-generate");
    run("npx prisma generate --generator client");
    run("npm run prisma:seed");

    console.log("[e2e] building app (next build)...");
    run("npx next build");

    console.log("[e2e] running Playwright smoke tests...");
    run(`npx playwright test${testTarget}`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
