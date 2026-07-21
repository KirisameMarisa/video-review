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

    TArray<FString> Files;
    IFileManager::Get().FindFiles(Files, *FPaths::Combine(PlatformDir, TEXT("*")), true, false);
    checkf(Files.Num() > 0, TEXT("No CLI binary found under: %s"), *PlatformDir);

    // Prefer video-review-cli.exe > video-review-cli > others
    Files.Sort([](const FString& A, const FString& B)
    {
        auto Priority = [](const FString& Name) -> int32
        {
            if (Name.Equals(TEXT("video-review-cli.exe"), ESearchCase::IgnoreCase)) return 0;
            if (Name.Equals(TEXT("video-review-cli"), ESearchCase::IgnoreCase)) return 1;
            return 10;
        };
        return Priority(FPaths::GetCleanFilename(A)) < Priority(FPaths::GetCleanFilename(B));
    });

    return FPaths::Combine(PlatformDir, Files[0]);
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
