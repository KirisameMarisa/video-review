#include "VideoReviewAPITestWindow.h"
#include "VideoReviewAPI.h"

#include "Framework/Docking/TabManager.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Docking/SDockTab.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SCheckBox.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SMultiLineEditableTextBox.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"

#define LOCTEXT_NAMESPACE "VideoReviewAPITest"

extern const FName GVideoReviewAPITestTabName(TEXT("VideoReviewAPITest"));

// ─────────────────────────────────────────────────────────────
// Static helper: labeled row (left-aligned label + right fill)
// ─────────────────────────────────────────────────────────────

static TSharedRef<SWidget> LabeledRow(const FString& Label, TSharedRef<SWidget> ValueWidget)
{
    return SNew(SHorizontalBox)
        + SHorizontalBox::Slot()
          .AutoWidth()
          .VAlign(VAlign_Center)
          .Padding(FMargin(0.f, 0.f, 8.f, 0.f))
        [
            SNew(SBox)
            .MinDesiredWidth(180.f)
            [
                SNew(STextBlock)
                .Text(FText::FromString(Label))
            ]
        ]
        + SHorizontalBox::Slot()
          .FillWidth(1.f)
          .VAlign(VAlign_Center)
        [
            ValueWidget
        ];
}

// ─────────────────────────────────────────────────────────────
// OpenWindow
// ─────────────────────────────────────────────────────────────

void SVideoReviewAPITestWindow::OpenWindow()
{
    FGlobalTabmanager::Get()->TryInvokeTab(GVideoReviewAPITestTabName);
}

// ─────────────────────────────────────────────────────────────
// Construct
// ─────────────────────────────────────────────────────────────

void SVideoReviewAPITestWindow::Construct(const FArguments& InArgs)
{
    ServerUrl = FVideoReviewAPI::ServerUrl;
    ApiToken  = FVideoReviewAPI::ApiToken;
    TimeoutMs = FVideoReviewAPI::TimeoutMs;

    ChildSlot
    [
        SNew(SScrollBox)
        + SScrollBox::Slot()
          .Padding(FMargin(8.f, 4.f))
        [
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeSettingsSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeBootstrapSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeVideoReadSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeVideoMutationSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeUploadSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeMetaSection() ]
            + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f) [ MakeResultSection() ]
        ]
    ];
}

// ─────────────────────────────────────────────────────────────
// ApplySettings / SetResult
// ─────────────────────────────────────────────────────────────

void SVideoReviewAPITestWindow::ApplySettings()
{
    FVideoReviewAPI::ServerUrl = ServerUrl.TrimStartAndEnd();
    FVideoReviewAPI::ApiToken  = ApiToken.TrimStartAndEnd();
    FVideoReviewAPI::TimeoutMs = FMath::Max(1000, TimeoutMs);
}

void SVideoReviewAPITestWindow::SetResult(
    const FString& Action,
    bool bSuccess,
    const FString& StdOut,
    const FString& StdErr,
    int32 ExitCode,
    const FString& Extra)
{
    const FString Out = StdOut.TrimStartAndEnd();
    const FString Err = StdErr.TrimStartAndEnd();

    LastResult = FString::Printf(TEXT("[VideoReviewAPI Test] %s\nsuccess=%s, exitCode=%d"),
        *Action,
        bSuccess ? TEXT("true") : TEXT("false"),
        ExitCode);

    if (!Extra.IsEmpty())
    {
        LastResult += TEXT(", ") + Extra;
    }

    LastResult += TEXT("\nstdout:\n") + (Out.IsEmpty() ? TEXT("(empty)") : Out);
    LastResult += TEXT("\nstderr:\n") + (Err.IsEmpty() ? TEXT("(empty)") : Err);

    UE_LOG(LogTemp, Log, TEXT("%s"), *LastResult);
}

// ─────────────────────────────────────────────────────────────
// MakeSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeSection(const FString& Title, TSharedRef<SWidget> Content)
{
    return SNew(SVerticalBox)
        + SVerticalBox::Slot()
          .AutoHeight()
          .Padding(FMargin(0.f, 0.f, 0.f, 4.f))
        [
            SNew(STextBlock)
            .Text(FText::FromString(Title))
            .Font(FCoreStyle::GetDefaultFontStyle(TEXT("Bold"), 11))
        ]
        + SVerticalBox::Slot()
          .AutoHeight()
          .Padding(FMargin(8.f, 0.f))
        [
            Content
        ];
}

