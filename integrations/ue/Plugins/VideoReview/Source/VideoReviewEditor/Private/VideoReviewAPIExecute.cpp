#include "VideoReviewAPIExecute.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformProcess.h"
#include "Interfaces/IPluginManager.h"
#include "Misc/DateTime.h"
#include "Misc/Paths.h"

FVideoReviewCommandResult FVideoReviewAPIExecute::Run(
    const FString& Command,
    const TArray<FString>& Args,
    const FString& ServerUrl,
    const FString& ApiToken,
    int32 TimeoutMs,
    const FString& CliRootOverride)
{
    FVideoReviewCommandResult Result;

    FString ExecutablePath;
    try
    {
        ExecutablePath = ResolveExecutablePath(CliRootOverride);
    }
    catch (...)
    {
        Result.StdErr = TEXT("Failed to resolve CLI executable path.");
        return Result;
    }

    if (ExecutablePath.IsEmpty())
    {
        Result.StdErr = FString::Printf(TEXT("No CLI binary in bin/%s. Put %s there."), *GetPlatformDirectoryName(), *GetReleaseBinaryName());
        return Result;
    }

    EnsureExecutablePermission(ExecutablePath);

    FString Arguments = BuildArguments(Command, Args, ServerUrl, ApiToken);
    Result.Command = Arguments;

    void* ReadPipe = nullptr;
    void* WritePipe = nullptr;
    FPlatformProcess::CreatePipe(ReadPipe, WritePipe);

    FProcHandle ProcHandle = FPlatformProcess::CreateProc(
        *ExecutablePath,
        *Arguments,
        false,
        true,
        true,
        nullptr,
        0,
        *FPaths::GetPath(ExecutablePath),
        WritePipe
    );

    if (!ProcHandle.IsValid())
    {
        FPlatformProcess::ClosePipe(ReadPipe, WritePipe);
        Result.StdErr = FString::Printf(TEXT("Failed to start process: %s"), *ExecutablePath);
        return Result;
    }

    FString StdOut;
    FDateTime StartTime = FDateTime::Now();
    bool bTimedOut = false;

    while (FPlatformProcess::IsProcRunning(ProcHandle))
    {
        StdOut += FPlatformProcess::ReadPipe(ReadPipe);

        FTimespan Elapsed = FDateTime::Now() - StartTime;
        if (TimeoutMs > 0 && Elapsed.GetTotalMilliseconds() > static_cast<double>(TimeoutMs))
        {
            FPlatformProcess::TerminateProc(ProcHandle, true);
            bTimedOut = true;
            break;
        }

        FPlatformProcess::Sleep(0.01f);
    }

    StdOut += FPlatformProcess::ReadPipe(ReadPipe);
    FPlatformProcess::ClosePipe(ReadPipe, WritePipe);

    int32 ReturnCode = -1;
    if (!bTimedOut)
    {
        FPlatformProcess::GetProcReturnCode(ProcHandle, &ReturnCode);
    }
    FPlatformProcess::CloseProc(ProcHandle);

    Result.bTimedOut = bTimedOut;
    Result.ExitCode = ReturnCode;
    Result.bSuccess = !bTimedOut && ReturnCode == 0;
    Result.StdOut = StdOut.TrimEnd();

    return Result;
}

