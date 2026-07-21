using UnrealBuildTool;

public class VideoReviewEditor : ModuleRules
{
    public VideoReviewEditor(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new[]
            {
                "Core"
            });

        PrivateDependencyModuleNames.AddRange(
            new[]
            {
                "CoreUObject",
                "Engine",
                "Json",
                "LevelEditor",
                "Networking",
                "Projects",
                "Sockets",
                "Slate",
                "SlateCore",
                "UnrealEd"
            });
    }
}
