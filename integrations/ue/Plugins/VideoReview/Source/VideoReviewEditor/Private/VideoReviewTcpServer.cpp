#include "VideoReviewTcpServer.h"

#include "Algo/Find.h"
#include "Common/TcpSocketBuilder.h"
#include "HAL/PlatformProcess.h"
#include "IPAddress.h"
#include "Interfaces/IPv4/IPv4Address.h"
#include "Sockets.h"
#include "SocketSubsystem.h"

FVideoReviewTcpServer::FVideoReviewTcpServer(int32 InPort)
    : Port(InPort)
    , ListenSocket(nullptr)
{
}

FVideoReviewTcpServer::~FVideoReviewTcpServer()
{
    Stop();
}

bool FVideoReviewTcpServer::Start()
{
    if (ListenSocket != nullptr)
    {
        return true;
    }

    const FIPv4Endpoint Endpoint(FIPv4Address::InternalLoopback, Port);
    ListenSocket = FTcpSocketBuilder(TEXT("VideoReviewEditorListener"))
        .AsReusable()
        .BoundToEndpoint(Endpoint)
        .Listening(8);

    if (ListenSocket == nullptr)
    {
        UE_LOG(LogTemp, Error, TEXT("[VideoReview] Failed to start TCP listener on %s"), *Endpoint.ToString());
        return false;
    }

    ListenSocket->SetNonBlocking(true);

    UE_LOG(LogTemp, Log, TEXT("[VideoReview] TCP server started on %s"), *Endpoint.ToString());
    return true;
}

void FVideoReviewTcpServer::Stop()
{
    if (ListenSocket == nullptr)
    {
        return;
    }

    ListenSocket->Close();
    ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ListenSocket);
    ListenSocket = nullptr;

    UE_LOG(LogTemp, Log, TEXT("[VideoReview] TCP server stopped"));
}

void FVideoReviewTcpServer::Tick()
{
    if (ListenSocket == nullptr)
    {
        return;
    }

    bool bHasPendingConnection = false;
    while (ListenSocket->HasPendingConnection(bHasPendingConnection) && bHasPendingConnection)
    {
        FSocket* ClientSocket = ListenSocket->Accept(TEXT("VideoReviewEditorClient"));
        if (ClientSocket == nullptr)
        {
            break;
        }

        ClientSocket->SetNonBlocking(false);

        FString Message;
        if (ReceiveMessage(ClientSocket, Message) && !Message.IsEmpty())
        {
            FScopeLock Lock(&QueueMutex);
            PendingMessages.Enqueue(Message);
        }

        ClientSocket->Close();
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ClientSocket);
    }

}

bool FVideoReviewTcpServer::DequeueMessage(FString& OutMessage)
{
    FScopeLock Lock(&QueueMutex);
    return PendingMessages.Dequeue(OutMessage);
}

bool FVideoReviewTcpServer::ReceiveMessage(FSocket* ClientSocket, FString& OutMessage)
{
    TArray<uint8> Buffer;
    uint8 Chunk[1024];
    int32 BytesRead = 0;

    while (ClientSocket->Recv(Chunk, UE_ARRAY_COUNT(Chunk), BytesRead))
    {
        if (BytesRead <= 0)
        {
            break;
        }

        Buffer.Append(Chunk, BytesRead);

        if (Algo::Find(Buffer, static_cast<uint8>('\n')) != nullptr)
        {
            break;
        }

        FPlatformProcess::SleepNoStats(0.001f);
    }

    if (Buffer.Num() == 0)
    {
        return false;
    }

    Buffer.Add(0);
    FString Decoded = FString(UTF8_TO_TCHAR(reinterpret_cast<const char*>(Buffer.GetData())));
    Decoded.TrimStartAndEndInline();
    OutMessage = MoveTemp(Decoded);
    return !OutMessage.IsEmpty();
}