FString FVideoReviewAPIExecute::ResolveExecutablePath(const FString& CliRootOverride)
{
    FString Root;
    if (!CliRootOverride.IsEmpty())
    {
        Root = CliRootOverride;
    }
    else
    {
        TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("VideoReview"));
        checkf(Plugin.IsValid(), TEXT("VideoReview plugin not found"));
        Root = FPaths::Combine(Plugin->GetBaseDir(), TEXT("Source/VideoReviewEditor"));
    }

    FString PlatformDir = FPaths::Combine(Root, TEXT("bin"), GetPlatformDirectoryName());
    checkf(IFileManager::Get().DirectoryExists(*PlatformDir),
        TEXT("VideoReview CLI directory not found: %s"), *PlatformDir);

    // The binary as the release names it comes first, so a downloaded one works without renaming.
    const FString ReleaseName = GetReleaseBinaryName();
    auto Priority = [&ReleaseName](const FString& Name) -> int32
    {
        if (Name.Equals(ReleaseName, ESearchCase::IgnoreCase))
        {
            return 0;
        }
        if (Name.Equals(TEXT("video-review-cli.exe"), ESearchCase::IgnoreCase))
        {
            return 1;
        }
        if (Name.Equals(TEXT("video-review-cli"), ESearchCase::IgnoreCase))
        {
            return 2;
        }
        return INDEX_NONE;
    };

    TArray<FString> Files;
    IFileManager::Get().FindFiles(Files, *FPaths::Combine(PlatformDir, TEXT("*")), true, false);
    Files.RemoveAll([&](const FString& Name)
    {
        return Priority(Name) == INDEX_NONE || IFileManager::Get().FileSize(*FPaths::Combine(PlatformDir, Name)) <= 0;
    });
    if (Files.Num() == 0)
    {
        return FString();
    }

    Files.Sort([&Priority](const FString& A, const FString& B)
    {
        return Priority(A) < Priority(B);
    });

    return FPaths::Combine(PlatformDir, Files[0]);
}

// Such as video-review-cli-windows-amd64.exe, as the release workflow builds it.
FString FVideoReviewAPIExecute::GetReleaseBinaryName()
{
#if PLATFORM_CPU_ARM_FAMILY
    const TCHAR* Arch = TEXT("arm64");
#else
    const TCHAR* Arch = TEXT("amd64");
#endif

#if PLATFORM_WINDOWS
    return FString::Printf(TEXT("video-review-cli-windows-%s.exe"), Arch);
#elif PLATFORM_MAC
    return FString::Printf(TEXT("video-review-cli-darwin-%s"), Arch);
#else
    return FString::Printf(TEXT("video-review-cli-linux-%s"), Arch);
#endif
}

FString FVideoReviewAPIExecute::GetPlatformDirectoryName()
{
#if PLATFORM_WINDOWS
    return TEXT("Windows");
#elif PLATFORM_MAC
    return TEXT("Mac");
#else
    return TEXT("Linux");
#endif
}

void FVideoReviewAPIExecute::EnsureExecutablePermission(const FString& ExecutablePath)
{
#if !PLATFORM_WINDOWS
    FString Params = FString::Printf(TEXT("+x %s"), *QuoteArg(ExecutablePath));
    int32 ReturnCode = 0;
    FString StdOut, StdErr;
    FPlatformProcess::ExecProcess(TEXT("/bin/chmod"), *Params, &ReturnCode, &StdOut, &StdErr);
#endif
}

FString FVideoReviewAPIExecute::BuildArguments(
    const FString& Command,
    const TArray<FString>& Args,
    const FString& ServerUrl,
    const FString& ApiToken)
{
    FString Result;

    if (!ServerUrl.IsEmpty())
    {
        Result += FString::Printf(TEXT("--server %s "), *QuoteArg(ServerUrl));
    }
    if (!ApiToken.IsEmpty())
    {
        Result += FString::Printf(TEXT("--token %s "), *QuoteArg(ApiToken));
    }

    Result += QuoteArg(Command);

    for (const FString& Arg : Args)
    {
        Result += TEXT(" ") + QuoteArg(Arg);
    }

    return Result;
}

FString FVideoReviewAPIExecute::QuoteArg(const FString& Arg)
{
    if (Arg.IsEmpty())
    {
        return TEXT("\"\"");
    }
    FString Escaped = Arg.Replace(TEXT("\\"), TEXT("\\\\")).Replace(TEXT("\""), TEXT("\\\""));
    return FString::Printf(TEXT("\"%s\""), *Escaped);
}
