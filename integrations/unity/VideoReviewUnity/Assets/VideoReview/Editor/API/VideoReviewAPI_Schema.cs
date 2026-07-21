using System;
using UnityEngine;

namespace VideoReview.Editor.API
{
    [Serializable]
    public sealed class VideoReviewCommandResult
    {
        public bool success;
        public bool timedOut;
        public int exitCode;
        public string command;
        public string stdOut;
        public string stdErr;
    }

    [Serializable]
    public sealed class VideoReviewResponse<T>
    {
        public bool success;
        public T data;
        public string parseError;
        public VideoReviewCommandResult command;
    }

    [Serializable]
    public sealed class VideoReviewSimpleMessage
    {
        public string text;
    }

    [Serializable]
    public sealed class VideoReviewGenericResult
    {
        public bool success;
        public bool ok;
        public string error;
        public string warning;
        public string token;
        public string videoId;
        public int revision;
    }

    [Serializable]
    public sealed class VideoReviewUploadSessionResponse
    {
        public string url;
        public VideoReviewUploadSession session;
    }

    [Serializable]
    public sealed class VideoReviewUploadSession
    {
        public string storage;
        public string id;
        public string storageKey;
        public string title;
        public string folderKey;
        public string scenePath;
        public int nextRev;
        public string createdAt;
        
        public DateTime? CreatedAt
        {
            get
            {
                if (DateTime.TryParse(createdAt, out var dt))
                {
                    return dt;
                }
                return null;
            }
        }
    }

    [Serializable]
    public sealed class VideoReviewUploadStatus
    {
        public string status;
        public string revisionId;
        public string videoId;
        public int revision;
        public int nextRev;
        public string title;
        public string folderKey;
    }

    [Serializable]
    public sealed class VideoReviewAnnotateResult
    {
        public int successCount;
        public int failureCount;
    }

    [Serializable]
    public sealed class VideoReviewVideo
    {
        public string id;
        public string title;
        public string folderKey;
        public string scenePath;
        public int? latestRevisionNum;
        public bool deleted;
        public VideoReviewVideoRevision[] revisions;
        
        public DateTime? LatestUpdatedAt
        {
            get
            {
                if(revisions == null || revisions.Length == 0)
                    return null;
                if (DateTime.TryParse(revisions[revisions.Length - 1].uploadedAt, out var dt))
                {
                    return dt;
                }
                return null;
            }
        }
    }

    [Serializable]
    public sealed class VideoReviewVideoRevision
    {
        public string id;
        public string videoId;
        public int revision;
        public string filePath;
        public string uploadedAt;
        public bool deleted;
        public string[] tags;
        public string summary;
        
        public DateTime? UploadedAt
        {
            get
            {
                if (DateTime.TryParse(uploadedAt, out var dt))
                {
                    return dt;
                }
                return null;
            }
        }
    }

    [Serializable]
    public sealed class VideoReviewComment
    {
        public string id;
        public string videoId;
        public int videoRevNum;
        public string userName;
        public string userEmail;
        public string comment;
        public float time;
        public string issueId;
        public string[] notifiedProviders;
        public string drawingPath;
        public string createdAt;
        public string updatedAt;
        public bool deleted;
        public int thumbsUp;
        
        public DateTime? CreatedAt
        {
            get
            {
                if (DateTime.TryParse(createdAt, out var dt))
                {
                    return dt;
                }
                return null;
            }
        }
        
        public DateTime? UpdatedAt
        {
            get
            {
                if (DateTime.TryParse(updatedAt, out var dt))
                {
                    return dt;
                }
                return null;
            }
        }
    }

    internal static class VideoReviewJson
    {
        [Serializable]
        private sealed class ArrayWrapper<T>
        {
            public T[] items;
        }

        public static bool TryParseObject<T>(string json, out T value, out string error)
        {
            value = default(T);
            error = null;

            if (string.IsNullOrWhiteSpace(json))
            {
                error = "JSON is empty.";
                return false;
            }

            var trimmed = json.TrimStart();
            if (!trimmed.StartsWith("{"))
            {
                error = "JSON does not start with an object token.";
                return false;
            }

            try
            {
                value = JsonUtility.FromJson<T>(json);
                return true;
            }
            catch (Exception e)
            {
                error = e.Message;
                return false;
            }
        }

        public static bool TryParseArray<T>(string json, out T[] values, out string error)
        {
            values = Array.Empty<T>();
            error = null;

            if (string.IsNullOrWhiteSpace(json))
            {
                error = "JSON is empty.";
                return false;
            }

            var trimmed = json.TrimStart();
            if (!trimmed.StartsWith("["))
            {
                error = "JSON does not start with an array token.";
                return false;
            }

            try
            {
                var wrapped = "{\"items\":" + json + "}";
                var parsed = JsonUtility.FromJson<ArrayWrapper<T>>(wrapped);
                values = parsed?.items ?? Array.Empty<T>();
                return true;
            }
            catch (Exception e)
            {
                error = e.Message;
                return false;
            }
        }
    }
}
