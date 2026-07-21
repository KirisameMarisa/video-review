using System;
using UnityEditor;
using UnityEngine;

namespace VideoReview.Editor.API
{
    public class VideoReviewAPITestWindow : EditorWindow
    {
        private const string PrefPrefix = "VideoReview.API.Test.";

        private string _serverUrl = string.Empty;
        private string _apiToken = string.Empty;
        private int _timeoutMs = 300000;
        private Vector2 _scroll;

        private string _bootstrapEmail = "admin@example.com";
        private string _bootstrapPass = "password123";

        private string _createUserName = "User";
        private string _createUserEmail = "user@example.com";
        private string _createUserPass = "password123";

        private bool _includeRevisions;
        private string _videoId = string.Empty;
        private int _revision = 1;

        private string _uploadTitle = "New Video";
        private string _uploadFolderKey = "default";
        private string _uploadScenePath = string.Empty;
        private string _uploadVideoPath = string.Empty;

        private string _videoRevId = string.Empty;
        private string _eventContextJsonPath = string.Empty;

        private string _lastResult = string.Empty;

        [MenuItem("VideoReview/Open API Test Window")]
        public static void OpenWindow()
        {
            var window = GetWindow<VideoReviewAPITestWindow>("VideoReview API Test");
            window.minSize = new Vector2(700f, 500f);
            window.Show();
        }

        private void OnEnable()
        {
            _serverUrl = EditorPrefs.GetString(PrefPrefix + "ServerUrl", VideoReviewAPI.ServerUrl ?? string.Empty);
            _apiToken = EditorPrefs.GetString(PrefPrefix + "ApiToken", VideoReviewAPI.ApiToken ?? string.Empty);
            _timeoutMs = EditorPrefs.GetInt(PrefPrefix + "TimeoutMs", VideoReviewAPI.TimeoutMs);

            _bootstrapEmail = EditorPrefs.GetString(PrefPrefix + "BootstrapEmail", _bootstrapEmail);
            _createUserName = EditorPrefs.GetString(PrefPrefix + "CreateUserName", _createUserName);
            _createUserEmail = EditorPrefs.GetString(PrefPrefix + "CreateUserEmail", _createUserEmail);
            _uploadVideoPath = EditorPrefs.GetString(PrefPrefix + "UploadVideoPath", _uploadVideoPath);
            _eventContextJsonPath = EditorPrefs.GetString(PrefPrefix + "EventContextJsonPath", _eventContextJsonPath);
        }

        private void OnDisable()
        {
            EditorPrefs.SetString(PrefPrefix + "ServerUrl", _serverUrl ?? string.Empty);
            EditorPrefs.SetString(PrefPrefix + "ApiToken", _apiToken ?? string.Empty);
            EditorPrefs.SetInt(PrefPrefix + "TimeoutMs", _timeoutMs);

            EditorPrefs.SetString(PrefPrefix + "BootstrapEmail", _bootstrapEmail ?? string.Empty);
            EditorPrefs.SetString(PrefPrefix + "CreateUserName", _createUserName ?? string.Empty);
            EditorPrefs.SetString(PrefPrefix + "CreateUserEmail", _createUserEmail ?? string.Empty);
            EditorPrefs.SetString(PrefPrefix + "UploadVideoPath", _uploadVideoPath ?? string.Empty);
            EditorPrefs.SetString(PrefPrefix + "EventContextJsonPath", _eventContextJsonPath ?? string.Empty);
        }

        private void OnGUI()
        {
            _scroll = EditorGUILayout.BeginScrollView(_scroll);

            DrawGlobalSettings();
            EditorGUILayout.Space(8f);

            DrawBootstrapAndUser();
            EditorGUILayout.Space(8f);

            DrawVideoReadTests();
            EditorGUILayout.Space(8f);

            DrawVideoMutationTests();
            EditorGUILayout.Space(8f);

            DrawUploadTests();
            EditorGUILayout.Space(8f);

            DrawMetaTests();
            EditorGUILayout.Space(8f);

            DrawResultPanel();

            EditorGUILayout.EndScrollView();
        }

        private void DrawGlobalSettings()
        {
            EditorGUILayout.LabelField("Global Settings", EditorStyles.boldLabel);
            _serverUrl = EditorGUILayout.TextField("Server URL", _serverUrl);
            _apiToken = EditorGUILayout.TextField("API Token", _apiToken);

            _timeoutMs = EditorGUILayout.IntField("Timeout (ms)", Mathf.Max(1000, _timeoutMs));

            if (GUILayout.Button("Apply To VideoReviewAPI"))
            {
                ApplyGlobalSettings();
                _lastResult = "Applied global settings to VideoReviewAPI static properties.";
            }
        }

