import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        reporters: ["default", "junit"],
        outputFile: { junit: "tests/test-results/junit.xml" },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
        },
    },
});
