import { describe, expect, it } from "vitest";
import {
    matchesWatchPaths,
    scoreRelevance,
} from "@/server/lib/vcs/relevance";

// ---------------------------------------------------------------------------
// matchesWatchPaths
// ---------------------------------------------------------------------------

describe("matchesWatchPaths", () => {
    it("matches a directory prefix (trailing slash)", () => {
        expect(matchesWatchPaths("Assets/Scripts/Camera/Foo.cs", ["Assets/Scripts/Camera/"])).toBe(true);
    });

    it("does not match a sibling directory", () => {
        expect(matchesWatchPaths("Assets/Scripts/Input/Handler.cs", ["Assets/Scripts/Camera/"])).toBe(false);
    });

    it("matches an exact file path (no trailing slash)", () => {
        expect(matchesWatchPaths(
            "Assets/Scenes/CutScene_Opening.unity",
            ["Assets/Scenes/CutScene_Opening.unity"],
        )).toBe(true);
    });

    it("matches a nested file path when no trailing slash (bi-directional partial match)", () => {
        expect(matchesWatchPaths(
            "Assets/Scenes/CutScene_Opening/Sub.prefab",
            ["Assets/Scenes/CutScene_Opening"],
        )).toBe(true);
    });

    it("matches the first matching entry in a list", () => {
        expect(matchesWatchPaths("Assets/Animations/Walk.anim", [
            "Assets/Scripts/Camera/",
            "Assets/Animations/",
            "Assets/Audio/",
        ])).toBe(true);
    });

    it("returns false for an empty watchPaths list", () => {
        expect(matchesWatchPaths("Assets/Anything.cs", [])).toBe(false);
    });

    it("is case-sensitive", () => {
        expect(matchesWatchPaths("assets/scripts/camera/Foo.cs", ["Assets/Scripts/Camera/"])).toBe(false);
    });

    it("matches when file path has additional repo-root prefixes", () => {
        expect(matchesWatchPaths(
            "client/hokusai/Assets/remote/skit/scene/skit_stage_org_013_120_0020.unity",
            ["Assets/remote/skit/scene/skit_stage_org_013_120_0020.unity"],
        )).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// scoreRelevance
// ---------------------------------------------------------------------------

describe("scoreRelevance", () => {
    it("returns high with 'no filter configured' when vcsWatchPaths is empty", () => {
        const result = scoreRelevance(["Assets/Scripts/Camera/Foo.cs"], []);
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toBe("no filter configured");
    });

    it("returns high with empty files when vcsWatchPaths is empty", () => {
        const result = scoreRelevance([], []);
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toBe("no filter configured");
    });

    it("returns high when a file matches vcsWatchPaths", () => {
        const result = scoreRelevance(
            ["Assets/Scripts/Camera/CinemachineHelper.cs", "Assets/Audio/BGM/Opening.wav"],
            ["Assets/Scripts/Camera/"],
        );
        expect(result.relevance).toBe("high");
        expect(result.relevanceReason).toContain("vcsWatchPaths match");
        expect(result.relevanceReason).toContain("Assets/Scripts/Camera/CinemachineHelper.cs");
    });

    it("returns unlikely when no file matches vcsWatchPaths", () => {
        const result = scoreRelevance(
            ["Packages/Backend/Api.cs", "Packages/Backend/Auth.cs"],
            ["Assets/Scripts/Camera/"],
        );
        expect(result.relevance).toBe("unlikely");
        expect(result.relevanceReason).toBe("no vcsWatchPaths match");
    });

    it("returns unlikely when files list is empty and vcsWatchPaths is set", () => {
        const result = scoreRelevance([], ["Assets/Scripts/Camera/"]);
        expect(result.relevance).toBe("unlikely");
        expect(result.relevanceReason).toBe("no vcsWatchPaths match");
    });

    it("returns high when at least one file in a large list matches", () => {
        const files = Array.from({ length: 100 }, (_, i) => `Packages/Lib${i}/File.cs`);
        files.push("Assets/Scripts/Camera/Foo.cs");
        const result = scoreRelevance(files, ["Assets/Scripts/Camera/"]);
        expect(result.relevance).toBe("high");
    });
});
