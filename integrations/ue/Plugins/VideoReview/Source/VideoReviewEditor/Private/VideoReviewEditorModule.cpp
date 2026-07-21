#include "Modules/ModuleManager.h"

#include "Containers/Ticker.h"
#include "Dom/JsonObject.h"
#include "FileHelpers.h"
#include "Framework/Docking/TabManager.h"
#include "Framework/MultiBox/MultiBoxBuilder.h"
#include "LevelEditor.h"
#include "Serialization/JsonSerializer.h"
#include "Misc/PackageName.h"
#include "Misc/Paths.h"
#include "VideoReviewAPITestWindow.h"
#include "VideoReviewTcpServer.h"
#include "Widgets/Docking/SDockTab.h"

#define LOCTEXT_NAMESPACE "VideoReviewEditor"

extern const FName GVideoReviewAPITestTabName;

namespace
{
    constexpr int32 VideoReviewPort = 18766;

    struct FVideoReviewMessage
    {
        FString Action;
        FString Scene;
    };

    bool ParseMessage(const FString& RawMessage, FVideoReviewMessage& OutMessage)
    {
        TSharedPtr<FJsonObject> JsonObject;
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(RawMessage);
        if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Invalid JSON: %s"), *RawMessage);
            return false;
        }

        if (!JsonObject->TryGetStringField(TEXT("action"), OutMessage.Action)
            || !JsonObject->TryGetStringField(TEXT("scene"), OutMessage.Scene))
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Missing action/scene field: %s"), *RawMessage);
            return false;
        }

        return !OutMessage.Action.IsEmpty() && !OutMessage.Scene.IsEmpty();
    }

    bool TryNormalizeScenePath(const FString& InputScenePath, FString& OutLongPackageName)
    {
        if (InputScenePath.StartsWith(TEXT("/Game/")))
        {
            OutLongPackageName = InputScenePath;
            return true;
        }

        FString CandidatePath = InputScenePath;
        if (CandidatePath.StartsWith(TEXT("Content/")))
        {
            CandidatePath = FPaths::Combine(FPaths::ProjectContentDir(), CandidatePath.RightChop(8));
        }

        CandidatePath = FPaths::ConvertRelativePathToFull(CandidatePath);
        if (!CandidatePath.EndsWith(TEXT(".umap")))
        {
            return false;
        }

        FString ContentDir = FPaths::ConvertRelativePathToFull(FPaths::ProjectContentDir());
        if (!CandidatePath.StartsWith(ContentDir))
        {
            return false;
        }

        return FPackageName::TryConvertFilenameToLongPackageName(CandidatePath, OutLongPackageName);
    }

    void OpenScene(const FString& InputScenePath)
    {
        FString LongPackageName;
        if (!TryNormalizeScenePath(InputScenePath, LongPackageName))
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Invalid map path: %s"), *InputScenePath);
            return;
        }

        const FString MapFilename = FPackageName::LongPackageNameToFilename(LongPackageName, FPackageName::GetMapPackageExtension());
        if (!FPaths::FileExists(MapFilename))
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Map file not found: %s"), *MapFilename);
            return;
        }

        if (!FEditorFileUtils::SaveDirtyPackages(true, true, true, false, false, false))
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Map open canceled while saving dirty packages"));
            return;
        }

        const bool bLoadAsTemplate = false;
        const bool bShowProgress = true;
        if (!FEditorFileUtils::LoadMap(MapFilename, bLoadAsTemplate, bShowProgress))
        {
            UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Failed to open map: %s"), *MapFilename);
            return;
        }

        UE_LOG(LogTemp, Log, TEXT("[VideoReview] Opened map: %s"), *LongPackageName);
    }
}

class FVideoReviewEditorModule : public IModuleInterface
{
public:
    virtual void StartupModule() override
    {
        Server = MakeUnique<FVideoReviewTcpServer>(VideoReviewPort);
        if (Server->Start())
        {
            TickHandle = FTSTicker::GetCoreTicker().AddTicker(
                FTickerDelegate::CreateRaw(this, &FVideoReviewEditorModule::HandleTicker));
        }

        // Register nomad tab spawner for the API test window.
        FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
            GVideoReviewAPITestTabName,
            FOnSpawnTab::CreateLambda([](const FSpawnTabArgs&) -> TSharedRef<SDockTab>
            {
                return SNew(SDockTab)
                    .TabRole(ETabRole::NomadTab)
                    [ SNew(SVideoReviewAPITestWindow) ];
            })
        )
        .SetDisplayName(LOCTEXT("APITestTabTitle", "VideoReview API Test"))
        .SetMenuType(ETabSpawnerMenuType::Hidden);

        // Add "VideoReview API Test" entry to the LevelEditor Window menu.
        if (FModuleManager::Get().IsModuleLoaded(TEXT("LevelEditor")))
        {
            FLevelEditorModule& LevelEditorModule =
                FModuleManager::LoadModuleChecked<FLevelEditorModule>(TEXT("LevelEditor"));

            MenuExtender = MakeShareable(new FExtender);
            MenuExtender->AddMenuExtension(
                TEXT("WindowLayout"),
                EExtensionHook::After,
                nullptr,
                FMenuExtensionDelegate::CreateLambda([](FMenuBuilder& Builder)
                {
                    Builder.AddMenuEntry(
                        LOCTEXT("OpenAPITest", "VideoReview API Test"),
                        LOCTEXT("OpenAPITestTooltip", "Open the VideoReview API debug test window"),
                        FSlateIcon(),
                        FUIAction(FExecuteAction::CreateLambda(
                            []() { SVideoReviewAPITestWindow::OpenWindow(); }))
                    );
                })
            );
            LevelEditorModule.GetMenuExtensibilityManager()->AddExtender(MenuExtender);
        }
    }

    virtual void ShutdownModule() override
    {
        if (MenuExtender.IsValid())
        {
            if (FModuleManager::Get().IsModuleLoaded(TEXT("LevelEditor")))
            {
                FLevelEditorModule& LevelEditorModule =
                    FModuleManager::LoadModuleChecked<FLevelEditorModule>(TEXT("LevelEditor"));
                LevelEditorModule.GetMenuExtensibilityManager()->RemoveExtender(MenuExtender);
            }
            MenuExtender.Reset();
        }

        FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(GVideoReviewAPITestTabName);

        if (TickHandle.IsValid())
        {
            FTSTicker::GetCoreTicker().RemoveTicker(TickHandle);
            TickHandle.Reset();
        }

        if (Server)
        {
            Server->Stop();
            Server.Reset();
        }
    }

private:
    bool HandleTicker(float)
    {
        if (!Server)
        {
            return true;
        }

        Server->Tick();

        FString RawMessage;
        while (Server->DequeueMessage(RawMessage))
        {
            HandleRawMessage(RawMessage);
        }

        return true;
    }

    void HandleRawMessage(const FString& RawMessage)
    {
        UE_LOG(LogTemp, Log, TEXT("[VideoReview] Received: %s"), *RawMessage);

        FVideoReviewMessage Message;
        if (!ParseMessage(RawMessage, Message))
        {
            return;
        }

        if (Message.Action == TEXT("open"))
        {
            OpenScene(Message.Scene);
            return;
        }

        UE_LOG(LogTemp, Warning, TEXT("[VideoReview] Unsupported action: %s"), *Message.Action);
    }

    TUniquePtr<FVideoReviewTcpServer> Server;
    FTSTicker::FDelegateHandle TickHandle;
    TSharedPtr<FExtender> MenuExtender;
};

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FVideoReviewEditorModule, VideoReviewEditor)