        private void DrawBootstrapAndUser()
        {
            EditorGUILayout.LabelField("Bootstrap / User", EditorStyles.boldLabel);
            _bootstrapEmail = EditorGUILayout.TextField("Bootstrap Email", _bootstrapEmail);
            _bootstrapPass = EditorGUILayout.PasswordField("Bootstrap Pass", _bootstrapPass);
            if (GUILayout.Button("Run Bootstrap"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.Bootstrap(_bootstrapEmail, _bootstrapPass);
                SetResult("Bootstrap", response);
            }

            EditorGUILayout.Space(4f);
            _createUserName = EditorGUILayout.TextField("User Name", _createUserName);
            _createUserEmail = EditorGUILayout.TextField("User Email", _createUserEmail);
            _createUserPass = EditorGUILayout.PasswordField("User Pass", _createUserPass);
            if (GUILayout.Button("Run CreateUser"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.CreateUser(_createUserName, _createUserEmail, _createUserPass);
                SetResult("CreateUser", response);
            }
        }

        private void DrawVideoReadTests()
        {
            EditorGUILayout.LabelField("Video Read APIs", EditorStyles.boldLabel);
            _includeRevisions = EditorGUILayout.Toggle("Include Revisions", _includeRevisions);
            if (GUILayout.Button("Run GetVideos"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.GetVideos(includeRevisions: _includeRevisions);
                SetResult("GetVideos", response);
            }

            _videoId = EditorGUILayout.TextField("Video ID", _videoId);
            if (GUILayout.Button("Run GetVideosRev"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.GetVideosRev(_videoId);
                SetResult("GetVideosRev", response);
            }

            if (GUILayout.Button("Run GetComments"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.GetComments(_videoId);
                SetResult("GetComments", response);
            }
        }

        private void DrawVideoMutationTests()
        {
            EditorGUILayout.LabelField("Video Mutation APIs", EditorStyles.boldLabel);
            _videoId = EditorGUILayout.TextField("Video ID", _videoId);
            if (GUILayout.Button("Run DeleteVideo"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.DeleteVideo(_videoId);
                SetResult("DeleteVideo", response);
            }

            _revision = EditorGUILayout.IntField("Revision", _revision);
            if (GUILayout.Button("Run PurgeRev"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.PurgeRev(_videoId, _revision);
                SetResult("PurgeRev", response);
            }

            if (GUILayout.Button("Run CreateVideoThumbnail"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.CreateVideoThumbnail(_videoId);
                SetResult("CreateVideoThumbnail", response);
            }
        }

        private void DrawUploadTests()
        {
            EditorGUILayout.LabelField("Upload APIs", EditorStyles.boldLabel);
            _uploadTitle = EditorGUILayout.TextField("Title", _uploadTitle);
            _uploadFolderKey = EditorGUILayout.TextField("Folder Key", _uploadFolderKey);
            _uploadScenePath = EditorGUILayout.TextField("Scene Path", _uploadScenePath);

            EditorGUILayout.BeginHorizontal();
            _uploadVideoPath = EditorGUILayout.TextField("Video Path", _uploadVideoPath);
            if (GUILayout.Button("Select", GUILayout.Width(80f)))
            {
                var selected = EditorUtility.OpenFilePanel("Select video file", "", "");
                if (!string.IsNullOrWhiteSpace(selected))
                {
                    _uploadVideoPath = selected;
                }
            }
            EditorGUILayout.EndHorizontal();

            if (GUILayout.Button("Run UploadVideo"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.UploadVideo(_uploadTitle, _uploadFolderKey, _uploadScenePath, _uploadVideoPath);
                SetResult("UploadVideo", response);
            }
        }

        private void DrawMetaTests()
        {
            EditorGUILayout.LabelField("Metadata APIs", EditorStyles.boldLabel);
            _videoRevId = EditorGUILayout.TextField("Video Revision ID", _videoRevId);
            if (GUILayout.Button("Run AnnotateVideoRev"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.AnnotateVideoRev(_videoRevId);
                SetResult("AnnotateVideoRev", response);
            }

            EditorGUILayout.BeginHorizontal();
            _eventContextJsonPath = EditorGUILayout.TextField("Event Context Json Path", _eventContextJsonPath);
            if (GUILayout.Button("Select", GUILayout.Width(80f)))
            {
                var selected = EditorUtility.OpenFilePanel("Select json file", "", "json");
                if (!string.IsNullOrWhiteSpace(selected))
                {
                    _eventContextJsonPath = selected;
                }
            }
            EditorGUILayout.EndHorizontal();

            if (GUILayout.Button("Run UploadEventContext"))
            {
                ApplyGlobalSettings();
                var response = VideoReviewAPI.UploadEventContext(_videoRevId, _eventContextJsonPath);
                SetResult("UploadEventContext", response);
            }
        }

        private void DrawResultPanel()
        {
            EditorGUILayout.LabelField("Last Result", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(string.IsNullOrWhiteSpace(_lastResult) ? "No execution yet." : _lastResult, MessageType.None);
        }

        private void ApplyGlobalSettings()
        {
            VideoReviewAPI.ServerUrl = _serverUrl?.Trim() ?? string.Empty;
            VideoReviewAPI.ApiToken = _apiToken?.Trim() ?? string.Empty;
            VideoReviewAPI.TimeoutMs = Mathf.Max(1000, _timeoutMs);
        }

        private void SetResult<T>(string action, VideoReviewResponse<T> response)
        {
            _lastResult = FormatResponse(action, response);
            Debug.Log(_lastResult);
        }

        private static string FormatResponse<T>(string action, VideoReviewResponse<T> response)
        {
            if (response == null)
            {
                return "[VideoReviewAPI Test] " + action + " -> null response";
            }

            var stdout = response.command != null ? (response.command.stdOut ?? string.Empty).Trim() : string.Empty;
            var stderr = response.command != null ? (response.command.stdErr ?? string.Empty).Trim() : string.Empty;
            var exitCode = response.command != null ? response.command.exitCode.ToString() : "n/a";

            var dataInfo = "null";
            if (response.data is Array arr)
            {
                dataInfo = "array length=" + arr.Length;
            }
            else if (response.data != null)
            {
                dataInfo = response.data.GetType().Name;
            }

            return "[VideoReviewAPI Test] " + action
                + "\nsuccess=" + response.success
                + ", parseError=" + (string.IsNullOrWhiteSpace(response.parseError) ? "none" : response.parseError)
                + ", exitCode=" + exitCode
                + ", data=" + dataInfo
                + "\nstdout:\n" + (string.IsNullOrWhiteSpace(stdout) ? "(empty)" : stdout)
                + "\nstderr:\n" + (string.IsNullOrWhiteSpace(stderr) ? "(empty)" : stderr);
        }
    }
}