// ─────────────────────────────────────────────────────────────
// MakeSettingsSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeSettingsSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Server URL"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(ServerUrl); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { ServerUrl = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("API Token"),
                SNew(SEditableTextBox)
                .IsPassword(true)
                .Text_Lambda([this]() { return FText::FromString(ApiToken); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { ApiToken = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Timeout (ms)"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(FString::FromInt(TimeoutMs)); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type)
                {
                    const int32 Val = FCString::Atoi(*T.ToString());
                    if (Val >= 1000) TimeoutMs = Val;
                })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("ApplySettings", "Apply to VideoReviewAPI"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                SetResult(TEXT("ApplySettings"), true,
                    TEXT("Applied global settings to FVideoReviewAPI static properties."), TEXT(""), 0);
                return FReply::Handled();
            })
        ];

    return MakeSection(TEXT("Global Settings"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeBootstrapSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeBootstrapSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Bootstrap Email"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(BootstrapEmail); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { BootstrapEmail = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Bootstrap Pass"),
                SNew(SEditableTextBox)
                .IsPassword(true)
                .Text_Lambda([this]() { return FText::FromString(BootstrapPass); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { BootstrapPass = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("Bootstrap", "Bootstrap"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                auto Resp = FVideoReviewAPI::Bootstrap(BootstrapEmail, BootstrapPass);
                SetResult(TEXT("Bootstrap"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                return FReply::Handled();
            })
        ]
        // ── CreateUser ──────────────────────────────────────
        + SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f, 0.f, 2.f))
        [
            LabeledRow(TEXT("User Name"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(CreateUserName); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { CreateUserName = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("User Email"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(CreateUserEmail); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { CreateUserEmail = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("User Pass"),
                SNew(SEditableTextBox)
                .IsPassword(true)
                .Text_Lambda([this]() { return FText::FromString(CreateUserPass); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { CreateUserPass = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("CreateUser", "CreateUser"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                auto Resp = FVideoReviewAPI::CreateUser(CreateUserName, CreateUserEmail, CreateUserPass);
                SetResult(TEXT("CreateUser"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                return FReply::Handled();
            })
        ];

    return MakeSection(TEXT("Bootstrap / User"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeVideoReadSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeVideoReadSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center)
            [
                SNew(SCheckBox)
                .IsChecked_Lambda([this]()
                {
                    return bIncludeRevisions ? ECheckBoxState::Checked : ECheckBoxState::Unchecked;
                })
                .OnCheckStateChanged_Lambda([this](ECheckBoxState State)
                {
                    bIncludeRevisions = (State == ECheckBoxState::Checked);
                })
            ]
            + SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center).Padding(4.f, 0.f)
            [
                SNew(STextBlock)
                .Text(LOCTEXT("IncludeRevisions", "Include Revisions"))
            ]
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Video ID"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(VideoId); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { VideoId = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth().Padding(0.f, 0.f, 4.f, 0.f)
            [
                SNew(SButton)
                .Text(LOCTEXT("GetVideos", "GetVideos"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::GetVideos(TEXT(""), bIncludeRevisions);
                    SetResult(TEXT("GetVideos"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode,
                        FString::Printf(TEXT("count=%d"), Resp.Data.Num()));
                    return FReply::Handled();
                })
            ]
            + SHorizontalBox::Slot().AutoWidth().Padding(0.f, 0.f, 4.f, 0.f)
            [
                SNew(SButton)
                .Text(LOCTEXT("GetVideosRev", "GetVideosRev"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::GetVideosRev(VideoId);
                    SetResult(TEXT("GetVideosRev"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode,
                        FString::Printf(TEXT("count=%d"), Resp.Data.Num()));
                    return FReply::Handled();
                })
            ]
            + SHorizontalBox::Slot().AutoWidth()
            [
                SNew(SButton)
                .Text(LOCTEXT("GetComments", "GetComments"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::GetComments(VideoId);
                    SetResult(TEXT("GetComments"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode,
                        FString::Printf(TEXT("count=%d"), Resp.Data.Num()));
                    return FReply::Handled();
                })
            ]
        ];

    return MakeSection(TEXT("Video Read APIs"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeVideoMutationSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeVideoMutationSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Video ID"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(VideoId); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { VideoId = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Revision"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(FString::FromInt(Revision)); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type)
                {
                    const int32 Val = FCString::Atoi(*T.ToString());
                    if (Val >= 0) Revision = Val;
                })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth().Padding(0.f, 0.f, 4.f, 0.f)
            [
                SNew(SButton)
                .Text(LOCTEXT("DeleteVideo", "DeleteVideo"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::DeleteVideo(VideoId);
                    SetResult(TEXT("DeleteVideo"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                    return FReply::Handled();
                })
            ]
            + SHorizontalBox::Slot().AutoWidth().Padding(0.f, 0.f, 4.f, 0.f)
            [
                SNew(SButton)
                .Text(LOCTEXT("PurgeRev", "PurgeRev"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::PurgeRev(VideoId, Revision);
                    SetResult(TEXT("PurgeRev"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                    return FReply::Handled();
                })
            ]
            + SHorizontalBox::Slot().AutoWidth()
            [
                SNew(SButton)
                .Text(LOCTEXT("CreateVideoThumbnail", "CreateVideoThumbnail"))
                .OnClicked_Lambda([this]() -> FReply
                {
                    ApplySettings();
                    auto Resp = FVideoReviewAPI::CreateVideoThumbnail(VideoId);
                    SetResult(TEXT("CreateVideoThumbnail"), Resp.bSuccess,
                        Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                    return FReply::Handled();
                })
            ]
        ];

    return MakeSection(TEXT("Video Mutation APIs"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeUploadSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeUploadSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Title"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(UploadTitle); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { UploadTitle = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Folder Key"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(UploadFolderKey); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { UploadFolderKey = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Scene Path"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(UploadScenePath); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { UploadScenePath = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Video Path"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(UploadVideoPath); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { UploadVideoPath = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("UploadVideo", "UploadVideo"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                auto Resp = FVideoReviewAPI::UploadVideo(UploadTitle, UploadFolderKey, UploadVideoPath, UploadScenePath);
                FString Extra;
                if (Resp.bSuccess && !Resp.Data.Id.IsEmpty())
                {
                    Extra = FString::Printf(TEXT("revisionId=%s"), *Resp.Data.Id);
                    VideoRevId = Resp.Data.Id;
                    VideoId    = Resp.Data.VideoId;
                }
                SetResult(TEXT("UploadVideo"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode, Extra);
                return FReply::Handled();
            })
        ];

    return MakeSection(TEXT("Upload APIs"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeMetaSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeMetaSection()
{
    TSharedRef<SVerticalBox> Content = SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 2.f)
        [
            LabeledRow(TEXT("Video Rev ID"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(VideoRevId); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { VideoRevId = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("AnnotateVideoRev", "AnnotateVideoRev"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                auto Resp = FVideoReviewAPI::AnnotateVideoRev(VideoRevId);
                const FString Extra = FString::Printf(TEXT("success=%d, failure=%d"),
                    Resp.Data.SuccessCount, Resp.Data.FailureCount);
                SetResult(TEXT("AnnotateVideoRev"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode, Extra);
                return FReply::Handled();
            })
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f, 0.f, 2.f))
        [
            LabeledRow(TEXT("Event Context JSON"),
                SNew(SEditableTextBox)
                .Text_Lambda([this]() { return FText::FromString(EventContextJsonPath); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { EventContextJsonPath = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("UploadEventContext", "UploadEventContext"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                auto Resp = FVideoReviewAPI::UploadEventContext(VideoRevId, EventContextJsonPath);
                SetResult(TEXT("UploadEventContext"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                return FReply::Handled();
            })
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(FMargin(0.f, 8.f, 0.f, 2.f))
        [
            LabeledRow(TEXT("Patch VCS Watch Paths"),
                SNew(SEditableTextBox)
                .HintText(LOCTEXT("VcsHint", "comma-separated paths"))
                .Text_Lambda([this]() { return FText::FromString(PatchVcsWatchPaths); })
                .OnTextCommitted_Lambda([this](const FText& T, ETextCommit::Type) { PatchVcsWatchPaths = T.ToString(); })
            )
        ]
        + SVerticalBox::Slot().AutoHeight().Padding(0.f, 4.f)
        [
            SNew(SButton)
            .Text(LOCTEXT("PatchVideo", "PatchVideo  (uses Video ID above)"))
            .OnClicked_Lambda([this]() -> FReply
            {
                ApplySettings();
                TArray<FString> Paths;
                if (!PatchVcsWatchPaths.TrimStartAndEnd().IsEmpty())
                {
                    PatchVcsWatchPaths.ParseIntoArray(Paths, TEXT(","), true);
                    for (FString& P : Paths) { P = P.TrimStartAndEnd(); }
                }
                auto Resp = FVideoReviewAPI::PatchVideo(VideoId, Paths);
                SetResult(TEXT("PatchVideo"), Resp.bSuccess,
                    Resp.CommandResult.StdOut, Resp.CommandResult.StdErr, Resp.CommandResult.ExitCode);
                return FReply::Handled();
            })
        ];

    return MakeSection(TEXT("Metadata APIs"), Content);
}

// ─────────────────────────────────────────────────────────────
// MakeResultSection
// ─────────────────────────────────────────────────────────────

TSharedRef<SWidget> SVideoReviewAPITestWindow::MakeResultSection()
{
    TSharedRef<SBox> Content = SNew(SBox)
        .MinDesiredHeight(140.f)
        [
            SNew(SMultiLineEditableTextBox)
            .IsReadOnly(true)
            .AutoWrapText(true)
            .Text_Lambda([this]()
            {
                return FText::FromString(LastResult.IsEmpty() ? TEXT("No execution yet.") : LastResult);
            })
        ];

    return MakeSection(TEXT("Last Result"), Content);
}

#undef LOCTEXT_NAMESPACE
