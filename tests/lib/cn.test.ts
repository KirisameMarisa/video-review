import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
    it("keeps every text role from globals.css next to a text colour", () => {
        const css = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/styles/globals.css"), "utf8");
        const roles = [...css.matchAll(/@utility (text-[\w-]+)/g)].map((m) => m[1]);

        expect(roles.length).toBeGreaterThan(0);
        for (const role of roles) {
            expect(cn(role, "text-primary")).toBe(`${role} text-primary`);
        }
    });
});
