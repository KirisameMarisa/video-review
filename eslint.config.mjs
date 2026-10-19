import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn },
        // Colours, spacing and shapes come from the tokens in src/styles/globals.css and the
        // wrappers in src/components/ui; a finding means a hand-written exception crept back in.
        rules: {
            "shadcn/no-restyle": ["error", {
                allow: ["layout", "typography"],
                // A popover that wraps a Command list has no padding of its own.
                contracts: [
                    { pattern: "^PopoverContent$", allow: ["layout", "p-0"] },
                    // An icon overlaid inside the field needs room on the left.
                    { pattern: "^(Input|SidebarInput)$", allow: ["layout", "typography", "pl-8"] },
                    // The hover card must not exceed the viewport; the utility is declared in globals.css.
                    { pattern: "^HoverCardContent$", allow: ["layout", "max-w-screen-gutter"] },
                    // The side panel's tab list sits flush against its content.
                    { pattern: "^Tabs$", allow: ["layout", "gap-0"] },
                    // The spinner inherits currentColor; the accent is the only colour it takes.
                    { pattern: "^Spinner$", allow: ["layout", "text-primary"] },
                    // The chat sheet's header holds a button row: shorter than stock, with a rule below.
                    { pattern: "^SheetHeader$", allow: ["layout", "border-b", "py-2"] },
                ],
            }],
            "shadcn/no-raw-colors": "error",
            "shadcn/no-arbitrary-values": "error",
            "shadcn/no-inline-styles": "error",
            "shadcn/no-unknown-classes": "error",
            "shadcn/require-static-classes": "error",
        },
    },
    {
        // Guest-admitting routes about one video or comment go through authorizeVideo / authorizeComment; list routes opt out per call.
        files: ["src/server/routes/{comments,read-status,videos}/**/*.ts"],
        rules: {
            "no-restricted-syntax": ["error", {
                selector: "CallExpression[callee.name='authorize'] > ArrayExpression > Literal[value='guest']",
                message: "A guest-admitting route goes through authorizeVideo / authorizeComment; a list route filters by guestVisible and declares it with eslint-disable.",
            }],
        },
    },
    {
        // The wrappers are the one place that may restyle primitives, and the stock shadcn
        // classes use arbitrary values (ring-[3px], p-[3px]) that the theme has no token for.
        files: ["src/components/ui/**/*.tsx"],
        rules: {
            "shadcn/no-restyle": "off",
            "shadcn/no-arbitrary-values": "off",
            "shadcn/require-static-classes": "off",
        },
    },
]);
