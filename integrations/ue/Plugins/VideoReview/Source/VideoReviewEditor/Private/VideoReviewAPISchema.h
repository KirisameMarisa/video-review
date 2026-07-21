#pragma once
#include "CoreMinimal.h"

struct FVideoReviewCommandResult
{
    bool bSuccess = false;
    bool bTimedOut = false;
    int32 ExitCode = -1;
    FString Command;
    FString StdOut;
    FString StdErr;
};

template<typename T>
struct TVideoReviewResponse
{
    bool bSuccess = false;
    T Data;
    FString ParseError;
    FVideoReviewCommandResult CommandResult;
};

struct FVideoReviewSimpleMessage
{
    FString Text;
};

struct FVideoReviewGenericResult
{
    bool bSuccess = false;
    bool bOk = false;
    FString Error;
    FString Warning;
    FString Token;
    FString VideoId;
    int32 Revision = 0;
};

struct FVideoReviewVideoRevision
{
    FString Id;
    FString VideoId;
    int32 Revision = 0;
    FString FilePath;
    FString UploadedAt;
    bool bDeleted = false;
    TArray<FString> Tags;
    FString Summary;
};

struct FVideoReviewVideo
{
    FString Id;
    FString Title;
    FString FolderKey;
    FString ScenePath;
    int32 LatestRevisionNum = 0;
    bool bDeleted = false;
    TArray<FVideoReviewVideoRevision> Revisions;
};

struct FVideoReviewComment
{
    FString Id;
    FString VideoId;
    int32 VideoRevNum = 0;
    FString UserName;
    FString UserEmail;
    FString Comment;
    float Time = 0.f;
    FString IssueId;
    FString DrawingPath;
    FString CreatedAt;
    FString UpdatedAt;
    bool bDeleted = false;
    int32 ThumbsUp = 0;
};

struct FVideoReviewAnnotateResult
{
    int32 SuccessCount = 0;
    int32 FailureCount = 0;
};
