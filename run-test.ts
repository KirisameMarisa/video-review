import { execSync } from "node:child_process";

function run(cmd: string): void {
    execSync(cmd, {
        stdio: "inherit",
        env: process.env,
    });
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing. Load .env.test before running tests.");
    }

    const target = process.argv[2];
    const testTarget = target ? ` ${target}` : "";

    console.log(`Running tests for target: ${testTarget}`);

    run("npx prisma migrate reset --force --skip-seed --skip-generate");
    run("npx prisma generate --generator client");
    run("npm run prisma:seed");
    run(`npx vitest run ${testTarget}`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
