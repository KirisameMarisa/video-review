#pragma once
#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "VideoReviewAPISchema.h"

class SVideoReviewAPITestWindow : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SVideoReviewAPITestWindow) {}
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

    static void OpenWindow();

private:
    // Settings
    FString ServerUrl;
    FString ApiToken;
    int32 TimeoutMs = 300000;

    // Bootstrap / User
    FString BootstrapEmail = TEXT("admin@example.com");
    FString BootstrapPass = TEXT("password123");
    FString CreateUserName = TEXT("User");
    FString CreateUserEmail = TEXT("user@example.com");
    FString CreateUserPass = TEXT("password123");

    // Video Read
    bool bIncludeRevisions = false;
    FString VideoId;

    // Video Mutation
    int32 Revision = 1;

    // Upload
    FString UploadTitle = TEXT("New Video");
    FString UploadFolderKey = TEXT("default");
    FString UploadScenePath;
    FString UploadVideoPath;

    // Metadata
    FString VideoRevId;
    FString EventContextJsonPath;
    FString PatchVcsWatchPaths;

    // Result
    FString LastResult;
    TSharedPtr<SScrollBox> ScrollBox;

    void ApplySettings();
    void SetResult(const FString& Action, bool bSuccess, const FString& StdOut, const FString& StdErr, int32 ExitCode, const FString& Extra = TEXT(""));

    TSharedRef<SWidget> MakeSection(const FString& Title, TSharedRef<SWidget> Content);
    TSharedRef<SWidget> MakeSettingsSection();
    TSharedRef<SWidget> MakeBootstrapSection();
    TSharedRef<SWidget> MakeVideoReadSection();
    TSharedRef<SWidget> MakeVideoMutationSection();
    TSharedRef<SWidget> MakeUploadSection();
    TSharedRef<SWidget> MakeMetaSection();
    TSharedRef<SWidget> MakeResultSection();
};
