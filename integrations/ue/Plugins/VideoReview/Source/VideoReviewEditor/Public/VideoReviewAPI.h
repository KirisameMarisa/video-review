#pragma once
#include "CoreMinimal.h"
#include "VideoReviewAPISchema.h"

class VIDEOREVIEWEDITOR_API FVideoReviewAPI
{
public:
    static FString ServerUrl;
    static FString ApiToken;
    static int32 TimeoutMs;
    static FString CliRootOverride;

    static TVideoReviewResponse<FVideoReviewGenericResult> Bootstrap(const FString& Email, const FString& Password);
    static TVideoReviewResponse<FVideoReviewGenericResult> CreateUser(const FString& Name, const FString& Email, const FString& Password);

    static TVideoReviewResponse<TArray<FVideoReviewVideo>> GetVideos(const FString& FilterTree = TEXT(""), bool bIncludeRevisions = false);
    static TVideoReviewResponse<TArray<FVideoReviewVideoRevision>> GetVideosRev(const FString& VideoId);
    static TVideoReviewResponse<TArray<FVideoReviewComment>> GetComments(const FString& VideoId);

    static TVideoReviewResponse<FVideoReviewVideoRevision> UploadVideo(
        const FString& Title,
        const FString& FolderKey,
        const FString& VideoPath,
        const FString& ScenePath = TEXT(""),
        const TArray<FString>& VcsWatchPaths = TArray<FString>()
    );
    static TVideoReviewResponse<FVideoReviewSimpleMessage> CreateVideoThumbnail(const FString& VideoId);
    static TVideoReviewResponse<FVideoReviewGenericResult> DeleteVideo(const FString& VideoId);
    static TVideoReviewResponse<FVideoReviewGenericResult> PurgeRev(const FString& VideoId, int32 Revision = -1);

    static TVideoReviewResponse<FVideoReviewAnnotateResult> AnnotateVideoRev(const FString& VideoRevId);
    static TVideoReviewResponse<FVideoReviewSimpleMessage> UploadEventContext(const FString& VideoRevId, const FString& JsonPath);
    static TVideoReviewResponse<FVideoReviewSimpleMessage> PatchVideo(const FString& VideoId, const TArray<FString>& VcsWatchPaths = TArray<FString>());

private:
    static TVideoReviewResponse<FVideoReviewGenericResult> ExecuteObject(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<TArray<FVideoReviewVideo>> ExecuteVideoArray(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<TArray<FVideoReviewVideoRevision>> ExecuteRevisionArray(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<TArray<FVideoReviewComment>> ExecuteCommentArray(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<FVideoReviewVideoRevision> ExecuteRevisionObject(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<FVideoReviewAnnotateResult> ExecuteAnnotateObject(const FString& Command, const TArray<FString>& Args);
    static TVideoReviewResponse<FVideoReviewSimpleMessage> ExecuteText(const FString& Command, const TArray<FString>& Args);

    static FVideoReviewCommandResult Execute(const FString& Command, const TArray<FString>& Args);

    static FVideoReviewVideoRevision ParseRevision(const TSharedPtr<FJsonObject>& Obj);
    static FVideoReviewVideo ParseVideo(const TSharedPtr<FJsonObject>& Obj);
    static FVideoReviewComment ParseComment(const TSharedPtr<FJsonObject>& Obj);
};
