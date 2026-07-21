#pragma once

#include "Containers/Queue.h"
#include "HAL/CriticalSection.h"
#include "Interfaces/IPv4/IPv4Endpoint.h"

class FSocket;

class FVideoReviewTcpServer
{
public:
    explicit FVideoReviewTcpServer(int32 InPort);
    ~FVideoReviewTcpServer();

    bool Start();
    void Stop();
    void Tick();
    bool DequeueMessage(FString& OutMessage);

private:
    bool ReceiveMessage(FSocket* ClientSocket, FString& OutMessage);

    int32 Port;
    FSocket* ListenSocket;
    FCriticalSection QueueMutex;
    TQueue<FString> PendingMessages;
};
