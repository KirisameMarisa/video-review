#pragma once
#include "CoreMinimal.h"
#include "VideoReviewAPISchema.h"

class FVideoReviewAPIExecute
{
public:
    static FVideoReviewCommandResult Run(
        const FString& Command,
        const TArray<FString>& Args,
        const FString& ServerUrl,
        const FString& ApiToken,
        int32 TimeoutMs,
        const FString& CliRootOverride = TEXT("")
    );

private:
    static FString ResolveExecutablePath(const FString& CliRootOverride);
    static FString GetPlatformDirectoryName();
    static void EnsureExecutablePermission(const FString& ExecutablePath);
    static FString BuildArguments(const FString& Command, const TArray<FString>& Args, const FString& ServerUrl, const FString& ApiToken);
    static FString QuoteArg(const FString& Arg);
};
